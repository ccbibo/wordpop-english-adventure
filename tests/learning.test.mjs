import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {themes} from '../dist/words.js';
import {findMatches} from '../dist/engine.js';
const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const quizSource=source.slice(source.indexOf('function quiz('),source.indexOf('\nfunction report('));
const expected=['動物園','水果','顏色','數字','交通工具','學校','家庭與住屋','蔬菜','服裝','夜市','天氣','海洋生物','運動','餐廳','公園','情緒','職業','方位介詞','動作動詞','休閒嗜好'];
const key=w=>w.en+'::'+w.zh;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function quizHarness(words=themes.flatMap(t=>t.words)){
  const elements=new Map(),ctx={themes,allWords:()=>words,wordKey:key,esc:escape,data:{review:{},quiz:{},unlocked:1},Math:Object.create(Math),sound:()=>{},save:()=>{},speak:()=>{},addReview:w=>ctx.data.review[key(w)]=w};
  let choices=[];
  ctx.modal=html=>{ctx.html=html;choices=[...html.matchAll(/data-answer="([^"]+)"/g)].map(m=>({dataset:{answer:m[1]},disabled:false}));};
  ctx.document={querySelectorAll:selector=>selector==='[data-answer]'?choices:[]};
  ctx.$=selector=>{if(!elements.has(selector))elements.set(selector,{innerHTML:'',onclick:null});return elements.get(selector)};
  ctx.Math.random=()=>.5;
  vm.createContext(ctx);vm.runInContext(quizSource,ctx);
  return {ctx,get choices(){return choices}};
}
test('the requested twenty subjects and eighty distinct level addresses exist',()=>{
  assert.deepEqual(themes.map(t=>t.name),expected);assert.equal(themes.length*4,80);
  const addresses=themes.flatMap((t,i)=>[1,2,3,4].map(n=>({level:i*4+n,theme:t.name,boss:n===4})));
  assert.equal(new Set(addresses.map(a=>a.level)).size,80);assert.equal(addresses.filter(a=>a.boss).length,20);
});
test('all 120 family entries are complete and each theme has six distinct meanings',()=>{
  assert.equal(themes.flatMap(t=>t.words).length,120);
  for(const theme of themes){assert.equal(theme.words.length,6);assert.equal(new Set(theme.words.map(key)).size,6);for(const w of theme.words){assert.match(w.en,/^[a-z]+(?: [a-z]+)*$/);assert.ok(w.zh.length>0&&w.emoji.length>0);}}
});
test('each subject supports all 27 picture/English/Chinese combinations as the same family',()=>{
  for(const theme of themes)for(let x=0;x<3;x++)for(let y=0;y<3;y++)for(let z=0;z<3;z++){
    const board=[0,0,0,1,2,1,2,1,2].map((family,i)=>({family,type:[x,y,z][i]??0,special:null,ice:0,lock:0}));
    assert.equal(theme.words[board[0].family],theme.words[board[2].family]);assert.deepEqual(findMatches(board,3),[[0,1,2]]);
    board[1].family=1;assert.equal(findMatches(board,3).length,0);
  }
});
test('orange fruit and color remain independent during a real quiz answer',()=>{
  const fruit=themes[1].words.find(w=>w.en==='orange'),color=themes[2].words.find(w=>w.en==='orange');assert.equal(fruit.zh,'柳橙');assert.equal(color.zh,'橘色');
  const h=quizHarness();h.ctx.data.review[key(fruit)]={...fruit};h.ctx.data.review[key(color)]={...color};
  h.ctx.quiz(color);assert.match(h.ctx.html,/「橘色」的英文是/);h.choices.find(c=>c.dataset.answer==='orange').onclick();
  assert.equal(h.ctx.data.quiz[key(color)].right,1);assert.equal(h.ctx.data.quiz[key(fruit)],undefined);assert.ok(h.ctx.data.review[key(fruit)]);assert.equal(h.ctx.data.review[key(color)],undefined);
});
test('quiz options cannot repeat an English label even when subjects reuse a word',()=>{
  const target={en:'cat',zh:'貓',emoji:'🐱'},swim={en:'swimming',zh:'游泳',emoji:'🏊'};
  const h=quizHarness([target,swim,{...swim},{en:'dog',zh:'狗',emoji:'🐶'},{en:'bird',zh:'鳥',emoji:'🐦'}]);
  h.ctx.quiz(target);const labels=h.choices.map(c=>c.dataset.answer);assert.equal(labels.length,4);assert.equal(new Set(labels).size,4);
});
test('game records do not diagnose language mistakes or silently increment quiz accuracy',()=>{
  const move=source.slice(source.indexOf('async function move('),source.indexOf('\nfunction combo('));
  assert.ok(!move.includes('addReview('));assert.ok(!move.includes('data.quiz'));
  assert.ok(source.includes('接觸次數不等於已學會'));assert.ok(source.includes('遊戲的錯誤交換不代表單字答錯'));
});
test('twenty themed route stations are directly selectable without previous/next controls',()=>{
  const functions=source.slice(source.indexOf('function map('),source.indexOf('\nfunction config('));let html='',opened;const nodes=new Map();
  const context={themes,themeIndex:0,data:{stars:{}},character:()=>({name:'小狐狸',icon:'🦊',color:'#eee'}),esc:String,heading:()=>'',shell:s=>html=s,chooseCharacter(){},preview:(level,practice)=>opened={level,practice},bindCommon(){},document:{querySelectorAll:()=>[]},$:selector=>{if(!nodes.has(selector))nodes.set(selector,{style:{},getTotalLength:()=>3000,getPointAtLength:n=>({x:162,y:n})});return nodes.get(selector)}};
  vm.createContext(context);vm.runInContext(functions,context);context.map();
  for(let i=0;i<20;i++){assert.ok(html.includes(`data-chapter="${i}"`));assert.ok(html.includes(`第 ${i+1} 章 ${themes[i].name}`));}
  assert.ok(!html.includes('prev-world'));assert.ok(!html.includes('next-world'));
  context.themeIndex=1;context.renderJourneyAside();assert.ok(nodes.get('#journey-aside').innerHTML.includes('第 2 章 · 水果'));
  nodes.get('#journey-play').onclick();assert.equal(opened.level,5);assert.equal(opened.practice,undefined);
  nodes.get('#practice-world').onclick();assert.deepEqual(opened,{level:5,practice:true});
  const cards=source.slice(source.indexOf('function wordCards('),source.indexOf('\nconst allWords='));assert.ok(cards.includes('wordKey(w)'));
});
test('vegetable naming and color-learning backgrounds agree with their meaning',()=>{
  assert.equal(themes[7].words.find(w=>w.en==='broccoli').zh,'青花菜');
  const paletteExpression=source.match(/const content=.*?,col=(.*?);/)[1];
  const hues=[0,210,50,90,265,30];
  function hue(hex){const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255),hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;if(!d)return 0;return ((hi===r?(g-b)/d:hi===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360;}
  for(let family=0;family<6;family++){
    const actual=vm.runInNewContext(paletteExpression,{data:{settings:{color:true}},g:{level:9},tile:{family},colors:[]});
    const delta=Math.abs(hue(actual)-hues[family]);assert.ok(Math.min(delta,360-delta)<=25,`${themes[2].words[family].en} background hue ${hue(actual)}`);
  }
});
test('a wrong vocabulary response records only its actual meaning and never records a correct response',()=>{
  const target=themes[2].words.find(w=>w.en==='orange'),other=themes[1].words.find(w=>w.en==='orange'),h=quizHarness();
  h.ctx.quiz(target);h.choices.find(c=>c.dataset.answer!=='orange').onclick();
  assert.equal(h.ctx.data.quiz[key(target)].wrong,1);assert.equal(h.ctx.data.quiz[key(target)].right,0);assert.ok(h.ctx.data.review[key(target)]);assert.equal(h.ctx.data.review[key(other)],undefined);
});
