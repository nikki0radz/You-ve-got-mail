// The shared portrait canvas keeps the relative layout when another handset fits it to screen.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function scene(art,draft,density=1){
  const canvas=document.createElement('canvas');canvas.width=600*density;canvas.height=1120*density;
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingQuality='high';
  const draw=(img,layer)=>{
    const w=layer.size*canvas.width,h=w*img.height/img.width;
    const scale=Math.min(1,canvas.height/h),width=w*scale,height=h*scale;
    const left=(canvas.width-width)*layer.x,top=(canvas.height-height)*layer.y;
    ctx.drawImage(img,left,top,width,height);
  };
  draw(art,draft.framePos);
  if(draft.second)draw(draft.second,draft.secondPos);
  return canvas;
}
export function gestures(slot,update){
  const points=new Map();
  const metric=()=>{
    const [a,b]=[...points.values()];return !a?null:b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,span:Math.hypot(a.x-b.x,a.y-b.y)}:{...a,span:0};
  };
  slot.onpointerdown=e=>{if(points.size>=2)return;slot.setPointerCapture(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});};
  slot.onpointermove=e=>{
    if(!points.has(e.pointerId))return;
    const old=metric();points.set(e.pointerId,{x:e.clientX,y:e.clientY});const now=metric();
    const box=slot.querySelector('canvas')?.getBoundingClientRect();
    if(box)update(now.x-old.x,now.y-old.y,old.span&&now.span?now.span/old.span:1,box);
  };
  slot.onpointerup=slot.onpointercancel=slot.onlostpointercapture=e=>points.delete(e.pointerId);
}
