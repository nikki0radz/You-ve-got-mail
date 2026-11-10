import test from 'node:test';import assert from 'node:assert/strict';
import {deliverySummary,deliveryTimeline,friendFacts} from '../post/mail-status.mjs';
test('sent waits for phone acknowledgement; notifications mean delivered and visible popups mean seen',()=>{
 assert.equal(deliverySummary({sentAt:100}).stage,'sent');
 for(const r of [{status:'acknowledged'},{lockedNotificationAt:100},{notificationAt:100},{outcome:'inbox'},{outcome:'rejected'}]){
  const result=deliverySummary(r);assert.equal(Boolean(result.seen),false);assert.equal(result.stage,'delivered');assert.match(result.label,/^Delivered to phone/);
 }
 for(const r of [{seenAt:200},{displayedAt:100},{outcome:'screen',outcomeAt:100}]){
  const result=deliverySummary(r);assert.equal(result.seen,true);assert.match(result.label,/^Seen/);
 }
 assert.equal(deliverySummary({seenAt:200,displayedAt:100}).label,deliverySummary({seenAt:100}).label);
 assert.equal(deliverySummary({outcome:'screen'}).label,'Seen');
 assert.equal(deliverySummary({status:'queued'},Date.now()+60000).stage,'scheduled');
});
test('timelines preserve separate timestamps, omit unknown times and order confirmed events',()=>{
 const rows=deliveryTimeline({sentAt:10,deliveredAt:30,notificationAt:20,seenAt:50});
 assert.deepEqual(rows.map(r=>r.at),[10,20,30,50]);assert.equal(rows.at(-1).label,'Seen');
 assert.equal(deliveryTimeline({status:'acknowledged'}).length,0);
});
test('reply seen applies only to the reply and never marks the original parcel seen',()=>{
 assert.equal(deliverySummary({replySeenAt:100},0,true).seen,true);
 assert.equal(deliverySummary({replySeenAt:100}).seen,undefined);
 assert.equal(deliverySummary({seenAt:100},0,true).seen,undefined);
});
test('friend profiles show only reported settings and never infer online or phone-lock state',()=>{
 const facts=friendFacts({mode:'inbox',settings:{notifications:false,popups:true,unapproved:'secret'},lastContactAt:100});
 assert.equal(facts[0][1],'Accepting mail · inbox only');assert.ok(facts.some(([k,v])=>k==='Delivery notifications'&&v==='Off'));
 assert.equal(facts.some(([k])=>/online|locked|secret/i.test(k)),false);
 assert.equal(friendFacts({mode:'closed'}).length,1);
});
