import test from 'node:test';import assert from 'node:assert/strict';import {drawCameraPhoto} from '../shop/camera-pixels.mjs';
function canvas(){const calls=[];const ctx=Object.fromEntries(['setTransform','clearRect','translate','scale','drawImage'].map(name=>[name,(...args)=>calls.push([name,...args])]));return {width:0,height:0,calls,getContext:()=>ctx};}
test('front-camera preview and saved image use the same mirror transform without rotating or resizing',()=>{
 const video={videoWidth:720,videoHeight:1280};const preview=canvas(),saved=canvas();drawCameraPhoto(video,true,preview);drawCameraPhoto(video,true,saved);assert.deepEqual(preview.calls,saved.calls);assert.equal(saved.width,720);assert.equal(saved.height,1280);assert.deepEqual(saved.calls.slice(2,4),[['translate',720,0],['scale',-1,1]]);assert.deepEqual(saved.calls.at(-2),['drawImage',video,0,0,720,1280]);
});
test('rear camera stays unmirrored, including after switching from the front camera',()=>{
 const video={videoWidth:1280,videoHeight:720},output=canvas();drawCameraPhoto(video,true,output);output.calls.length=0;drawCameraPhoto(video,false,output);assert.deepEqual(output.calls[0],['setTransform',1,0,0,1,0,0]);assert.equal(output.calls.some(([name])=>name==='scale'||name==='translate'),false);assert.equal(output.width,1280);
});
test('a shutter cannot capture a camera that has not produced a frame',()=>{assert.throws(()=>drawCameraPhoto({videoWidth:0,videoHeight:0},false,canvas()),/Wait for the camera/);});
