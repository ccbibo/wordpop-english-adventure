import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function isLocalInvite('),source.indexOf('async function multi('));
function context(href='http://127.0.0.1:8773/?view=map&token=private&password=secret'){
 const c={URL,location:new URL(href)};vm.createContext(c);vm.runInContext(helpers,c);return c;
}
test('room invitation contains only the public room identifier and destination',()=>{
 const c=context(),id='a'.repeat(48),url=new URL(c.inviteUrl(id));
 assert.equal(url.pathname,'/');assert.equal(url.searchParams.get('view'),'multi');assert.equal(url.searchParams.get('room'),id);
 assert.deepEqual([...url.searchParams.keys()],['view','room']);assert.equal(c.isLocalInvite(),true);
 assert.equal(context('https://words.example/game/').isLocalInvite(),false);
});
test('invitation accepts a code or same-service link, rejects malformed and other-service inputs',()=>{
 const c=context(),id='ab'.repeat(24);assert.equal(c.roomIdFromInput(' '+id.toUpperCase()+' '),id);
 assert.equal(c.roomIdFromInput(c.inviteUrl(id)),id);
 for(const value of ['', 'cat', 'javascript:alert(1)', '<img src=x>', 'a'.repeat(47), 'z'.repeat(48)])assert.throws(()=>c.roomIdFromInput(value));
 assert.throws(()=>c.roomIdFromInput('https://other.example/?room='+id),/另一個服務/);
 assert.throws(()=>c.roomIdFromInput('http://127.0.0.1:8773/?room=bad'),/格式/);
});
