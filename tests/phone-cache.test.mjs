import test from 'node:test';import assert from 'node:assert/strict';
import {createPhoneCache} from '../post/phone-cache.mjs';
test('rendering cached mailbox state never calls the Android bridge',async()=>{
 let calls=0,changes=0;const seen=new Set();
 const phone={mailbox:()=>{calls++;return '[{"id":"a"},{"id":"b"}]';},friendsCached:()=>{calls++;return '{"friends":[{"name":"Owen"}]}';},wasRead:id=>{calls++;return seen.has(id);},markRead:id=>seen.add(id)};
 const cache=createPhoneCache({bridge:()=>phone,yieldControl:async()=>{},changed:()=>changes++});
 assert.equal(cache.ready(),false);await cache.refresh();const before=calls;
 for(let i=0;i<100;i++){cache.rows();cache.friends();cache.wasRead('a');}
 assert.equal(calls,before);assert.equal(cache.ready(),true);assert.equal(changes,1);
 cache.markRead('a');assert.equal(cache.wasRead('a'),true);await cache.refresh();assert.equal(seen.has('a'),true);
});
test('refreshes coalesce and unread updates from outside the app stay visible',async()=>{
 let reads=0,seen=false,updates=0;
 const cache=createPhoneCache({bridge:()=>({mailbox:()=>{reads++;return '[{"id":"a"}]';},friendsCached:()=>'{"friends":[]}',wasRead:()=>seen,markRead:()=>{seen=true;}}),yieldControl:async()=>{},changed:()=>updates++});
 await Promise.all([cache.refresh(),cache.refresh(),cache.refresh()]);assert.equal(reads,1);assert.equal(updates,1);
 await cache.refresh();assert.equal(updates,1);seen=true;await cache.refresh();assert.equal(updates,2);assert.equal(cache.wasRead('a'),true);
});
