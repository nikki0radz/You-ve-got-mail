import test from 'node:test';import assert from 'node:assert/strict';
import {unreadCount} from '../post/unread.mjs';
test('Inbox count includes unread replies and deliveries, excludes read, sent and pending mail',()=>{
 const rows=[{id:'parcel',status:'received'},{id:'reply',isReply:true,status:'received'},{id:'seen',status:'received'},{id:'sent',sent:true},{id:'future',status:'scheduled'},{id:'cancelled',status:'cancelled'},{id:'closed',status:'rejected'}];
 const seen=new Set(['seen']);assert.equal(unreadCount(rows,id=>seen.has(id)),2);seen.add('reply');assert.equal(unreadCount(rows,id=>seen.has(id)),1);seen.add('parcel');assert.equal(unreadCount(rows,id=>seen.has(id)),0);
});
