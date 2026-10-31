import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleApi} from '../worker/api.js';
import {createD1} from './d1-adapter.mjs';
const migration=readFileSync(new URL('../drizzle/0000_game.sql',import.meta.url),'utf8');
function fixture(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(migration);return {sqlite,DB:createD1(sqlite)}}
async function request(env,path,body,cookie=''){const result=await handleApi(new Request('https://game.example/api/'+path,{method:'POST',headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)}),env);return {status:result.status,body:await result.json(),cookie:result.headers.get('set-cookie')?.split(';')[0]}}
const valid=()=>({version:1,unlocked:1,stars:{},coins:80,history:[],review:{},quiz:{},settings:{sound:true,accent:'en-US',color:true,limit:30,public:false},seconds:0,day:'2026-10-31'});
test('server rejects cloud progress that the actual client validator cannot restore',async()=>{
 const env=fixture();try{const account=await request(env,'auth/register',{username:'boundary',password:'test-only-secret',nickname:'Tester',grade:'lower'});assert.equal(account.status,201);
 const malformed={...valid(),history:[{level:1,score:10,theme:'動物園',words:[]}]};const result=await request(env,'progress',{progress:malformed},account.cookie);assert.equal(result.status,400,'partial malformed history must not become a stored cloud save');
 const malformedReview={...valid(),review:{'cat::貓':{en:'cat',zh:'貓',emoji:{nested:true}}}};assert.equal((await request(env,'progress',{progress:malformedReview},account.cookie)).status,400);
 }finally{env.sqlite.close()}
});
test('oversized streamed JSON is canceled at the request boundary instead of fully buffered',async()=>{
 const env=fixture();let chunks=0,canceled=false;
 const stream=new ReadableStream({pull(controller){if(chunks++<6)controller.enqueue(new Uint8Array(70000).fill(120));else controller.close()},cancel(){canceled=true}});
 try{const req=new Request('https://game.example/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:stream,duplex:'half'});const response=await handleApi(req,env);assert.equal(response.status,413);assert.equal(canceled,true,'reader must cancel the remaining oversized body');assert(chunks<6,'the entire body must not be consumed');}finally{env.sqlite.close()}
});
test('simultaneous login attempts cannot bypass the twelve-attempt budget',async()=>{
 const env=fixture();try{const results=await Promise.all(Array.from({length:13},()=>request(env,'auth/login',{username:'unknown_player',password:'test-only-wrong'})));assert.equal(results.filter(r=>r.status===429).length,1,'one of thirteen concurrent attempts must be rejected before password hashing');assert.equal(results.filter(r=>r.status===401).length,12);}finally{env.sqlite.close()}
});
test('a concurrent guest departure cannot let a duel start with only one recorded member',async()=>{
 const env=fixture();try{
  const h=await request(env,'rooms',{mode:'duel',nickname:'Host'}),id=h.body.room.id;
  const g=await request(env,`rooms/${id}/join`,{nickname:'Guest'});
  await Promise.all([request(env,`rooms/${id}/start`,{token:h.body.token}),request(env,`rooms/${id}/leave`,{token:g.body.token})]);
  const res=await handleApi(new Request(`https://game.example/api/rooms/${id}/state?token=${h.body.token}`),env);assert.equal(res.status,200);const state=await res.json();
  if(state.status==='playing')assert(state.members.length>=2,'a started room retains both admitted participants, marking departures rather than deleting them');
  else assert.equal(state.status,'waiting');
 }finally{env.sqlite.close()}
});
test('both start/departure orders and concurrent empty-room joins preserve membership invariants',async()=>{
 for(let iteration=0;iteration<12;iteration++){
  for(const departure of ['guest','host'])for(const reverse of [false,true]){
   const env=fixture();try{const h=await request(env,'rooms',{mode:'duel',nickname:'Host'}),id=h.body.room.id,g=await request(env,`rooms/${id}/join`,{nickname:'Guest'});
    const start=()=>request(env,`rooms/${id}/start`,{token:h.body.token}),leave=()=>request(env,`rooms/${id}/leave`,{token:departure==='guest'?g.body.token:h.body.token});
    await Promise.all((reverse?[leave,start]:[start,leave]).map(fn=>fn()));const token=departure==='guest'?h.body.token:g.body.token;
    const response=await handleApi(new Request(`https://game.example/api/rooms/${id}/state?token=${token}`),env);assert.equal(response.status,200);const state=await response.json();
    if(state.status==='playing')assert(state.members.length>=2);else assert.equal(state.status,'waiting');assert(state.members.some(m=>m.id===state.hostId),'host must still be a recorded member');
   }finally{env.sqlite.close()}
  }
  const env=fixture();try{const h=await request(env,'rooms',{mode:'duel',nickname:'Host'}),id=h.body.room.id;
   const [,join]=await Promise.all([request(env,`rooms/${id}/leave`,{token:h.body.token}),request(env,`rooms/${id}/join`,{nickname:'New Guest'})]);
   if(join.status===200){const response=await handleApi(new Request(`https://game.example/api/rooms/${id}/state?token=${join.body.token}`),env);assert.equal(response.status,200,'a successful concurrent join must not reference a deleted room');const state=await response.json();assert(state.members.some(m=>m.id===state.hostId));}
   else assert([404,409].includes(join.status));
  }finally{env.sqlite.close()}
 }
});
