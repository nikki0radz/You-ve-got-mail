import test from 'node:test';
import assert from 'node:assert/strict';
test('design access rechecks the owner code with the server and revokes rejected credentials',async()=>{
 const saved=new Map();globalThis.location={hostname:'example.com'};globalThis.window=new EventTarget();globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
 const originalFetch=globalThis.fetch;let calls=0,revoked=0;
 window.addEventListener('artwork-manager-locked',()=>revoked++);
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(options.method,'POST');assert.equal(options.cache,'no-store');assert(url.endsWith('/unlock'));const allowed=options.headers.Authorization==='Bearer VALID';return {ok:allowed,status:allowed?200:403,json:async()=>allowed?{ok:true}:{error:'Owner code required'}};};
 try{
  const {verifyManager}=await import('../shop/main-art.mjs');
  await assert.rejects(verifyManager(),/Owner code required/);
  saved.set('pigeon.main-art.owner','FORGED');await assert.rejects(verifyManager(),/Owner code required/);assert.equal(saved.has('pigeon.main-art.owner'),false);
  saved.set('pigeon.main-art.owner','VALID');assert.equal(await verifyManager(),true);assert.equal(calls,3);assert.equal(revoked,2);
 }finally{globalThis.fetch=originalFetch;delete globalThis.location;delete globalThis.window;delete globalThis.localStorage;}
});
