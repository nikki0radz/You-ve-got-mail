import test from 'node:test';
import assert from 'node:assert/strict';
import {minimumCameraZoom,drawCameraZoom} from '../shop/camera-zoom.mjs';
const frame=(width,height,opening=[0,0,1,1])=>({maskSheet:'mask.png',rect:[0,0,width,height],opening});
test('zoom out fits the full sensor image inside portrait, landscape and inset frame openings',()=>{
 for(const item of [frame(200,1000),frame(1000,200),frame(800,1000,[.1,.2,.9,.8]),frame(400,400)]){
  for(const [w,h] of [[720,1280],[1280,720]]){
   const [l,t,r,b]=item.opening,pw=item.rect[2]*(r-l),ph=item.rect[3]*(b-t);
   const zoom=minimumCameraZoom(item,w,h),fit=Math.max(pw/w,ph/h)*zoom;
   assert.ok(zoom>0&&zoom<=1);
   assert.ok(w*fit<=pw+1e-8&&h*fit<=ph+1e-8,'full camera image fits');
   assert.ok(Math.min(Math.abs(w*fit-pw),Math.abs(h*fit-ph))<1e-8,'one edge meets the opening');
  }
 }
});
test('plain photos and matching openings start at the complete uncropped camera view',()=>{
 assert.equal(minimumCameraZoom(null,720,1280),1);
 assert.equal(minimumCameraZoom(frame(720,1280),720,1280),1);
 assert.equal(minimumCameraZoom(frame(0,0),720,1280),1);
});
test('camera framing preserves capture resolution and clears transparent zoom-out padding',()=>{
 const calls=[],ctx={setTransform:(...args)=>calls.push(['reset',...args]),clearRect:(...args)=>calls.push(['clear',...args]),drawImage:(...args)=>calls.push(['draw',...args])};
 const canvas={width:0,height:0,getContext:()=>ctx},source={width:1080,height:1920};
 for(const zoom of [.5,1,3]){
  calls.length=0;assert.equal(drawCameraZoom(source,zoom,canvas),canvas);
  assert.equal(canvas.width,1080);assert.equal(canvas.height,1920);
  assert.deepEqual(calls[1],['clear',0,0,1080,1920]);
  const [,image,x,y,w,h]=calls[2];assert.equal(image,source);
  assert.equal(x+w/2,540);assert.equal(y+h/2,960);assert.equal(w/h,1080/1920);
 }
});
