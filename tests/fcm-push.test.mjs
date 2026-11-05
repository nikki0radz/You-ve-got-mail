import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createFcmSender} from '../push/fcm.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
test('push wake contains no parcel information and reuses its short-lived authorization',async()=>{
  const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const raw=new Uint8Array(await crypto.subtle.exportKey('pkcs8',keys.privateKey));
  const pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(raw).toString('base64')+'\n-----END PRIVATE KEY-----';
  const calls=[];const fetchImpl=async(url,options)=>{calls.push({url,options});return url.includes('oauth2')?new Response(JSON.stringify({access_token:'test-access',expires_in:3600}),{status:200}):new Response('{}',{status:200})};
  const send=createFcmSender({projectId:'pigeon-test',clientEmail:'sender@pigeon-test.iam.gserviceaccount.com',privateKey:pem,fetchImpl,clock:()=>1800000000000});
  const token='test-device-token-1234567890';await send(token);await send(token,{urgent:false});
  assert.equal(calls.filter(x=>x.url.includes('oauth2')).length,1);
  const messages=calls.filter(x=>x.url.includes('fcm.googleapis.com')).map(x=>JSON.parse(x.options.body).message);
  assert.deepEqual(messages[0].data,{type:'mail_available'});assert.equal(messages[0].android.priority,'HIGH');assert.equal(messages[1].android.priority,'NORMAL');
  assert.equal(messages[0].android.collapse_key,'mail');assert.equal(messages[0].token,token);
  assert.deepEqual(Object.keys(messages[0]).sort(),['android','data','token']);
});
