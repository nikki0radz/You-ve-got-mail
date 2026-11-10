import {artwork} from './studio-scene.mjs';
import {drawCameraPhoto} from './camera-pixels.mjs';
import {captureWithFlash,hasCameraTorch,waitForCameraFrame} from './camera-flash.mjs';
import {beautyEnabled} from './beauty-pref.mjs';
import {createBeautyCamera} from './beauty-camera.mjs';
import {createScreenFlash} from './screen-flash.mjs';
import {minimumCameraZoom,drawCameraZoom} from './camera-zoom.mjs';
export function openFrameCamera(item){
 return new Promise(resolve=>{
  if(!document.querySelector('link[data-camera-flash-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./camera-flash.css',import.meta.url);style.dataset.cameraFlashStyle='';document.head.append(style);}
  const dialog=document.createElement('dialog');dialog.className='frame-camera';dialog.setAttribute('aria-label','Take a photo inside your frame');
  dialog.innerHTML='<video autoplay muted playsinline></video><div class="live-frame-view" aria-label="Live camera with selected frame"></div><div data-screen-flash hidden aria-hidden="true"></div><header><button type="button" data-cancel aria-label="Cancel camera">×</button><span class="camera-readout"><span data-status role="status">Opening camera…</span><small data-beauty-status role="status"></small></span></header><footer><p>Double-tap the picture to switch cameras</p><div><button type="button" data-switch aria-label="Switch front and back cameras">⇄</button><button type="button" data-shutter aria-label="Take photo" disabled>📸</button><button type="button" data-flash aria-label="Screen flash" aria-pressed="false" disabled><span aria-hidden="true">⚡</span><small>Off</small></button></div><p data-flash-hint role="status"></p><p data-error role="alert"></p></footer>';
  const zoomControl=document.createElement('label');zoomControl.className='camera-zoom';
  zoomControl.innerHTML='<span>Zoom out</span><input type="range" min="1" max="3" step="any" value="1" aria-label="Camera zoom" disabled><span>Zoom in</span><output>1×</output>';
  dialog.querySelector('footer').prepend(zoomControl);
  document.body.append(dialog);dialog.showModal();
  const video=dialog.querySelector('video'),view=dialog.querySelector('.live-frame-view'),status=dialog.querySelector('[data-status]'),error=dialog.querySelector('[data-error]'),shutter=dialog.querySelector('[data-shutter]'),swap=dialog.querySelector('[data-switch]');
  const flash=dialog.querySelector('[data-flash]'),flashLabel=flash.querySelector('small'),flashHint=dialog.querySelector('[data-flash-hint]'),screenFlash=dialog.querySelector('[data-screen-flash]');
  const flashOn={user:false,environment:false};
  const zoomSlider=zoomControl.querySelector('input'),zoomLabel=zoomControl.querySelector('output');
  const framedPhoto=document.createElement('canvas');let zoom=1;
  function updateZoom(){zoomSlider.disabled=switching||capturing||!stream;zoomSlider.value=String(zoom);const label=Number(zoom.toFixed(2))+'×';zoomLabel.textContent=label;zoomSlider.setAttribute('aria-valuetext',label);}
  zoomSlider.oninput=()=>{zoom=Math.max(Number(zoomSlider.min),Math.min(3,Number(zoomSlider.value)));updateZoom();};
  const photo=document.createElement('canvas');let stream=null,facing='user',mirrored=true,closed=false,switching=false,capturing=false,drawing=false,lastFrame=0,lastTap=null,raf=0,cameraTicket=0;
  let brightFlash=false;try{brightFlash=Boolean(JSON.parse(window.Pigeon?.deliveryPrefs?.()||'{}').screenFlashBrightness);}catch{}
  const beauty=beautyEnabled()?createBeautyCamera(message=>{if(!closed){const label=dialog.querySelector('[data-beauty-status]');if(label.textContent!==message)label.textContent=message;}}):null;
  if(!beauty)dialog.querySelector('[data-beauty-status]').textContent='Natural filter · Off';
  const screenLight=createScreenFlash({bridge:window.Pigeon,eventTarget:window,show:on=>{screenFlash.hidden=!on;},active:()=>!closed,boost:brightFlash});
  function updateFlash(){
   const available=facing==='user'||hasCameraTorch(stream?.getVideoTracks()[0]);
   flash.disabled=switching||capturing||!stream||!available;
   flash.setAttribute('aria-label',facing==='user'?'Screen flash':'Back camera flash');flash.setAttribute('aria-pressed',String(available&&flashOn[facing]));
   flashLabel.textContent=available?(flashOn[facing]?'On':'Off'):'N/A';
   flashHint.textContent=!stream?'':!available?'Back flash isn’t available in this camera view.':flashOn[facing]?(facing==='user'?(brightFlash?'Warm screen flash · brightness boost':'Warm screen flash'):'Flash fires when you take the photo.'):'';
  }
  function stop(){stream?.getTracks().forEach(track=>track.stop());stream=null;}
  function close(file=null){if(closed)return;closed=true;cameraTicket++;screenLight(false);beauty?.close();stop();cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',hidden);dialog.close();dialog.remove();resolve(file);}
  function hidden(){if(document.hidden)close();}
  async function start(which,exact=false){
   const ticket=++cameraTicket;switching=true;shutter.disabled=true;swap.disabled=true;stop();updateFlash();updateZoom();status.textContent='Opening camera…';
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error('The camera is unavailable here. You can still upload a photo.');
    const next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:exact?{exact:which}:{ideal:which},width:{ideal:1280},height:{ideal:1920}}});
    if(closed||ticket!==cameraTicket){next.getTracks().forEach(track=>track.stop());return false;}
    stream=next;video.srcObject=stream;await video.play();
    if(!video.videoWidth)await new Promise((ok,no)=>{video.onloadedmetadata=ok;video.onerror=no;});
    if(closed||ticket!==cameraTicket)return false;
    const actual=stream.getVideoTracks()[0]?.getSettings().facingMode;facing=actual==='environment'?'environment':actual==='user'?'user':which;mirrored=facing==='user';
    zoom=1;zoomSlider.min=String(minimumCameraZoom(item,video.videoWidth,video.videoHeight));
    status.textContent=mirrored?'Front camera':'Back camera';error.textContent='';shutter.disabled=false;return true;
   }catch(e){if(!closed){stop();status.textContent='Camera unavailable';error.textContent=e.name==='NotAllowedError'?'Allow camera access to take a photo. You can also close this and upload one.':e.name==='NotFoundError'||e.name==='OverconstrainedError'?'That camera is unavailable.':e.message||'The camera could not open.';}return false;
   }finally{if(!closed){switching=false;swap.disabled=false;updateFlash();updateZoom();}}
  }
  async function flip(){if(switching||capturing||closed)return;const previous=facing;if(!await start(previous==='user'?'environment':'user',true)&&!closed){const message=error.textContent;await start(previous);error.textContent=message;}}
  async function paint(time){
   if(closed)return;raf=requestAnimationFrame(paint);if(switching||capturing||drawing||!stream||video.readyState<2||time-lastFrame<67)return;
   drawing=true;lastFrame=time;
   try{
    drawCameraPhoto(video,mirrored,photo,beauty?720:Infinity);
    const ticket=cameraTicket;if(beauty?.ready)await beauty.apply(photo);
    if(closed||ticket!==cameraTicket||capturing)return;
    drawCameraZoom(photo,zoom,framedPhoto);
    const rendered=item?.maskSheet?await artwork(item,{photo:framedPhoto,zoom:1,panX:.5,panY:.5},'',1.25):framedPhoto;
    if(!closed){if(item?.maskSheet)view.replaceChildren(rendered);else if(view.firstChild!==photo)view.replaceChildren(photo);}
   }catch(e){if(!closed)error.textContent=e.message;}finally{drawing=false;}
  }
  dialog.querySelector('[data-cancel]').onclick=()=>close();dialog.oncancel=e=>{e.preventDefault();close();};swap.onclick=flip;
  flash.onclick=()=>{if(flash.disabled)return;flashOn[facing]=!flashOn[facing];error.textContent='';updateFlash();};
  view.onpointerup=e=>{const now=performance.now();if(lastTap&&now-lastTap.time<350&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<48){lastTap=null;flip();}else lastTap={time:now,x:e.clientX,y:e.clientY};};
  shutter.onclick=async()=>{
   if(switching||capturing||shutter.disabled||closed)return;capturing=true;shutter.disabled=true;swap.disabled=true;updateFlash();updateZoom();error.textContent='';status.textContent='Taking photo…';
   const track=stream?.getVideoTracks()[0],ticket=cameraTicket;
   try{const saved=await captureWithFlash({track,facing,enabled:flashOn[facing]&&(facing==='user'||hasCameraTorch(track)),screen:screenLight,active:()=>!closed&&ticket===cameraTicket, nextFrame:()=>waitForCameraFrame(video),capture:()=>drawCameraPhoto(video,mirrored,document.createElement('canvas'))});if(beauty){status.textContent='Finishing natural filter…';await beauty.waitUntilReady();if(!closed)await beauty.apply(saved);}if(closed)return;const framed=drawCameraZoom(saved,zoom,document.createElement('canvas')),type=zoom<1?'image/png':'image/jpeg',extension=zoom<1?'png':'jpg';const blob=await new Promise(ok=>framed.toBlob(ok,type,.96));if(!blob)throw Error('The photo could not be saved.');if(!closed)close(new File([blob],(facing==='user'?'Selfie.':'Photo.')+extension,{type}));}
   catch(e){if(!closed){if(track?.readyState==='ended')await start(facing);error.textContent=e.message;shutter.disabled=!stream;status.textContent=stream?(mirrored?'Front camera':'Back camera'):'Camera unavailable';}}
   finally{capturing=false;if(!closed){swap.disabled=false;updateFlash();updateZoom();}}
  };
  if(item?.maskSheet)artwork(item,{photo:null,zoom:1,panX:.5,panY:.5},'',1.25).then(canvas=>{if(!closed&&!stream)view.replaceChildren(canvas);}).catch(()=>{});
  document.addEventListener('visibilitychange',hidden);raf=requestAnimationFrame(paint);start('user');
 });
}
