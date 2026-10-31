import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const accountSource=readFileSync(new URL('../dist/accounts.js',import.meta.url),'utf8').replace(/export /g,'');
const appSource=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const valid=()=>({version:1,unlocked:1,stars:{},coins:80,history:[],review:{},quiz:{},settings:{sound:true,accent:'en-US',color:true,limit:30,public:false},seconds:0,day:'2026-10-31'});
function createAccountContext(fetch){const elements=new Map();let html='';let local=valid();const ctx=vm.createContext({AbortController,setTimeout,clearTimeout,structuredClone,console,fetch,document:{querySelector:s=>{if(!elements.has(s))elements.set(s,{});return elements.get(s)}}});vm.runInContext(accountSource,ctx);ctx.callbacks={shell:s=>{html=s},getSave:()=>local,setSave:x=>{local=x},changed:()=>{},toast:()=>{},navigate:()=>{}};vm.runInContext('ui=callbacks',ctx);return {ctx,elements,html:()=>html,local:()=>local};}
const response=data=>Promise.resolve({ok:true,json:async()=>data});
test('hostile account names are escaped before insertion into profile HTML',()=>{
 const h=createAccountContext(()=>response({}));vm.runInContext(`user={username:'x" onfocus="evil()',nickname:'<img src=x onerror=evil()>',grade:'lower',public:false};accountPage()`,h.ctx);
 assert(!h.html().includes('<img src=x'));assert(h.html().includes('&lt;img'));assert(h.html().includes('&quot;'));assert(!h.html().includes('value="x" onfocus='));
});
test('account credentials use same-origin cookie requests and never enter localStorage or console',()=>{
 assert.match(accountSource,/credentials:'same-origin'/);assert(!/localStorage|sessionStorage|console\.(log|info|debug)/.test(accountSource));assert.match(accountSource,/type="password"/);assert.match(accountSource,/autocomplete="\$\{register\?'new-password':'current-password'\}/);
});
test('API requests bypass offline caching before any fetch/cache/response operation',()=>{
 const sw=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');const listeners={};let fetches=0,responses=0;
 const ctx=vm.createContext({URL,self:{location:{origin:'https://wordpop.test'},addEventListener:(name,fn)=>{listeners[name]=fn}},fetch:()=>{fetches++;throw Error('must not run')},caches:{open:()=>{throw Error('must not cache API')} }});
 vm.runInContext(sw,ctx);listeners.fetch({request:{method:'GET',url:'https://wordpop.test/api/auth/me'},respondWith:()=>responses++});
 assert.equal(fetches,0);assert.equal(responses,0);
});
test('CSV exports neutralize formulas hidden behind leading whitespace',()=>{
 const fn=appSource.slice(appSource.indexOf('function exportCSV()'),appSource.indexOf('\nfunction settings()'));
 let csv='';const anchor={click(){}};const ctx=vm.createContext({data:{history:[{at:'2026-10-31',theme:'\t=1+1',level:1,won:true,score:10,successes:1,attempts:1,words:['safe'],seconds:1}]},document:{createElement:()=>anchor},Blob:class{constructor(parts){csv=parts.join('')}},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},setTimeout:()=>{}});
 vm.runInContext(fn+';exportCSV()',ctx);const cell=csv.split('\r\n')[1].split(',')[1];assert.match(cell,/^"'/,'a prefixed tab must not bypass formula-neutralization');
});
test('an in-flight cloud recovery cannot restore the previous account after logout',async()=>{
 let resolveProgress;let progressRequested=false;const aProgress={...valid(),unlocked:17};
 const h=createAccountContext((url,options={})=>{
  if(url.endsWith('auth/me'))return response({user:{id:'A',username:'test_a',nickname:'Tester',grade:'lower',public:false}});
  if(url.endsWith('/progress')&&options.method==='GET'){progressRequested=true;return new Promise(resolve=>{resolveProgress=()=>resolve({ok:true,json:async()=>({progress:aProgress})})});}
  return response({ok:true});
 });
 const configure=vm.runInContext('configureAccounts(callbacks)',h.ctx);for(let i=0;i<10&&!progressRequested;i++)await new Promise(resolve=>setImmediate(resolve));assert(progressRequested);
 vm.runInContext('accountPage()',h.ctx);await h.elements.get('#logout-account').onclick();assert.equal(vm.runInContext('currentUser()',h.ctx),null);assert.equal(h.local(),null);
 resolveProgress();await configure;assert.equal(h.local(),null,'late account A response must be ignored after logout');
});

test('a delayed public-ranking profile response cannot revive an account after logout',async()=>{
 let finishProfile;const h=createAccountContext((url,options={})=>{
  if(url.endsWith('auth/profile'))return new Promise(resolve=>{finishProfile=()=>resolve({ok:true,json:async()=>({user:{id:'A',username:'test_a',nickname:'Tester',grade:'lower',public:true}})})});
  return response({ok:true});
 });
 vm.runInContext("user={id:'A',username:'test_a',nickname:'Tester',grade:'lower',public:false};accountPage()",h.ctx);
 const checkbox=h.elements.get('#public-rank');checkbox.checked=true;
 const update=checkbox.onchange({target:checkbox});await h.elements.get('#logout-account').onclick();assert.equal(vm.runInContext('currentUser()',h.ctx),null);
 finishProfile();await update;assert.equal(vm.runInContext('currentUser()',h.ctx),null,'late profile A must not revive a logged-out account');
});
test('a delayed old cloud recovery cannot replace a newly logged-in player',async()=>{
 let finishOld;let progressRequests=0;
 const h=createAccountContext((url,options={})=>{
  if(url.endsWith('auth/me'))return response({user:{id:'A',username:'test_a',nickname:'A',grade:'lower',public:false}});
  if(url.endsWith('auth/login'))return response({user:{id:'B',username:'test_b',nickname:'B',grade:'upper',public:false}});
  if(url.endsWith('/progress')&&options.method==='GET'){
   progressRequests++;if(progressRequests===1)return new Promise(resolve=>{finishOld=()=>resolve({ok:true,json:async()=>({progress:{...valid(),unlocked:17}})})});
   return response({progress:{...valid(),unlocked:5}});
  }return response({ok:true});
 });
 const initial=vm.runInContext('configureAccounts(callbacks)',h.ctx);for(let i=0;i<10&&!finishOld;i++)await new Promise(resolve=>setImmediate(resolve));assert(finishOld);
 vm.runInContext('authPage(false)',h.ctx);vm.runInContext("document.querySelector('#username').value='test_b';document.querySelector('#password').value='test-only-secret';",h.ctx);
 await h.elements.get('#auth-form').onsubmit({preventDefault(){}});assert.equal(h.local().unlocked,5);assert.equal(vm.runInContext('currentUser().id',h.ctx),'B');
 finishOld();await initial;assert.equal(h.local().unlocked,5);assert.equal(vm.runInContext('currentUser().id',h.ctx),'B');
});
test('queued progress cannot be sent under a later player and captures its original snapshot',async()=>{
 const jobs=[];const requests=[];const h=createAccountContext((url,options={})=>{requests.push({url,...options});return response({ok:true})});
 h.ctx.setTimeout=(fn,delay)=>{jobs.push({fn,delay});return jobs.length};h.ctx.clearTimeout=()=>{};
 vm.runInContext("user={id:'A'};ui.setSave({...ui.getSave(),unlocked:17});queueProgress();ui.setSave({...ui.getSave(),unlocked:22});",h.ctx);
 await jobs.find(x=>x.delay===1200).fn();await new Promise(resolve=>setImmediate(resolve));assert.equal(JSON.parse(requests[0].body).progress.unlocked,17);assert.equal(JSON.parse(requests[0].body).ownerId,'A');
 requests.length=0;jobs.length=0;vm.runInContext("queueProgress();authGeneration++;user={id:'B'}",h.ctx);await jobs.find(x=>x.delay===1200).fn();assert.equal(requests.length,0);
});
test('schema-valid imported emoji content is escaped in review cards',async()=>{
 const {validateSave}=await import('../dist/schema.js');const hostile={en:'cat',zh:'貓',emoji:'<img src=x onerror=evil()>',reason:'自己收藏',at:'2026-10-31T00:00:00Z'};
 const imported=valid();imported.review['cat::貓']=hostile;const checked=validateSave(imported);
 const fn=appSource.slice(appSource.indexOf('function wordCards('),appSource.indexOf('\nconst allWords='));
 const h=createAccountContext(()=>response({}));h.ctx.words=Object.values(checked.review);const html=vm.runInContext("const esc=e;const wordKey=w=>w.en+'::'+w.zh;"+fn+';wordCards(words)',h.ctx);
 assert(!html.includes('<img src=x'),'imported emoji must not create an HTML element');assert(html.includes('&lt;img'));
});
test('schema-valid imported emoji content is escaped in the quiz prompt',async()=>{
 const hostile={en:'cat',zh:'貓',emoji:'<img src=x onerror=evil()>',reason:'自己收藏',at:'2026-10-31T00:00:00Z'};
 const fn=appSource.slice(appSource.indexOf('function quiz('),appSource.indexOf('\nfunction report()'));
 const h=createAccountContext(()=>response({}));let html='';Object.assign(h.ctx,{fixed:hostile,data:{review:{'cat::貓':hostile}},allWords:()=>[hostile,{en:'dog'},{en:'lion'},{en:'rabbit'}],modal:s=>{html=s}});h.ctx.document.querySelectorAll=()=>[];
 vm.runInContext('const esc=e;'+fn+';quiz(fixed)',h.ctx);assert(!html.includes('<img src=x'),'quiz prompt must not create HTML from imported emoji');assert(html.includes('&lt;img'));
});
