import {artwork} from './studio-scene.mjs';
import {drawCameraPhoto} from './camera-pixels.mjs';
export function openFrameCamera(item){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='frame-camera';dialog.setAttribute('aria-label','Take a photo inside your frame');
  dialog.innerHTML='<video autoplay muted playsinline></video><div class="live-frame-view" aria-label="Live camera with selected frame"></div><header><button type="button" data-cancel aria-label="Cancel camera">×</button><span data-status role="status">Opening camera…</span></header><footer><p>Double-tap the picture to switch cameras</p><div><button type="button" data-switch aria-label="Switch front and back cameras">⇄</button><button type="button" data-shutter aria-label="Take photo" disabled>📸</button><span aria-hidden="true"></span></div><p data-error role="alert"></p></footer>';
  document.body.append(dialog);dialog.showModal();
  const video=dialog.querySelector('video'),view=dialog.querySelector('.live-frame-view'),status=dialog.querySelector('[data-status]'),error=dialog.querySelector('[data-error]'),shutter=dialog.querySelector('[data-shutter]'),swap=dialog.querySelector('[data-switch]');
  const photo=document.createElement('canvas');let stream=null,facing='user',mirrored=true,closed=false,switching=false,drawing=false,lastFrame=0,lastTap=null,raf=0,cameraTicket=0;
  function stop(){stream?.getTracks().forEach(track=>track.stop());stream=null;}
  function close(file=null){if(closed)return;closed=true;cameraTicket++;stop();cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',hidden);dialog.close();dialog.remove();resolve(file);}
  function hidden(){if(document.hidden)close();}
  async function start(which,exact=false){
   const ticket=++cameraTicket;switching=true;shutter.disabled=true;swap.disabled=true;stop();status.textContent='Opening camera…';
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error('The camera is unavailable here. You can still upload a photo.');
    const next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:exact?{exact:which}:{ideal:which},width:{ideal:1280},height:{ideal:1920}}});
    if(closed||ticket!==cameraTicket){next.getTracks().forEach(track=>track.stop());return false;}
    stream=next;video.srcObject=stream;await video.play();
    if(!video.videoWidth)await new Promise((ok,no)=>{video.onloadedmetadata=ok;video.onerror=no;});
    if(closed||ticket!==cameraTicket)return false;
    const actual=stream.getVideoTracks()[0]?.getSettings().facingMode;facing=actual==='environment'?'environment':actual==='user'?'user':which;mirrored=facing==='user';
    status.textContent=mirrored?'Front camera':'Back camera';error.textContent='';shutter.disabled=false;return true;
   }catch(e){if(!closed){stop();status.textContent='Camera unavailable';error.textContent=e.name==='NotAllowedError'?'Allow camera access to take a photo. You can also close this and upload one.':e.name==='NotFoundError'||e.name==='OverconstrainedError'?'That camera is unavailable.':e.message||'The camera could not open.';}return false;
   }finally{if(!closed){switching=false;swap.disabled=false;}}
  }
  async function flip(){if(switching||closed)return;const previous=facing;if(!await start(previous==='user'?'environment':'user',true)&&!closed){const message=error.textContent;await start(previous);error.textContent=message;}}
  async function paint(time){
   if(closed)return;raf=requestAnimationFrame(paint);if(switching||drawing||!stream||video.readyState<2||time-lastFrame<67)return;
   drawing=true;lastFrame=time;
   try{
    drawCameraPhoto(video,mirrored,photo);
    const rendered=item?.maskSheet?await artwork(item,{photo,zoom:1,panX:.5,panY:.5},'',1.25):photo;
    if(!closed){if(item?.maskSheet)view.replaceChildren(rendered);else if(view.firstChild!==photo)view.replaceChildren(photo);}
   }catch(e){if(!closed)error.textContent=e.message;}finally{drawing=false;}
  }
  dialog.querySelector('[data-cancel]').onclick=()=>close();dialog.oncancel=e=>{e.preventDefault();close();};swap.onclick=flip;
  view.onpointerup=e=>{const now=performance.now();if(lastTap&&now-lastTap.time<350&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<48){lastTap=null;flip();}else lastTap={time:now,x:e.clientX,y:e.clientY};};
  shutter.onclick=async()=>{
   if(switching||shutter.disabled||closed)return;shutter.disabled=true;
   try{const saved=drawCameraPhoto(video,mirrored,document.createElement('canvas'));const blob=await new Promise(ok=>saved.toBlob(ok,'image/jpeg',.96));if(!blob)throw Error('The photo could not be saved.');if(!closed)close(new File([blob],'Selfie.jpg',{type:'image/jpeg'}));}
   catch(e){if(!closed){error.textContent=e.message;shutter.disabled=false;}}
  };
  if(item?.maskSheet)artwork(item,{photo:null,zoom:1,panX:.5,panY:.5},'',1.25).then(canvas=>{if(!closed&&!stream)view.replaceChildren(canvas);}).catch(()=>{});
  document.addEventListener('visibilitychange',hidden);raf=requestAnimationFrame(paint);start('user');
 });
}
