import test from 'node:test';import assert from 'node:assert/strict';import {createProfilePublisher} from '../post/profile-publisher.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('a new selection during encoding replaces the obsolete picture before upload',async()=>{
 let release;const uploaded=[],states=[];
 const p=createProfilePublisher({supported:()=>true,encode:s=>s==='old'?new Promise(resolve=>{release=()=>resolve('encoded-old');}):Promise.resolve('encoded-'+s),publish:async photo=>uploaded.push(photo),changed:s=>states.push(s)});
 const first=p.update('old');p.update('latest');release();await first;
 assert.deepEqual(uploaded,['encoded-latest']);assert.equal(p.status(),'shared');assert.equal(states.at(-1),'shared');
});
test('a new choice while an upload is in flight is published immediately afterwards',async()=>{
 let release;const uploaded=[];
 const p=createProfilePublisher({supported:()=>true,encode:async s=>s,publish:async photo=>{uploaded.push(photo);if(photo==='first')await new Promise(resolve=>{release=resolve;});}});
 const first=p.update('first');await tick();p.update('second');release();await first;
 assert.deepEqual(uploaded,['first','second']);await p.update('second');assert.equal(uploaded.length,2);
});
test('failed uploads stay queued for retry and never claim that the picture was shared',async()=>{
 let online=false;const uploaded=[];
 const p=createProfilePublisher({supported:()=>true,encode:async s=>s,publish:async photo=>{if(!online)throw Error('Offline');uploaded.push(photo);}});
 assert.equal(await p.update('my-photo'),false);assert.equal(p.status(),'waiting');assert.equal(uploaded.length,0);
 online=true;assert.equal(await p.retry(),true);assert.equal(p.status(),'shared');assert.deepEqual(uploaded,['my-photo']);
});
test('failure of an old choice does not discard a newer queued selection',async()=>{
 let reject;const uploaded=[];
 const p=createProfilePublisher({supported:()=>true,encode:s=>s==='old'?new Promise((_,no)=>{reject=no;}):Promise.resolve(s),publish:async photo=>uploaded.push(photo)});
 const first=p.update('old');p.update('new');reject(Error('Bad old image'));await first;assert.deepEqual(uploaded,['new']);assert.equal(p.status(),'shared');
});
test('an unsupported app reports the need to update and can share after capability becomes available',async()=>{
 let supported=false;const uploaded=[];
 const p=createProfilePublisher({supported:()=>supported,encode:async s=>s,publish:async photo=>uploaded.push(photo)});
 assert.equal(await p.update('photo'),false);assert.equal(p.status(),'unsupported');assert.equal(uploaded.length,0);
 supported=true;await p.retry();assert.deepEqual(uploaded,['photo']);assert.equal(p.status(),'shared');
});
