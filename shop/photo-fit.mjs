import {artwork,clamp,geometry} from './studio-scene.mjs';
export async function readPhoto(file){
  if(!file)throw new Error('Choose a picture first.');
  const url=URL.createObjectURL(file),img=new Image();
  try{img.src=url;await img.decode();return img;}
  catch{throw new Error('That picture could not be opened. Try a JPG or PNG.');}
  finally{URL.revokeObjectURL(url);}
}
// A working copy keeps cancelled adjustments and replacement photos out of the parcel.
export function fitPhoto(host,item,initial,onApply,onCancel){
  const work={...initial};let sequence=0,load=0;
  host.innerHTML='<div class="studio-heading"><button class="studio-back" data-cancel>‹ Cancel</button><small>PHOTO STUDIO</small></div><h2>Fit your picture</h2><p class="studio-tip">The frame stays put. Drag your photo and pinch to zoom.</p><div class="crop-window" aria-label="Photo inside its fixed frame"></div><div class="crop-tools"><button data-minus aria-label="Zoom out">−</button><output></output><button data-plus aria-label="Zoom in">+</button></div><button class="studio-primary" data-ok>Happy with this ✓</button><button class="studio-link" data-replace>Replace photo</button><input type="file" accept="image/*" hidden><p role="alert" class="studio-error"></p>';
  const box=host.querySelector('.crop-window'),file=host.querySelector('input'),ok=host.querySelector('[data-ok]'),error=host.querySelector('[role=alert]');
  const g=geometry(item),[l,t,r,b]=item.opening;
  box.style.aspectRatio=g.width+'/'+g.height;
  box.style.width='min(100%,350px,'+(57*g.width/g.height)+'dvh)';
  const points=new Map();
  function metrics(){
    const [a,b]=[...points.values()];return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,span:Math.hypot(a.x-b.x,a.y-b.y)}:{...a,span:0};
  }
  async function paint(){
    const ticket=++sequence;
    try{const c=await artwork(item,work);if(ticket!==sequence||!box.isConnected)return;box.replaceChildren(c);host.querySelector('output').textContent=Math.round(work.zoom*100)+'%';}
    catch(e){if(ticket===sequence)error.textContent=e.message;}
  }
  function adjust(from,to,ratio){
    const rect=box.getBoundingClientRect(),pw=(r-l)*rect.width,ph=(b-t)*rect.height;
    const base=Math.max(pw/work.photo.width,ph/work.photo.height),old=base*work.zoom;
    const left=rect.left+l*rect.width,top=rect.top+t*rect.height;
    const ux=(from.x-left+(work.photo.width*old-pw)*work.panX)/old;
    const uy=(from.y-top+(work.photo.height*old-ph)*work.panY)/old;
    work.zoom=clamp(work.zoom*ratio,1,6);const scale=work.zoom*base;
    const pan=(delta,overflow)=>overflow>.01?clamp(delta/overflow,0,1):.5;
    work.panX=pan(ux*scale-(to.x-left),work.photo.width*scale-pw);
    work.panY=pan(uy*scale-(to.y-top),work.photo.height*scale-ph);paint();
  }
  const zoom=f=>{const rect=box.getBoundingClientRect(),pt={x:rect.left+(l+r)*rect.width/2,y:rect.top+(t+b)*rect.height/2};adjust(pt,pt,f);};
  box.onpointerdown=e=>{if(points.size===2)return;box.setPointerCapture(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});};
  box.onpointermove=e=>{if(!points.has(e.pointerId))return;const from=metrics();points.set(e.pointerId,{x:e.clientX,y:e.clientY});const to=metrics();adjust(from,to,from.span&&to.span?to.span/from.span:1);};
  box.onpointerup=box.onpointercancel=box.onlostpointercapture=e=>points.delete(e.pointerId);
  box.onwheel=e=>{e.preventDefault();const pt={x:e.clientX,y:e.clientY};adjust(pt,pt,Math.exp(-e.deltaY*.002));};
  host.querySelector('[data-minus]').onclick=()=>zoom(1/1.2);host.querySelector('[data-plus]').onclick=()=>zoom(1.2);
  host.querySelector('[data-cancel]').onclick=onCancel;ok.onclick=()=>onApply(work);
  host.querySelector('[data-replace]').onclick=()=>file.click();
  file.onchange=async()=>{if(!file.files[0])return;const ticket=++load;ok.disabled=true;
    try{const img=await readPhoto(file.files[0]);if(ticket!==load||!box.isConnected)return;Object.assign(work,{photo:img,zoom:1,panX:.5,panY:.5});error.textContent='';await paint();}
    catch(e){error.textContent=e.message;}finally{if(ticket===load)ok.disabled=false;file.value='';}
  };paint();
}
