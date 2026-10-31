/** Behavioral unit fixtures for the real rendering functions.
 * These are lightweight DOM/canvas stand-ins, not browser layout, screenshots,
 * animation smoothness, or FPS measurements. Native UI validation is separate.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import {newBoard,possibleMoves,applyMove} from '../dist/engine.js';

const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const fragment=(start,end)=>{
  assert(source.includes(start)&&source.includes(end),'Rendering function boundaries are available');
  return source.slice(source.indexOf(start),source.indexOf(end));
};

function fixture(reduced=false){
  let board,document;const animations=[];
  class TileNode{
    constructor(){
      this.dataset={};this.style={setProperty(){}};this.attrs={};
      this.parts={'.tile-label':{textContent:'',style:{}},'.special':{},'.obstacle':{}};
      this.classList={contains:key=>(this.className||'').split(' ').includes(key)};
    }
    setAttribute(key,value){this.attrs[key]=value}
    querySelector(key){return this.parts[key]}
    getBoundingClientRect(){const i=board.children.indexOf(this);return{left:i%4*50,top:Math.floor(i/4)*50,width:50,height:50}}
    animate(frames,options){animations.push({node:this,frames,options});return{}}
    focus(){document.activeElement=this}
    remove(){board.children.splice(board.children.indexOf(this),1)}
  }
  board={
    children:[],dataset:{},clientWidth:200,
    contains:node=>board.children.includes(node),
    insertBefore(el,ref){
      const old=this.children.indexOf(el);if(old>=0)this.children.splice(old,1);
      const index=ref?this.children.indexOf(ref):-1;
      if(index>=0)this.children.splice(index,0,el);else this.children.push(el);
    },
    querySelector(selector){const m=selector.match(/data-cell="(\d+)"/);return m?this.children.find(n=>+n.dataset.cell===+m[1]):null}
  };
  document={activeElement:null,createElement:()=>new TileNode()};
  const game={level:1,board:Array.from({length:16},(_,i)=>({id:'t'+i,family:i%6,type:1})),t:{words:Array.from({length:6},(_,i)=>({en:'word'+i,zh:'字',emoji:'🐱'}))},hint:[],ended:false};
  const context={document,game,SIZE:4,$:s=>s==='#board'?board:null,selected:-1,data:{settings:{color:true}},colors:['a','b','c','d','e','f'],matchMedia:()=>({matches:reduced}),ResizeObserver:class{observe(){}},fitLabel(){},burst(){},busy:false,move(){},cell(){},setTimeout};
  vm.createContext(context);
  vm.runInContext(fragment('function renderBoard(','const fitCache=')+';this.render=renderBoard',context);
  return{board,document,game,context,animations};
}

test('matching keeps board/survivor node identity and swaps actual keyed nodes',()=>{
  const {board,document,game,context,animations}=fixture();
  context.render();const original=[...board.children];
  assert.equal(board.children.length,16);document.activeElement=original[0];
  [game.board[0],game.board[1]]=[game.board[1],game.board[0]];
  context.render({swap:true});
  assert.equal(board.children[0],original[1]);assert.equal(board.children[1],original[0]);
  assert.equal(document.activeElement,board.children[0]);
  assert.equal(board.children.filter(n=>n.tabIndex===0).length,1);
  assert.equal(animations.length,2);
  context.render({pop:[0,1]});assert(board.children[0].className.includes('pop'));
  const survivor=board.children[5];
  game.board[0]={id:'new1',family:0,type:1};game.board[1]={id:'new2',family:1,type:1};
  context.render({drop:true});
  assert.equal(board.children.length,16);assert.equal(board.children[5],survivor);
  assert(!board.children.includes(original[0]));assert(!board.children.includes(original[1]));
  assert(animations.some(a=>a.node.dataset.uid==='new1'&&a.options.duration>0));
});

test('reduced motion skips JS swap/drop movement without changing game output',()=>{
  const {board,game,context,animations}=fixture(true);context.render();
  [game.board[0],game.board[1]]=[game.board[1],game.board[0]];
  context.render({swap:true,pop:[0]});
  assert.equal(board.children[0].dataset.uid,'t1');assert.equal(animations.length,0);
});

test('label fitting caches repeated word/width and measures changed words',()=>{
  let measured=0;
  const context={Map,document:{createElement(){return{getContext(){return{font:'',measureText(text){measured++;return{width:text.length*parseFloat(this.font.split(' ')[1])*.55}}}}}}}};
  vm.createContext(context);
  vm.runInContext(fragment('const fitCache=','function specialFX(')+';this.fit=fitLabel',context);
  const label={textContent:'monkey',style:{}};
  const element={classList:{contains:v=>v==='type1'},querySelector:()=>label};
  context.fit(element,70);const first=measured;assert(first>0);
  context.fit(element,70);assert.equal(measured,first);
  label.textContent='firefighter';context.fit(element,70);assert(measured>first);
  assert(parseFloat(label.style.fontSize)>=10);
});

test('lightning effect centers on the complete row/column rather than edge special tile',()=>{
  const effects=[],tile={getBoundingClientRect:()=>({left:100,top:200,width:60,height:60})};
  const board={querySelector:()=>tile,getBoundingClientRect:()=>({left:100,top:200,width:240,height:240})};
  const context={$:()=>board,document:{createElement:()=>({style:{},remove(){}}),body:{append:fx=>effects.push(fx)}},setTimeout(){}};
  vm.createContext(context);vm.runInContext(fragment('function specialFX(','function burst(')+';this.fx=specialFX',context);
  context.fx({cleared:[0],before:[{special:'line',axis:'row'}]});
  assert.equal(effects[0].style.left,'220px');assert.equal(effects[0].style.width,'240px');
  context.fx({cleared:[0],before:[{special:'line',axis:'col'}]});
  assert.equal(effects[1].style.top,'320px');assert.equal(effects[1].style.height,'240px');
});

test('incremental animation frame score totals match final engine scores incl lucky stars',()=>{
  let moves=0;
  for(let seed=1;seed<=100;seed++){
    let n=seed;const rng=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296};
    let board=newBoard(6,6,rng);
    for(let turn=0;turn<20;turn++){
      const [a,b]=possibleMoves(board,6)[0],result=applyMove(board,6,a,b,6,rng,{luckyChance:.1});
      assert.equal(result.frames.reduce((sum,frame)=>sum+frame.score,0),result.score);
      board=result.board;moves++;
    }
  }
  assert.equal(moves,2000);
});
