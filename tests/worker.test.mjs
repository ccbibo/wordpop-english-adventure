import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {handleApi} from '../worker/api.js';
import {createD1} from './d1-adapter.mjs';
const migration=await readFile(new URL('../drizzle/0000_game.sql',import.meta.url),'utf8');
const fixture=()=>{const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(migration);return {sqlite,DB:createD1(sqlite)}};
function client(env,cookie=''){return {cookie,async call(route,body,headers={}){const res=await handleApi(new Request('https://word.example/api/'+route,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(this.cookie?{cookie:this.cookie}:{}),...headers},body:body?JSON.stringify(body):undefined}),env);const set=res.headers.get('set-cookie');if(set)this.cookie=set.split(';')[0];return {status:res.status,body:await res.json(),headers:res.headers}}}}
const register=(c,username='alice',more={})=>c.call('auth/register',{username,password:'test-password-only',nickname:'Little Fox',grade:'lower',public:true,...more});
const progress=()=>({version:1,unlocked:3,coins:140,stars:{1:3,2:2},history:[],review:{},quiz:{},settings:{sound:true,color:true,public:false,accent:'en-US',limit:30},seconds:60,day:'2026-10-31'});
const sampleRun=(runId='run-000001',level=1,score=100)=>({runId,level,score,stars:3,seconds:12,cleared:12});
test('registered ID, secure session, wrong password, logout and private data ownership',async()=>{
 const env=fixture(),a=client(env),b=client(env);const result=await register(a);assert.equal(result.status,201);assert.equal(result.body.user.username,'alice');assert.equal(result.body.user.public,true);assert.equal(result.body.user.password_hash,undefined);const cookie=result.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Secure/);
 const row=env.sqlite.prepare('SELECT * FROM users').get();assert.notEqual(row.password_hash,'test-password-only');assert.equal(row.password_hash.length,64);assert.equal(row.salt.length,48);
 const stored=env.sqlite.prepare('SELECT * FROM sessions').get();assert.notEqual(stored.token_hash,a.cookie.split('=')[1]);
 assert.equal((await register(b,'ALICE')).status,409);assert.equal((await b.call('auth/login',{username:'alice',password:'wrong-pass'})).status,401);assert.equal((await b.call('progress')).status,401);
 assert.equal((await a.call('progress',{ownerId:result.body.user.id,progress:progress()})).status,200);assert.equal((await a.call('progress')).body.progress.unlocked,3);
 assert.equal((await a.call('progress',{ownerId:'another-user',progress:progress()})).status,409);
 const old=a.cookie;assert.equal((await a.call('auth/logout',{})).status,200);assert.equal((await client(env,old).call('progress')).status,401);assert.equal((await a.call('auth/me')).body.user,null);
 const login=await a.call('auth/login',{username:'ALICE',password:'test-password-only'});assert.equal(login.status,200);assert.equal((await a.call('progress')).body.progress.unlocked,3);env.sqlite.close();
});
test('leaderboard persists best-per-level, respects privacy and grade, and run IDs are idempotent',async()=>{
 const env=fixture(),a=client(env),b=client(env),guest=client(env);await register(a);await register(b,'bob',{nickname:'Bear',grade:'upper',public:false});
 assert.equal((await a.call('runs',sampleRun())).status,201);assert.equal((await a.call('runs',sampleRun())).body.duplicate,true);assert.equal((await a.call('runs',sampleRun('run-000001',1,110))).status,409);
 await a.call('runs',sampleRun('run-000002',1,80));await a.call('runs',sampleRun('run-000003',2,50));await b.call('runs',sampleRun('run-000004',1,999));
 let board=(await guest.call('leaderboard')).body.entries;assert.equal(board.length,1);assert.equal(board[0].score,150);assert.equal(board[0].nickname,'Little Fox');assert.equal(board[0].username,undefined);
 assert.equal((await guest.call('leaderboard?scope=grade')).status,401);assert.equal((await a.call('leaderboard?scope=grade')).body.entries.length,1);
 await b.call('auth/profile',{public:true});board=(await guest.call('leaderboard')).body.entries;assert.equal(board.length,2);assert.equal(board[0].nickname,'Bear');
 assert.equal((await b.call('runs',sampleRun('run-000005',1,100))).status,201);assert.equal((await b.call('runs',sampleRun('run-000001',1,100))).status,409);
 assert.equal((await a.call('runs',{...sampleRun('run-000009'),ownerId:'different'})).status,409);env.sqlite.close();
});
test('real SQLite file survives closing and reopening server database',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'word-pop-db-'));const file=path.join(folder,'game.sqlite');let sqlite=new DatabaseSync(file);sqlite.exec(migration);let env={DB:createD1(sqlite)},a=client(env);await register(a,'persisted');await a.call('progress',{progress:progress()});await a.call('runs',sampleRun());const cookie=a.cookie;sqlite.close();
 sqlite=new DatabaseSync(file);env={DB:createD1(sqlite)};a=client(env,cookie);assert.equal((await a.call('auth/me')).body.user.username,'persisted');assert.equal((await a.call('progress')).body.progress.unlocked,3);assert.equal((await a.call('leaderboard')).body.entries[0].score,100);sqlite.close();await rm(folder,{recursive:true,force:true});
});
test('bad origin, input injection, malformed progress and oversized data are rejected',async()=>{
 const env=fixture(),c=client(env);assert.equal((await register(c,"a' OR 1=1--")).status,400);assert.equal((await c.call('auth/register',{username:'okuser',password:'test-password-only',nickname:'x',grade:'lower'},{origin:'https://evil.example'})).status,403);await register(c);
 assert.equal((await c.call('progress',{progress:{...progress(),history:[null]}})).status,400);assert.equal((await c.call('progress',{progress:{...progress(),settings:{...progress().settings,limit:-1}}})).status,400);
 assert.equal((await c.call('auth/profile',{public:'true'})).status,400);assert.equal((await c.call('runs',sampleRun('bad',81,100))).status,400);assert.equal((await c.call('runs',{...sampleRun(),score:1000000})).status,400);
 assert.equal((await c.call('progress',{progress:{...progress(),blob:'x'.repeat(150000)}})).status,413);env.sqlite.close();
});
test('D1 rooms join real clients, protect tokens, host gate, seeded duel and durable settlement',async()=>{
 const env=fixture(),a=client(env),b=client(env);const h=(await a.call('rooms',{name:'Fox Room',mode:'duel',nickname:'Fox',password:'room-test'})).body;assert.equal(h.room.members.length,1);assert.equal(h.room.members[0].token,undefined);
 assert.equal((await b.call(`rooms/${h.room.id}/join`,{nickname:'Bear',password:'wrong'})).status,403);const g=(await b.call(`rooms/${h.room.id}/join`,{nickname:'Bear',password:'room-test'})).body;assert.equal(g.room.seed,h.room.seed);assert.equal((await b.call(`rooms/${h.room.id}/start`,{token:g.token})).status,403);
 assert.equal((await a.call(`rooms/${h.room.id}/start`,{token:h.token})).body.status,'playing');await a.call(`rooms/${h.room.id}/score`,{token:h.token,score:100,cleared:12,done:true});const end=await b.call(`rooms/${h.room.id}/score`,{token:g.token,score:70,cleared:9,done:true});assert.equal(end.body.status,'finished');assert.equal(end.body.winner,h.memberId);assert.equal((await a.call(`rooms/${h.room.id}/state?token=bad`)).status,401);env.sqlite.close();
});
test('D1 waiting leave transfers host, empty room deletes, team goal settles correctly',async()=>{
 const env=fixture(),c=client(env);let h=(await c.call('rooms',{mode:'team',nickname:'Host'})).body;const g=(await c.call(`rooms/${h.room.id}/join`,{nickname:'Guest'})).body;const left=await c.call(`rooms/${h.room.id}/leave`,{token:h.token});assert.equal(left.body.room.hostId,g.memberId);assert.equal((await c.call(`rooms/${h.room.id}/leave`,{token:g.token})).body.room,null);
 h=(await c.call('rooms',{mode:'team',nickname:'New Host'})).body;const g2=(await c.call(`rooms/${h.room.id}/join`,{nickname:'New Guest'})).body;await c.call(`rooms/${h.room.id}/start`,{token:h.token});await c.call(`rooms/${h.room.id}/score`,{token:h.token,score:500,cleared:60,done:true});const end=await c.call(`rooms/${h.room.id}/score`,{token:g2.token,score:500,cleared:60,done:true});assert.equal(end.body.winner,'team');env.sqlite.close();
});
test('weekly topic and grade filters use real accepted runs and session expiry is enforced',async()=>{
 const env=fixture(),a=client(env),b=client(env);await register(a,'week_fox');await register(b,'week_bear',{grade:'upper'});const weekly=await a.call('leaderboard?scope=week'),level=weekly.body.theme*4+1;
 await a.call('runs',sampleRun('weekly-run-001',level,90));await a.call('runs',sampleRun('weekly-run-002',level===1?5:1,200));await b.call('runs',sampleRun('weekly-run-003',level,150));
 const week=(await a.call('leaderboard?scope=week')).body.entries;assert.equal(week.length,2);assert.equal(week.find(x=>x.grade==='lower').score,90);const grade=(await a.call('leaderboard?scope=grade')).body.entries;assert.equal(grade.length,1);assert.equal(grade[0].grade,'lower');
 env.sqlite.prepare('UPDATE sessions SET expires_at=0').run();assert.equal((await a.call('auth/me')).body.user,null);assert.equal((await a.call('progress')).status,401);env.sqlite.close();
});
test('concurrent joins cannot exceed room capacity and team goal finishes without waiting for timer',async()=>{
 const env=fixture(),c=client(env);const h=(await c.call('rooms',{mode:'duel',nickname:'Host'})).body;const results=await Promise.all(['A','B'].map(nickname=>c.call(`rooms/${h.room.id}/join`,{nickname})));assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);assert.equal((await c.call(`rooms/${h.room.id}/state?token=${h.token}`)).body.members.length,2);
 const team=(await c.call('rooms',{mode:'team',nickname:'Team Host'})).body;const guest=(await c.call(`rooms/${team.room.id}/join`,{nickname:'Team Guest'})).body;await c.call(`rooms/${team.room.id}/start`,{token:team.token});await c.call(`rooms/${team.room.id}/score`,{token:team.token,score:300,cleared:60});const end=await c.call(`rooms/${team.room.id}/score`,{token:guest.token,score:300,cleared:60});assert.equal(end.body.status,'finished');assert.equal(end.body.winner,'team');env.sqlite.close();
});
