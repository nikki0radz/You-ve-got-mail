import {loadSheet} from './compositor.mjs';
import {prepareSharedFrame} from './shared-designs.mjs';

let cat;
export async function stockCatPhoto(){
  if(cat)return cat;
  const source=await loadSheet('assets/guest/wheel-031.webp');
  // The bundled instant-print preview contains the original stock photo inside its border.
  const crop=document.createElement('canvas');
  crop.width=141;crop.height=120;
  crop.getContext('2d').drawImage(source,25,29,141,120,0,0,141,120);
  cat=crop;
  return cat;
}

async function photoThumbnail(item){
  const art=new Image();
  art.crossOrigin='anonymous';art.src=item.master;
  await art.decode();
  const prepared=await prepareSharedFrame(item,art);
  const mask=new Image();
  mask.src=prepared.maskSheet;
  const [photo]=await Promise.all([stockCatPhoto(),mask.decode()]);
  const scale=Math.min(1,480/Math.max(art.naturalWidth,art.naturalHeight));
  const canvas=document.createElement('canvas');
  const width=canvas.width=Math.max(1,Math.round(art.naturalWidth*scale));
  const height=canvas.height=Math.max(1,Math.round(art.naturalHeight*scale));
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingQuality='high';
  const [l,t,r,b]=prepared.opening;
  const w=(r-l)*width,h=(b-t)*height,fit=Math.max(w/photo.width,h/photo.height);
  const dw=photo.width*fit,dh=photo.height*fit;
  ctx.drawImage(photo,l*width+(w-dw)/2,t*height+(h-dh)/2,dw,dh);
  ctx.globalCompositeOperation='destination-in';
  ctx.drawImage(mask,0,0,width,height);
  ctx.globalCompositeOperation=prepared.photoOnTop?'destination-over':'source-over';
  ctx.drawImage(art,0,0,width,height);
  return canvas.toDataURL('image/webp',.94);
}

// Decode one uploaded original at a time. Only small, finished previews are retained.
const thumbnails=new Map();
let pending=Promise.resolve();
export function displayPhotoThumbnail(image,item){
  const key=JSON.stringify([item.master,item.kind,item.photoArea,item.textBox]);
  const cached=thumbnails.get(key);
  if(cached){image.src=cached;return;}
  pending=pending.then(async()=>{
    if(!image.isConnected)return;
    let src=thumbnails.get(key);
    if(!src){
      src=await photoThumbnail(item);
      if(thumbnails.size>=36)thumbnails.delete(thumbnails.keys().next().value);
      thumbnails.set(key,src);
    }
    if(image.isConnected)image.src=src;
  }).catch(()=>{if(image.isConnected)image.src=item.master;});
}
