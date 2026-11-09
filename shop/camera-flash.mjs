export function hasCameraTorch(track){
 try{const torch=track?.getCapabilities?.().torch;return typeof track?.applyConstraints==='function'&&(torch===true||Array.isArray(torch)&&torch.includes(true));}catch{return false;}
}

export function waitForCameraFrame(video){
 if(!video.requestVideoFrameCallback)return new Promise(resolve=>setTimeout(resolve,80));
 return new Promise(resolve=>{
  // Some WebViews throttle callbacks for the off-screen source video.
  const timer=setTimeout(()=>{video.cancelVideoFrameCallback?.(ticket);resolve();},250);
  const ticket=video.requestVideoFrameCallback(()=>{clearTimeout(timer);resolve();});
 });
}

// Illuminate the subject, let exposure settle, then save a new camera frame.
// The white overlay never becomes part of the exported image.
export async function captureWithFlash({track,facing,enabled,screen,capture,active=()=>true,settle=()=>new Promise(resolve=>setTimeout(resolve,facing==='user'?1100:400)),linger=()=>new Promise(resolve=>setTimeout(resolve,300)),nextFrame=()=>Promise.resolve()}){
 if(!active())throw Error('The camera was closed.');
 if(!enabled)return capture();
 const selfie=facing==='user';let torchAttempted=false;
 try{
  if(selfie)await screen(true);
  else{
   if(!hasCameraTorch(track))throw Error('Back flash isn’t available in this camera view.');
   torchAttempted=true;await track.applyConstraints({advanced:[{torch:true}]});
   if(track.getSettings?.().torch===false)throw Error('The camera could not turn on its flash. Try again with flash off.');
  }
  await settle();
  if(!active())throw Error('The camera was closed.');
  await nextFrame();
  if(!active())throw Error('The camera was closed.');
  const image=await capture();
  if(selfie&&active())await linger();
  return image;
 }finally{
  if(selfie)await screen(false);
  if(torchAttempted)try{await track.applyConstraints({advanced:[{torch:false}]});}catch{track.stop();}
 }
}
