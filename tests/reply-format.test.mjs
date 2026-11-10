import test from 'node:test';import assert from 'node:assert/strict';
import {replyPreview,pictureReplyLabel,replyDestination} from '../post/reply-format.mjs';
import {wrapReplyText} from '../post/text-reply-image.mjs';
test('text replies stay text, known picture collections are labelled correctly, and legacy pictures stay neutral',()=>{
 assert.equal(replyPreview({isReply:true,text:'Hi Owen',hasImage:false}),'Hi Owen');
 assert.equal(replyPreview({isReply:true,hasImage:true}),'Picture reply');
 assert.equal(replyPreview({isReply:true}),'Reply');
 assert.equal(replyPreview({isReply:true,text:'null',hasImage:true}),'Picture reply');
 assert.equal(replyPreview({isReply:true,text:'null',nullChecked:true}),'null');
 assert.equal(pictureReplyLabel('Photos'),'Photo reply');assert.equal(pictureReplyLabel('Postcards'),'Postcard reply');assert.equal(pictureReplyLabel('Stickers'),'Sticker reply');
 assert.equal(replyPreview({isReply:true,text:pictureReplyLabel('Photos'),hasImage:true}),'Photo reply');
 assert.equal(replyPreview({kind:'a text reply',text:'Hello again'}),'Hello again');assert.equal(replyPreview({kind:'a text reply'}),'Text reply');
});
test('follow-ups use the reply author, with a safe fallback for older stored replies',()=>{
 const row={isReply:true,remote:true,sender:'Owen',senderCode:'ABCDEF1234',originalId:'original'};
 assert.deepEqual(replyDestination(row),{self:false,name:'Owen',code:'ABCDEF1234'});
 assert.equal(replyDestination({...row,senderCode:''},[{sent:true,id:'original',code:'ABCDEF1234'}]).code,'ABCDEF1234');
 assert.throws(()=>replyDestination({...row,senderCode:''}),/friend address/);
 assert.deepEqual(replyDestination({...row,remote:false}),{self:true,name:'Myself'});
});
test('text pop-ups wrap long words and keep emoji and line breaks intact',()=>{
 const measure=s=>[...s].length;
 assert.deepEqual(wrapReplyText('Hello Owen\nSee you',measure,10),['Hello Owen','See you']);
 assert.equal(wrapReplyText('abcdefghijk',measure,4).join(''),'abcdefghijk');
 assert.deepEqual(wrapReplyText('A👩‍❤️‍👩B',()=>1,10),['A👩‍❤️‍👩B']);
 assert.deepEqual(wrapReplyText('A\n\n\nB',measure,10),['A','','B']);
});
