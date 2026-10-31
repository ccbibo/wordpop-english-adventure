/* Pure, deterministic match-three rules. Pass a seeded rng for replay/tests. */
const clone = b => b.map(t => t ? {...t} : null);
const blocked = t => !t || t.ice > 0 || t.lock > 0;
let nextTileId=0;
const tile = (families, rng) => ({id:'t'+(++nextTileId),family:Math.floor(rng()*families),type:Math.floor(rng()*3),special:null,ice:0,lock:0});
const adjacent = (a,b,n) => Math.abs(Math.floor(a/n)-Math.floor(b/n))+Math.abs(a%n-b%n)===1;

export function findMatches(board,size) {
  const lines=[];
  for(let axis=0;axis<2;axis++) for(let fixed=0;fixed<size;fixed++) {
    let run=[];
    const flush=()=>{if(run.length>=3)lines.push(run);run=[];};
    for(let p=0;p<size;p++) {
      const i=axis===0?fixed*size+p:p*size+fixed, t=board[i];
      if(blocked(t)){flush();continue;}
      if(run.length && board[run[0]].family!==t.family)flush();
      run.push(i);
    }
    flush();
  }
  const merged=[];
  for(const line of lines){
    let union=new Set(line);
    for(let i=merged.length-1;i>=0;i--)if(merged[i].some(k=>union.has(k))){merged[i].forEach(k=>union.add(k));merged.splice(i,1);}
    merged.push([...union]);
  }
  return merged;
}

export function possibleMoves(board,size) {
  const moves=[];
  for(let a=0;a<board.length;a++)for(const b of [a%size<size-1?a+1:-1,a+size<board.length?a+size:-1]){
    if(b<0 || blocked(board[a]) || blocked(board[b]))continue;
    if(board[a].special==='rainbow'||board[b].special==='rainbow'||(board[a].special&&board[b].special)){moves.push([a,b]);continue;}
    const copy=board.slice();[copy[a],copy[b]]=[copy[b],copy[a]];
    if(findMatches(copy,size).some(g=>g.includes(a)||g.includes(b)))moves.push([a,b]);
  }
  return moves;
}

export function newBoard(size=7,families=6,rng=Math.random) {
  if(!Number.isInteger(size)||size<3||!Number.isInteger(families)||families<3)throw new RangeError('Board needs size >= 3 and at least 3 families.');
  for(let attempt=0;attempt<100;attempt++){
    const board=[];
    for(let i=0;i<size*size;i++){
      const t=tile(families,rng), forbidden=new Set();
      if(i%size>=2&&board[i-1].family===board[i-2].family)forbidden.add(board[i-1].family);
      if(i>=size*2&&board[i-size].family===board[i-size*2].family)forbidden.add(board[i-size].family);
      while(forbidden.has(t.family))t.family=(t.family+1)%families;
      board.push(t);
    }
    if(possibleMoves(board,size).length)return board;
  }
  // A deterministic fallback also works with a constant random source.
  const board=Array.from({length:size*size},(_,i)=>({...tile(families,rng),family:(i%size+Math.floor(i/size))%families}));
  [board[0].family,board[1].family,board[2].family,board[size+1].family]=[0,1,0,0];
  if(findMatches(board,size).length) return newBoard(size,families,Math.random);
  return board;
}

function settle(board,size,families,rng){
  // Obstacles are fixed shelves; tiles above cannot fall through them.
  for(let c=0;c<size;c++){
    let end=size-1;
    while(end>=0){
      if(blocked(board[end*size+c])&&board[end*size+c]){end--;continue;}
      // Find the nearest obstacle rather than treating null as a shelf.
      let start=end;while(start>=0&&!(board[start*size+c]&&(board[start*size+c].ice>0||board[start*size+c].lock>0)))start--;
      const remaining=[];for(let r=end;r>start;r--)if(board[r*size+c])remaining.push(board[r*size+c]);
      for(let r=end;r>start;r--)board[r*size+c]=remaining[end-r]||tile(families,rng);
      end=start-1;
    }
  }
}

function shuffled(board,size,families,rng){
  const free=board.map((t,i)=>!blocked(t)?i:-1).filter(i=>i>=0), original=free.map(i=>board[i]);
  for(let k=0;k<100;k++){
    const values=original.slice();for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
    free.forEach((i,j)=>board[i]=values[j]);
    if(!findMatches(board,size).length&&possibleMoves(board,size).length)return board;
  }
  // Refresh free cells only; preserve obstacle state and guarantee a move when space permits.
  for(let k=0;k<100;k++){
    const fresh=newBoard(size,families,rng);free.forEach(i=>board[i]=fresh[i]);
    if(!findMatches(board,size).length&&possibleMoves(board,size).length)return board;
  }
  // Extreme blocked boards can have no legal triplet: expose a rainbow as a legal escape.
  if(free.length>1)board[free[0]].special='rainbow';
  return board;
}

