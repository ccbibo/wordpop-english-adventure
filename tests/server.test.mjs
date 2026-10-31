import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {requestHandler} from '../server.mjs';
const api=async(path,body,headers={})=>{
 const req=Readable.from(body?[JSON.stringify(body)]:[]);req.url=path;req.method=body?'POST':'GET';req.headers={host:'localhost','content-type':'application/json',...headers};
 let status=200,payload='';const res={headersSent:false,writeHead(s,h){status=s;this.headersSent=true;},end(v){payload=v?.toString()||'';}};
 await requestHandler(req,res);let data;try{data=JSON.parse(payload);}catch{data=payload;}return {status,data};
};
test('real two-player room, token privacy, host gate, same seed, finish and leaderboard',async()=>{
 const host=await api('/api/rooms',{name:'test',mode:'duel',password:'abc',nickname:'Alice'});assert.equal(host.status,201);const {room,token}=host.data;
 assert.equal(room.members.length,1);assert.equal(room.members[0].token,undefined);
 assert.equal((await api(`/api/rooms/${room.id}/start`,{token})).status,409);
 assert.equal((await api(`/api/rooms/${room.id}/join`,{nickname:'Bob',password:'bad'})).status,403);
 const guest=await api(`/api/rooms/${room.id}/join`,{nickname:'Bob',password:'abc'});assert.equal(guest.data.room.seed,room.seed);
 assert.equal((await api(`/api/rooms/${room.id}/join`,{nickname:'third',password:'abc'})).status,409);
 assert.equal((await api(`/api/rooms/${room.id}/start`,{token:guest.data.token})).status,403);
 assert.equal((await api(`/api/rooms/${room.id}/state?token=bad`)).status,401);
 assert.equal((await api(`/api/rooms/${room.id}/start`,{token})).data.status,'playing');
 assert.equal((await api(`/api/rooms/${room.id}/score`,{token,score:20,cleared:3})).status,200);
 assert.equal((await api(`/api/rooms/${room.id}/score`,{token,score:10,cleared:3})).status,400);
 await api(`/api/rooms/${room.id}/score`,{token,score:50,cleared:6,done:true});
 const finished=await api(`/api/rooms/${room.id}/score`,{token:guest.data.token,score:30,cleared:3,done:true});assert.equal(finished.data.status,'finished');assert.equal(finished.data.winner,host.data.memberId);
 const list=await api('/api/leaderboard');assert.equal(list.data.entries[0].nickname,'Alice');
});
test('input checks, foreign origin, team capacity and blocked data files',async()=>{
 assert.equal((await api('/api/rooms',{nickname:'x',mode:'no'})).status,400);
 assert.equal((await api('/api/rooms',{nickname:'x',mode:'duel'},{origin:'https://evil.example'})).status,403);
 const host=await api('/api/rooms',{nickname:'host',mode:'team'});assert.equal(host.data.room.capacity,4);
 for(const nickname of ['two','three','four'])assert.equal((await api(`/api/rooms/${host.data.room.id}/join`,{nickname})).status,200);
 assert.equal((await api(`/api/rooms/${host.data.room.id}/join`,{nickname:'five'})).status,409);
 assert.equal((await api('/.openai/hosting.json')).status,403);
 assert.equal((await api('/server.mjs')).status,404);
});

test('waiting leave releases slot, transfers host, removes empty room',async()=>{
 const h=(await api('/api/rooms',{nickname:'old host',mode:'duel'})).data;
 const g=(await api(`/api/rooms/${h.room.id}/join`,{nickname:'new host'})).data;
 const left=await api(`/api/rooms/${h.room.id}/leave`,{token:h.token});assert.equal(left.status,200);assert.equal(left.data.room.hostId,g.memberId);assert.equal(left.data.room.members.length,1);
 assert.equal((await api(`/api/rooms/${h.room.id}/state?token=${h.token}`)).status,401);
 const empty=await api(`/api/rooms/${h.room.id}/leave`,{token:g.token});assert.equal(empty.data.room,null);
 assert.equal((await api(`/api/rooms/${h.room.id}/state?token=${g.token}`)).status,404);
});
test('playing leave preserves submitted score, marks done and settles',async()=>{
 const h=(await api('/api/rooms',{nickname:'stays',mode:'duel'})).data;
 const g=(await api(`/api/rooms/${h.room.id}/join`,{nickname:'leaves'})).data;
 await api(`/api/rooms/${h.room.id}/start`,{token:h.token});
 await api(`/api/rooms/${h.room.id}/score`,{token:g.token,score:10,cleared:3});
 const left=await api(`/api/rooms/${h.room.id}/leave`,{token:g.token});const guest=left.data.room.members.find(m=>m.id===g.memberId);assert.equal(guest.done,true);assert.equal(guest.left,true);assert.equal(guest.score,10);
 const finish=await api(`/api/rooms/${h.room.id}/score`,{token:h.token,score:20,cleared:6,done:true});assert.equal(finish.data.status,'finished');assert.equal(finish.data.winner,h.memberId);
});
