import test from 'node:test';import assert from 'node:assert/strict';
import {resolveReplyContent} from '../post/reply-content.mjs';
const picture='data:image/png;base64,AAAA',row={remote:true,originalId:'parcel',hasImage:true,text:''};
test('saved pictures and text open without a network request',async()=>{
 let requests=0;const deps={loadPicture:async()=>'/saved.png',fetchReceipt:async()=>{requests++;throw Error('Offline');}};
 assert.equal((await resolveReplyContent(row,deps)).image,'/saved.png');
 assert.equal((await resolveReplyContent({...row,hasImage:false,text:'Hello'},deps)).text,'Hello');assert.equal(requests,0);
});
test('missing saved pictures and old null entries download the actual picture',async()=>{
 let requests=0;const deps={loadPicture:async()=>{throw Error('Missing file');},fetchReceipt:async()=>{requests++;return {reply:null,replyImage:picture};}};
 assert.equal((await resolveReplyContent({...row,text:'Caption'},deps)).image,picture);
 const repaired=await resolveReplyContent({...row,hasImage:false,text:'null'},deps);assert.equal(repaired.text,'');assert.equal(repaired.image,picture);assert.equal(requests,2);
});
test('Refresh explicitly fetches a new copy and keeps saved mail when offline',async()=>{
 const fresh=await resolveReplyContent(row,{force:true,loadPicture:async()=>'/saved.png',fetchReceipt:async()=>({reply:'New caption',replyImage:picture})});assert.equal(fresh.text,'New caption');assert.equal(fresh.image,picture);
 const offline=await resolveReplyContent(row,{force:true,loadPicture:async()=>'/saved.png',fetchReceipt:async()=>{throw Error('Offline');}});assert.equal(offline.image,'/saved.png');assert.match(offline.warning,/saved on this phone/);
});
test('unavailable content has a retry explanation and a deliberate null note is preserved',async()=>{
 const unavailable=await resolveReplyContent({...row,hasImage:false,text:'null'},{fetchReceipt:async()=>{throw Error('Offline');}});assert.equal(unavailable.image,'');assert.equal(unavailable.text,'');assert.match(unavailable.warning,/Refresh reply/);
 const typed=await resolveReplyContent({...row,hasImage:false,text:'null',nullChecked:true},{fetchReceipt:()=>{throw Error('Should not fetch');}});assert.equal(typed.text,'null');
});