export function applyMove(input,size,a,b,families=6,rng=Math.random,options={luckyChance:0}) {
  const out={valid:false,board:clone(input),frames:[],score:0,cleared:0,words:{},obstacles:0,specials:0,reshuffled:false,starsTriggered:0,automaticMoves:[],luckySpawn:null};
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=input.length||b>=input.length||!adjacent(a,b,size)||blocked(input[a])||blocked(input[b]))return out;
  let board=out.board;[board[a],board[b]]=[board[b],board[a]];
  let groups=findMatches(board,size), forced=[];
  const sa=board[a].special,sb=board[b].special;
  if(sa==='rainbow'||sb==='rainbow'){
    if(sa==='rainbow'&&sb==='rainbow')forced=board.map((_,i)=>i);
    else {const target=sa==='rainbow'?board[b].family:board[a].family;forced=board.map((t,i)=>t.family===target||i===a||i===b?i:-1).filter(i=>i>=0);}
  } else if(sa&&sb)forced=[a,b];
  if(!forced.length&&!groups.some(g=>g.includes(a)||g.includes(b))){out.board=clone(input);return out;}
  out.valid=true;
  for(let wave=0;wave<100&&(groups.length||forced.length);wave++){
    const before=clone(board), clear=new Set(forced), created=[], hits=new Set();let gain=0;
    for(const g of groups){
      g.forEach(i=>clear.add(i));
      const mixed=new Set(g.map(i=>board[i].type)).size===3;
      gain+=(10+(mixed?5:0))*(wave+1);
      if(!forced.length&&g.length>=4){
        const sameRow=g.every(i=>Math.floor(i/size)===Math.floor(g[0]/size)),sameCol=g.every(i=>i%size===g[0]%size);
        const special=!sameRow&&!sameCol?'bomb':g.length>=5?'rainbow':'line';
        const at=g.includes(b)?b:g.includes(a)?a:g[Math.floor(g.length/2)];
        if(!board[at].special)created.push({index:at,special,axis:sameCol?'col':'row'});
      }
    }
    // Existing specials may be hit by other specials. A queue makes each trigger once.
    const queue=[...clear],activated=new Set();
    for(let q=0;q<queue.length;q++){
      const i=queue[q],t=board[i];if(!t||!t.special||activated.has(i)||blocked(t))continue;
      activated.add(i);out.specials++;if(t.special==='star')out.starsTriggered++;const more=[];
      if(t.special==='line')for(let p=0;p<size;p++)more.push(t.axis==='col'?p*size+i%size:Math.floor(i/size)*size+p);
      if(t.special==='bomb')for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const r=Math.floor(i/size)+dr,c=i%size+dc;if(r>=0&&r<size&&c>=0&&c<size)more.push(r*size+c);}
      if(t.special==='rainbow')board.forEach((v,j)=>{if(v.family===t.family)more.push(j);});
      more.forEach(j=>{if(!clear.has(j)){clear.add(j);queue.push(j);}});
    }
    for(const i of clear){
      if(blocked(board[i]))hits.add(i);
      for(const j of [i-1,i+1,i-size,i+size])if(j>=0&&j<board.length&&adjacent(i,j,size)&&blocked(board[j]))hits.add(j);
    }
    for(const i of hits){const t=board[i];if(!t)continue;if(t.ice>0){t.ice--;if(t.ice===0)out.obstacles++;}else if(t.lock>0){t.lock--;if(t.lock===0)out.obstacles++;}}
    const keep=new Set(created.map(t=>t.index));
    const removed=[];
    for(const i of clear){if(blocked(before[i])||keep.has(i))continue;out.words[board[i].family]=(out.words[board[i].family]||0)+1;board[i]=null;out.cleared++;removed.push(i);}
    for(const t of created){board[t.index].special=t.special;board[t.index].axis=t.axis;}
    if(!gain)gain=10*(wave+1);out.score+=gain;
    settle(board,size,families,rng);
    out.frames.push({before,cleared:removed,after:clone(board),created,combo:wave+1,score:gain});
    forced=[];groups=findMatches(board,size);
  }
  if(findMatches(board,size).length||!possibleMoves(board,size).length){shuffled(board,size,families,rng);out.reshuffled=true;}
  // A lucky star plays three real legal swaps. Every nested move uses the same
  // random stream, records ordinary cascades, and cannot spawn another star.
  // Stars already present may chain; each disappears before its auto-swaps run.
  const starsToPlay=out.starsTriggered;
  for(let star=0;star<starsToPlay;star++)for(let turn=0;turn<3;turn++){
    const moves=possibleMoves(board,size);if(!moves.length)break;
    const [from,to]=moves[Math.floor(rng()*moves.length)];
    const result=applyMove(board,size,from,to,families,rng,{luckyChance:0});
    if(!result.valid)continue;
    out.automaticMoves.push([from,to],...result.automaticMoves);
    out.frames.push(...result.frames.map(frame=>({...frame,automatic:true})));
    out.score+=result.score;out.cleared+=result.cleared;out.obstacles+=result.obstacles;out.specials+=result.specials;out.starsTriggered+=result.starsTriggered;
    for(const [family,count]of Object.entries(result.words))out.words[family]=(out.words[family]||0)+count;
    out.reshuffled ||= result.reshuffled;board=out.board=result.board;
  }
  const chance=Math.min(1,Math.max(0,Number(options?.luckyChance)||0));
  if(chance>0&&rng()<chance){
    const candidates=board.map((t,i)=>!blocked(t)&&!t.special?i:-1).filter(i=>i>=0);
    if(candidates.length){const index=candidates[Math.floor(rng()*candidates.length)];board[index].special='star';out.luckySpawn=index;}
  }
  return out;
}

export function shuffleBoard(input,size,families=6,rng=Math.random){return shuffled(clone(input),size,families,rng);}
