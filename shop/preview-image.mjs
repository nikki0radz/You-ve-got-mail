import {idleTurn} from './ui-tasks.mjs';
const thumbnails=new Map(),fitted=new WeakSet(),tasks=new WeakMap();let pending=Promise.resolve();
export function fitPreview(image){
 if(tasks.has(image))return tasks.get(image);
 const small=Boolean(image.closest('.parcel-thumb')),source=image.src;if(small&&fitted.has(image))return Promise.resolve();
 if(small&&thumbnails.has(source)){image.src=thumbnails.get(source);return Promise.resolve();}
 const task=pending.then(async()=>{if(!image.isConnected)return;await idleTurn();if(!image.isConnected)return;await trimPreview(image,small);if(small)fitted.add(image);if(small&&image.src!==source){if(thumbnails.size>=80)thumbnails.delete(thumbnails.keys().next().value);thumbnails.set(source,image.src);}}).finally(()=>tasks.delete(image));tasks.set(image,task);
 pending=task.catch(()=>{});return task;
}
// Sending keeps full placement geometry; only the visible preview is trimmed.
async function trimPreview(image,small){
  try{
    await image.decode();
    if(!image.isConnected)return;
    const scale=Math.min(1,(small?192:800)/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');
    const w=canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    const h=canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0,w,h);
    const {data}=ctx.getImageData(0,0,w,h);
    let left=w,right=-1,top=h,bottom=-1;
    for(let y=0;y<h;y++){if(y%48===0){await idleTurn();if(!image.isConnected)return;}for(let x=0;x<w;x++){
      if(data[(y*w+x)*4+3]<12)continue;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    }
    if(right<left||bottom<top||(left<2&&top<2&&right>=w-2&&bottom>=h-2))return;
    const cropped=document.createElement('canvas');
    const sx=image.naturalWidth/w,sy=image.naturalHeight/h;
    const x=Math.max(0,Math.floor((left-1)*sx)),y=Math.max(0,Math.floor((top-1)*sy));
    const width=Math.min(image.naturalWidth,Math.ceil((right+2)*sx))-x;
    const height=Math.min(image.naturalHeight,Math.ceil((bottom+2)*sy))-y;
    const ratio=image.closest('.parcel-thumb')?Math.min(1,144/Math.max(width,height)):1;
    cropped.width=Math.max(1,Math.round(width*ratio));cropped.height=Math.max(1,Math.round(height*ratio));
    cropped.getContext('2d').drawImage(image,x,y,width,height,0,0,cropped.width,cropped.height);
    if(image.isConnected)image.src=cropped.toDataURL('image/png');
  }catch{/* Keep the original image when its pixels cannot be read. */}
}
