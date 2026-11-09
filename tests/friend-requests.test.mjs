import test from 'node:test';
import assert from 'node:assert/strict';
import {incomingRequests,withPracticeFriend,createRequestPrompts,practiceCode} from '../post/friend-state.mjs';
test('only distinct incoming requests count; outgoing requests and accepted friends do not',()=>{
 const book={incoming:[{code:'a'},null,{code:'a'},{code:'b'},{}],outgoing:[{code:'c'}],friends:[{code:'d'}]};
 assert.deepEqual(incomingRequests(book).map(r=>r.code),['a','b']);
});
test('the practice request never modifies real contacts and acceptance only adds a labelled practice friend',()=>{
 const book={incoming:[{code:'real'}],friends:[{code:'friend'}]};
 const pending=withPracticeFriend(book,{status:'pending',id:'test1'});assert.equal(incomingRequests(pending).length,2);assert.equal(pending.incoming[1].simulated,true);
 const accepted=withPracticeFriend(book,{status:'accepted',id:'test1'});assert.equal(accepted.incoming.length,1);assert.equal(accepted.friends[1].code,practiceCode);assert.equal(accepted.friends[1].simulated,true);
 assert.equal(book.incoming.length,1);assert.equal(book.friends.length,1);assert.equal(withPracticeFriend(book,null).incoming.length,1);
});
test('requests defer while editing, show once per app visit, and remain pending when dismissed',()=>{
 let available=false;const pending=[{code:'a'},{code:'b'}],opened=[];
 const prompts=createRequestPrompts({requests:()=>pending,available:()=>available,open:r=>opened.push(r.code)});
 assert.equal(prompts.pump(),false);available=true;prompts.pump();prompts.pump();assert.deepEqual(opened,['a','b']);
 assert.equal(prompts.pump(),false);assert.equal(pending.length,2);
 prompts.reset();prompts.pump();assert.deepEqual(opened,['a','b','a']);
 pending.splice(0,1);prompts.pump();assert.equal(opened.at(-1),'b');
});
test('a repeated simulation is a new prompt, while a repeated snapshot is not',()=>{
 let request={code:practiceCode,id:'first'};const opened=[];
 const prompts=createRequestPrompts({requests:()=>[request],available:()=>true,open:r=>opened.push(r.id)});
 prompts.pump();prompts.pump();request={code:practiceCode,id:'second'};prompts.pump();assert.deepEqual(opened,['first','second']);
});
test('resolving a request permits a later new request from the same person to open',()=>{
 let pending=[{code:'a'}],available=true;const opened=[];
 const prompts=createRequestPrompts({requests:()=>pending,available:()=>available,open:r=>opened.push(r.code)});
 prompts.pump();pending=[];available=false;prompts.pump();pending=[{code:'a'}];available=true;prompts.pump();assert.deepEqual(opened,['a','a']);
});
