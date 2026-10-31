/** Local multiplayer prototype. Room/session/leaderboard data live in memory only.
 * Scores are client-reported with basic sanity checks, not authoritative anti-cheat.
 * Run: node server.mjs ; PORT=8772 by default. No external dependencies.
 */
import http from 'node:http';
import {randomBytes, randomInt, timingSafeEqual, createHash} from 'node:crypto';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const rooms=new Map(), leaderboard=[];
const TTL=2*60*60*1000,MAX_ROOMS=100;
const id=()=>randomBytes(12).toString('hex');
const clean=(s,max=32)=>String(s??'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,max);
const hash=s=>createHash('sha256').update(s).digest();
function failure(status,message){const e=new Error(message);e.status=status;throw e;}
function finish(r){
  if(r.status!=='playing')return;
  if(Date.now()-r.startedAt<r.duration*1000&&!r.members.every(m=>m.done))return;
  r.status='finished';
  if(r.mode==='team')r.winner=r.members.reduce((s,m)=>s+m.cleared,0)>=120?'team':null;
  else{const best=Math.max(...r.members.map(m=>m.score)), top=r.members.filter(m=>m.score===best);r.winner=top.length>1?'tie':top[0].id;}
  for(const m of r.members)leaderboard.push({nickname:m.nickname,score:m.score,mode:r.mode,at:new Date().toISOString()});
  leaderboard.sort((a,b)=>b.score-a.score);leaderboard.splice(100);
}
function pub(r){finish(r);return {id:r.id,name:r.name,mode:r.mode,capacity:r.capacity,status:r.status,seed:r.seed,startedAt:r.startedAt,duration:r.duration,winner:r.winner,hostId:r.hostId,teamTarget:120,members:r.members.map(({token,password,...m})=>m)};}
function member(r,token){if(typeof token!=='string')failure(401,'需要房間通行碼');const m=r.members.find(m=>m.token===token);if(!m)failure(401,'房間通行碼無效');return m;}
function expire(){const now=Date.now();for(const [k,r]of rooms)if(now-r.createdAt>TTL)rooms.delete(k);}
async function body(req){let b='';for await(const chunk of req){b+=chunk;if(Buffer.byteLength(b)>4096)failure(413,'資料過大');}try{const v=JSON.parse(b||'{}');if(!v||typeof v!=='object'||Array.isArray(v))failure(400,'需要 JSON 物件');return v;}catch(e){if(e.status)throw e;failure(400,'JSON 格式錯誤');}}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json','.ico':'image/x-icon','.woff2':'font/woff2'};
export async function requestHandler(req,res){try{
  const url=new URL(req.url,'http://localhost');
  // Deny foreign website scripts from writing to this local service.
  if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin);}catch{failure(403,'來源無效');}if(origin.host!==req.headers.host)failure(403,'不允許跨來源存取');}
  if(url.pathname.startsWith('/api/')){
    expire();
    if(url.pathname==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,storage:'memory',scoring:'client-reported',duration:120});
    if(url.pathname==='/api/leaderboard'&&req.method==='GET')return send(res,200,{entries:leaderboard,notice:'本伺服器本次啟動的對戰紀錄；分數由玩家裝置回報，尚無帳號驗證與防作弊。'});
    if(url.pathname==='/api/rooms'&&req.method==='GET')return send(res,200,{rooms:[...rooms.values()].filter(r=>r.status==='waiting').map(r=>({id:r.id,name:r.name,mode:r.mode,count:r.members.length,capacity:r.capacity,status:r.status,hasPassword:!!r.password}))});
    if(url.pathname==='/api/rooms'&&req.method==='POST'){
      if(rooms.size>=MAX_ROOMS)failure(429,'房間已滿，請稍後再試');
      const b=await body(req);if(!['duel','team'].includes(b.mode))failure(400,'模式必須為 duel 或 team');
      const nickname=clean(b.nickname);if(!nickname)failure(400,'請輸入暱稱');
      const host={id:id(),token:id(),nickname,score:0,cleared:0,done:false};
      const r={id:id(),name:clean(b.name)||`${nickname} 的房間`,mode:b.mode,capacity:b.mode==='duel'?2:4,status:'waiting',seed:randomInt(1,2147483647),startedAt:null,duration:120,winner:null,hostId:host.id,members:[host],password:b.password?hash(String(b.password).slice(0,128)):null,createdAt:Date.now()};
      rooms.set(r.id,r);return send(res,201,{room:pub(r),token:host.token,memberId:host.id});
    }
    const match=url.pathname.match(/^\/api\/rooms\/([a-f0-9]{24})\/(join|state|score|start|leave)$/);
    if(!match)failure(404,'找不到 API');
    const r=rooms.get(match[1]);if(!r)failure(404,'房間不存在或已過期');finish(r);
    const action=match[2];
    if(action==='state'&&req.method==='GET'){member(r,url.searchParams.get('token'));return send(res,200,pub(r));}
    if(req.method!=='POST')failure(405,'請使用 POST');
    const b=await body(req);
    if(action==='join'){
      if(r.status!=='waiting')failure(409,'遊戲已開始');if(r.members.length>=r.capacity)failure(409,'房間已滿');
      if(r.password&&!timingSafeEqual(r.password,hash(String(b.password??'').slice(0,128))))failure(403,'密碼不正確');
      const nickname=clean(b.nickname);if(!nickname)failure(400,'請輸入暱稱');
      const m={id:id(),token:id(),nickname,score:0,cleared:0,done:false};r.members.push(m);return send(res,200,{room:pub(r),token:m.token,memberId:m.id});
    }
    const m=member(r,b.token);
    if(action==='leave'){
      if(r.status==='waiting'){
        r.members=r.members.filter(candidate=>candidate.id!==m.id);
        if(!r.members.length){rooms.delete(r.id);return send(res,200,{left:true,room:null});}
        if(r.hostId===m.id)r.hostId=r.members[0].id;
      }else if(r.status==='playing'){
        m.done=true;m.left=true;finish(r);
      }
      return send(res,200,{left:true,room:pub(r)});
    }
    if(action==='start'){
      if(m.id!==r.hostId)failure(403,'只有房主可以開始');if(r.status!=='waiting')failure(409,'遊戲已開始');if(r.members.length<2)failure(409,'至少需要兩位玩家');
      r.startedAt=Date.now();r.status='playing';return send(res,200,pub(r));
    }
    if(action==='score'){
      if(r.status!=='playing')failure(409,'目前無法回報分數');
      if(m.done)failure(409,'你已完成這場遊戲');
      if(!Number.isSafeInteger(b.score)||!Number.isSafeInteger(b.cleared)||b.score<m.score||b.cleared<m.cleared||b.score>1000000||b.cleared>10000)failure(400,'分數或消除數量無效');
      const elapsed=(Date.now()-r.startedAt)/1000;
      if(b.score>5000+elapsed*2500||b.cleared>500+elapsed*100)failure(400,'分數變化過大');
      m.score=b.score;m.cleared=b.cleared;m.done=b.done===true;return send(res,200,pub(r));
    }
    failure(404,'找不到 API');
  }
  if(!['GET','HEAD'].includes(req.method))failure(405,'請使用 GET');
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{failure(400,'網址格式錯誤');}
  if(pathname.includes('\0')||pathname.includes('\\'))failure(400,'網址格式錯誤');
  const target=path.resolve(root,'.'+pathname);if(target!==root&&!target.startsWith(root+path.sep))failure(403,'路徑無效');
  const relative=path.relative(root,target);if(relative.split(path.sep).some(p=>p.startsWith('.')))failure(403,'不允許讀取');
  let file=target;try{const info=await stat(file);if(info.isDirectory())file=path.join(file,'index.html');const contents=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:contents);}catch{failure(404,'找不到檔案');}
}catch(e){if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'伺服器錯誤'});else res.end();}}
export const server=http.createServer(requestHandler);
server.on('error',error=>{
  const code=error.code||'UNKNOWN';
  console.error(code==='EADDRINUSE'?'房間伺服器無法啟動：連接埠已被使用，請更換 PORT 或關閉既有伺服器。':code==='EPERM'||code==='EACCES'?'房間伺服器無法啟動：目前環境不允許開啟網路監聽埠。':`房間伺服器錯誤：${code}`);
  if(typeof process!=='undefined')process.exitCode=1;
});
if(typeof process!=='undefined' && process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT)||8772,'0.0.0.0',()=>console.log(`Local: http://127.0.0.1:${server.address().port}/`));
if(typeof process!=='undefined' && process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
