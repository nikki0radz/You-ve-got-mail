import test from 'node:test';
import assert from 'node:assert/strict';
import {hasCameraTorch,captureWithFlash,waitForCameraFrame} from '../shop/camera-flash.mjs';
function fixture({facing='environment',supported=true}={}){
 const events=[];let torch=false;
 const track={getCapabilities:()=>({torch:supported}),getSettings:()=>({torch}),applyConstraints:async({advanced})=>{torch=advanced[0].torch;events.push(torch?'torch on':'torch off');},stop:()=>events.push('stop')};
 return {events,track,options:{track,facing,enabled:true,screen:on=>events.push(on?'screen on':'screen off'),settle:async()=>events.push('settle'),nextFrame:async()=>events.push('new frame'),capture:()=>{events.push('capture');return 'photo';}}};
}
test('rear flash illuminates before capture and switches off afterwards',async()=>{
 const {events,options}=fixture();assert.equal(await captureWithFlash(options),'photo');
 assert.deepEqual(events,['torch on','settle','new frame','capture','torch off']);
});
test('selfie flash uses the screen while capturing the camera feed, and always clears',async()=>{
 const {events,options}=fixture({facing:'user',supported:false});
 await captureWithFlash(options);assert.deepEqual(events,['screen on','settle','new frame','capture','screen off']);
 events.length=0;options.capture=()=>{throw Error('No pixels');};
 await assert.rejects(captureWithFlash(options),/No pixels/);assert.equal(events.at(-1),'screen off');
});
test('flash off does not touch hardware or delay a photo',async()=>{
 const {events,options}=fixture();options.enabled=false;await captureWithFlash(options);assert.deepEqual(events,['capture']);
});
test('missing and explicitly unsupported hardware never claim to provide a flash',async()=>{
 assert.equal(hasCameraTorch({}),false);assert.equal(hasCameraTorch({getCapabilities:()=>{throw Error();}}),false);
 assert.equal(hasCameraTorch({getCapabilities:()=>({torch:[false,true]}),applyConstraints(){}}),true);
 const {events,options}=fixture({supported:false});await assert.rejects(captureWithFlash(options),/isn’t available/);assert.deepEqual(events,[]);
});
test('a driver that ignores flash on fails clearly and is reset',async()=>{
 const {events,track,options}=fixture();track.getSettings=()=>({torch:false});
 await assert.rejects(captureWithFlash(options),/could not turn on/);assert.deepEqual(events,['torch on','torch off']);
});
test('denied flash and failed photo capture both turn hardware flash off',async()=>{
 const {events,track,options}=fixture();const original=track.applyConstraints;
 track.applyConstraints=async c=>{await original(c);if(c.advanced[0].torch)throw Error('Denied');};
 await assert.rejects(captureWithFlash(options),/Denied/);assert.deepEqual(events,['torch on','torch off']);
 events.length=0;track.applyConstraints=original;options.capture=()=>{throw Error('Could not save');};
 await assert.rejects(captureWithFlash(options),/Could not save/);assert.equal(events.at(-1),'torch off');
});
test('closing during exposure never saves a late photo and clears both flash types',async()=>{
 for(const facing of ['user','environment']){
  const {events,options}=fixture({facing});let active=true;
  options.active=()=>active;options.settle=async()=>{active=false;};
  await assert.rejects(captureWithFlash(options),/closed/);
  assert.equal(events.includes('capture'),false);assert.equal(events.at(-1),facing==='user'?'screen off':'torch off');
 }
});
test('failed hardware shutdown stops the track to release the light',async()=>{
 const {events,track,options}=fixture();const original=track.applyConstraints;
 track.applyConstraints=async c=>{if(!c.advanced[0].torch)throw Error('Busy');await original(c);};
 await captureWithFlash(options);assert.equal(events.at(-1),'stop');
});
test('capture waits for a new video frame after exposure has settled',async()=>{
 let callback,cancelled=false;
 const pending=waitForCameraFrame({requestVideoFrameCallback:fn=>{callback=fn;return 1;},cancelVideoFrameCallback:()=>{cancelled=true;}});
 callback();await pending;assert.equal(cancelled,false);
});
test('off-screen video callback throttling cannot leave the flash stuck on',async()=>{
 let cancelled=false;await waitForCameraFrame({requestVideoFrameCallback:()=>7,cancelVideoFrameCallback:ticket=>{assert.equal(ticket,7);cancelled=true;}});assert.equal(cancelled,true);
});
