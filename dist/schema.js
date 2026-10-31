/* Validate the complete browser save boundary before using imported/local data.
 * No DOM, network, or mutation; return a fresh, bounded normalized structure.
 */
const LIMITS=new Set([15,20,30,45,60]);
const fail=path=>{throw new TypeError(`紀錄格式不正確：${path}`)};
function object(v,path){if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail(path);return v;}
function keys(v,allowed,path){object(v,path);for(const k of Object.keys(v))if(!allowed.includes(k))fail(`${path}.${k}`);return v;}
function integer(v,min,max,path){if(!Number.isSafeInteger(v)||v<min||v>max)fail(path);return v;}
function bool(v,path){if(typeof v!=='boolean')fail(path);return v;}
function string(v,min,max,path){if(typeof v!=='string'||v.length<min||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))fail(path);return v;}
function date(v,path){string(v,10,40,path);if(!Number.isFinite(Date.parse(v)))fail(path);return v;}
function list(v,max,path){if(!Array.isArray(v)||v.length>max)fail(path);return v;}
function pairKey(v,path){string(v,1,180,path);if(!v.includes('::'))fail(path);return v;}
export function validateSave(value){
  const x=keys(value,['version','unlocked','stars','coins','history','review','quiz','settings','seconds','day'],'save');
  if(x.version!==1)fail('version');
  const out={version:1,unlocked:integer(x.unlocked,1,80,'unlocked'),stars:{},coins:integer(x.coins,0,10000000,'coins'),history:[],review:{},quiz:{},settings:{},seconds:integer(x.seconds,0,86400,'seconds'),day:string(x.day,10,10,'day')};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(out.day)||!Number.isFinite(Date.parse(out.day))||new Date(out.day).toISOString().slice(0,10)!==out.day)fail('day');
  object(x.stars,'stars');if(Object.keys(x.stars).length>80)fail('stars');for(const [k,v]of Object.entries(x.stars)){if(!/^(?:[1-9]|[1-7][0-9]|80)$/.test(k))fail('stars.key');out.stars[k]=integer(v,1,3,`stars.${k}`);}
  out.history=list(x.history,200,'history').map((h,i)=>{
    const p=`history[${i}]`;keys(h,['level','theme','score','won','seconds','cleared','attempts','successes','words','at','online','practice'],p);
    const item={level:integer(h.level,1,80,p+'.level'),theme:string(h.theme,1,40,p+'.theme'),score:integer(h.score,0,10000000,p+'.score'),won:bool(h.won,p+'.won'),seconds:integer(h.seconds,0,86400,p+'.seconds'),cleared:integer(h.cleared,0,1000000,p+'.cleared'),attempts:integer(h.attempts,0,1000000,p+'.attempts'),successes:integer(h.successes,0,1000000,p+'.successes'),words:list(h.words,120,p+'.words').map((w,j)=>string(w,1,80,`${p}.words[${j}]`)),at:date(h.at,p+'.at'),online:bool(h.online??false,p+'.online')};
    if(item.successes>item.attempts)fail(p+'.successes');if(h.practice!==undefined)item.practice=bool(h.practice,p+'.practice');return item;
  });
  object(x.review,'review');if(Object.keys(x.review).length>500)fail('review');
  for(const [k,w]of Object.entries(x.review)){
    pairKey(k,'review.key');keys(w,['en','zh','emoji','reason','at'],`review.${k}`);
    const item={en:string(w.en,1,80,'review.en'),zh:string(w.zh,1,80,'review.zh'),emoji:string(w.emoji,1,40,'review.emoji'),reason:string(w.reason,1,100,'review.reason'),at:date(w.at,'review.at')};
    if(k!==item.en+'::'+item.zh)fail('review.key');out.review[k]=item;
  }
  object(x.quiz,'quiz');if(Object.keys(x.quiz).length>500)fail('quiz');
  for(const [k,v]of Object.entries(x.quiz)){pairKey(k,'quiz.key');keys(v,['right','wrong'],'quiz.answer');out.quiz[k]={right:integer(v.right,0,1000000,'quiz.right'),wrong:integer(v.wrong,0,1000000,'quiz.wrong')};}
  const s=keys(x.settings,['sound','accent','color','limit','public'],'settings');
  if(!['en-US','en-GB'].includes(s.accent))fail('settings.accent');if(!LIMITS.has(s.limit))fail('settings.limit');
  out.settings={sound:bool(s.sound,'settings.sound'),accent:s.accent,color:bool(s.color,'settings.color'),limit:s.limit,public:bool(s.public,'settings.public')};
  return out;
}
