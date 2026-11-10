import test from 'node:test';import assert from 'node:assert/strict';import {watchReceipt} from '../post/receipt-watch.mjs';
const settled=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(read){
 const timers=new Map();let seq=0,open=true,visible=true,notify;const values=[],errors=[];
 const watcher=watchReceipt({read,draw:r=>values.push(r),onError:e=>errors.push(e),active:()=>open,visible:()=>visible,
  subscribe:fn=>{notify=fn;return()=>{notify=null;};},setTimer:fn=>{timers.set(++seq,fn);return seq;},clearTimer:id=>timers.delete(id)});
 return {watcher,values,errors,timers,close:()=>{open=false;},visibility:v=>{visible=v;notify?.();},async tick(){const [id,fn]=timers.entries().next().value||[];if(fn){timers.delete(id);await fn();await settled();}}};
}
test('an open confirmation updates sent, delivered and seen without clicking Check status',async()=>{
 const states=[{sentAt:1},{sentAt:1,deliveredAt:2},{sentAt:1,deliveredAt:2,displayedAt:3}];let reads=0;
 const s=fixture(async()=>states[reads++]);await settled();assert.equal(s.values.length,1);
 await s.tick();assert.equal(s.values.at(-1).deliveredAt,2);await s.tick();assert.equal(s.values.at(-1).displayedAt,3);assert.equal(s.timers.size,0);
 s.watcher.stop();
});
test('background/closed panels do not poll, and a delayed answer cannot repaint a closed panel',async()=>{
 let reads=0,resolve;const s=fixture(()=>{reads++;return new Promise(done=>{resolve=done;});});await settled();
 const same=s.watcher.refresh();assert.equal(reads,1);s.close();resolve({deliveredAt:2});await same;assert.equal(s.values.length,0);assert.equal(s.timers.size,0);
 const hidden=fixture(async()=>({sentAt:++reads}));await settled();hidden.visibility(false);const previous=reads;await hidden.tick();assert.equal(reads,previous);hidden.visibility(true);await settled();assert.equal(reads,previous+1);hidden.watcher.stop();
});
test('a transient failure retries while keeping the last confirmed state',async()=>{
 let count=0;const s=fixture(async()=>{if(++count===2)throw Error('Offline');return {deliveredAt:count};});await settled();await s.tick();assert.equal(s.values.at(-1).deliveredAt,1);assert.equal(s.errors.length,1);await s.tick();assert.equal(s.values.at(-1).deliveredAt,3);s.watcher.stop();
});
