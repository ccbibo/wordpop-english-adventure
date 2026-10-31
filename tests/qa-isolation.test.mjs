import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const start=source.indexOf('async function runQualityLab('),end=source.indexOf('\n}\n',start);
assert(start>=0&&end>start,'actual QA driver must be available');
const driver=source.slice(start,end+3);
const cases=JSON.parse(readFileSync(new URL('../dist/qa-cases.json',import.meta.url),'utf8'));
function fixture(fetch){
 const original={version:1,unlocked:18,coins:240,stars:{1:3},history:[{level:1}],review:{cat:{en:'cat'}},settings:{sound:true,limit:30},seconds:125,day:'2026-10-31'};
 const elements=new Map();let removed=0,labRenders=0;
 const c={data:original,qaRunning:false,qaFast:false,qaAbort:false,qaBackup:null,busy:true,selected:4,game:{ended:false},page:'qa',window:{},matchMedia:()=>({matches:false}),Date,structuredClone,esc:String,defaults:()=>({version:1,unlocked:1,coins:80,stars:{},history:[],review:{},settings:{sound:true,limit:30},seconds:0,day:'2026-10-31'}),qualityLab(){labRenders++},closeModal(){},document:{createElement:()=>({remove(){removed++}}),body:{append(){}}},$(s){if(!elements.has(s))elements.set(s,{});return elements.get(s)},fetch:(...args)=>fetch(c,...args)};
 vm.createContext(c);vm.runInContext(driver,c);return{c,original,elements,stats:()=>({removed,labRenders})};
}
test('a failed QA asset request restores original player data and exposes failure rather than a pass',async()=>{
 const{c,original,elements,stats}=fixture(async()=>{throw Error('offline fixture')});await c.runQualityLab(true);
 assert.deepEqual(c.data,original);assert.equal(c.qaBackup,null);assert.equal(c.qaRunning,false);assert.equal(c.qaFast,false);assert.equal(c.page,'qa');assert.equal(c.window.wordPopQA.passed,0);assert.match(elements.get('#qa-results').innerHTML,/尚未通過/);assert.match(c.window.wordPopQA.results[0].error,/offline fixture/);assert.equal(stats().labRenders,1);
});
test('cancel before the first level restores original data and removes the temporary overlay',async()=>{
 const{c,original,elements,stats}=fixture(async c=>({ok:true,json:async()=>{c.qaAbort=true;return cases}}));await c.runQualityLab(false);
 assert.deepEqual(c.data,original);assert.equal(c.qaRunning,false);assert.equal(c.qaFast,false);assert.equal(stats().removed,1);assert.equal(c.window.wordPopQA.passed,0);assert.match(elements.get('#qa-results').innerHTML,/停止/);
});
test('QA final cleanup clears a processing lock so ordinary play can resume after a failure',async()=>{
 const{c}=fixture(async()=>{throw Error('render failure fixture')});await c.runQualityLab(true);assert.equal(c.busy,false);assert.equal(c.selected,-1);
});

test('an accidental duplicate or incomplete case list cannot claim eighty-level coverage',async()=>{
 const duplicate=Array.from({length:80},()=>cases.levels[0]);const{c}=fixture(async()=>({ok:true,json:async()=>({levels:duplicate})}));await c.runQualityLab(true);assert.equal(c.window.wordPopQA.passed,0);assert.match(c.window.wordPopQA.results[0].error,/1–80/);
});
test('cloud recovery arriving during QA updates the original backup, not the sandbox or persistent storage',()=>{
 const line=source.split('\n').find(s=>s.startsWith('configureAccounts({'));assert(line);
 const sandbox={unlocked:1,history:[{qa:true}]},original={unlocked:18},incoming={unlocked:42},c={qaRunning:true,qaBackup:original,data:sandbox,page:'qa',shell(){},toast(){},show(){},defaults:()=>({unlocked:1}),validateSave:x=>structuredClone(x),Date,save(){throw Error('QA cloud callback may not persist sandbox')},configureAccounts(callbacks){c.callbacks=callbacks}};
 vm.createContext(c);vm.runInContext(line,c);c.callbacks.setSave(incoming);assert.equal(c.data,sandbox);assert.deepEqual(c.qaBackup,incoming);assert.deepEqual(c.callbacks.getSave(),incoming);
});
