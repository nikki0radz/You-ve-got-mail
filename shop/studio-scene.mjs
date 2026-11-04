import {composePNG,writeText} from './compositor.mjs';
export const W=600,H=1120;
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const bannerNames=['Paper strip','Ribbon','Airmail label'];
export function geometry(item){
  const [, , w,h]=item.rect, scale=574/Math.max(w,h), width=w*scale,height=h*scale;
  return {x:(640-width)/2,y:(640-height)/2,width,height};
}
export function makeLayer(ratio,width=390,y=340){
  return {x:(W-width)/2,y,width,ratio};
}
export function contain(layer){
  layer.width=clamp(layer.width,Math.min(86,H/layer.ratio),Math.min(W,H/layer.ratio));
  layer.x=clamp(layer.x,0,W-layer.width);
  layer.y=clamp(layer.y,0,H-layer.width*layer.ratio);
  return layer;
}
export async function artwork(item,crop,words=''){
  const src=await composePNG(item,{...crop,words,extra:'',shape:'Square'},2);
  const g=geometry(item),c=document.createElement('canvas');c.width=Math.round(2*g.width);c.height=Math.round(2*g.height);
  c.getContext('2d').drawImage(src,2*g.x,2*g.y,2*g.width,2*g.height,0,0,c.width,c.height);
  return c;
}
export function noteBox(style){
  return style===1?[.14,.10,.72,.80]:[.065,.10,.87,.80];
}
export function banner(style,text,width=360,height=108,colours={}){
  const c=document.createElement('canvas');
  c.width=Math.round(2*width);c.height=Math.round(2*height);
  const ctx=c.getContext('2d');ctx.scale(2,2);
  const edge=Math.min(width,height), inset=Math.max(1,edge*.017);
  ctx.lineWidth=inset;ctx.fillStyle=colours.fill||['#fff1cd','#c7ddcb','#fff9e9'][style];ctx.strokeStyle=['#a18b69','#537760','#456957'][style];
  ctx.beginPath();
  if(style===1){
    const fold=Math.min(width*.065,height*.2);
    const points=[[inset,inset],[width-inset,inset],[width-fold,height/2],[width-inset,height-inset],[inset,height-inset],[fold,height/2]];
    points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
  }else ctx.roundRect(inset,inset,width-2*inset,height-2*inset,edge*(style===2?.14:.045));
  ctx.fill();ctx.stroke();
  if(style===2){
    const margin=edge*.08;ctx.strokeStyle='#a45c50';ctx.setLineDash([inset*4,inset*3]);ctx.beginPath();
    ctx.roundRect(margin,margin,width-2*margin,height-2*margin,edge*.085);ctx.stroke();
  }
  const [x,y,w,h]=noteBox(style);
  writeText(ctx,text,[width*x,height*y,width*w,height*h],colours.ink||'#283c30');return c;
}
export async function renderParcel(item,state){
  const canvas=document.createElement('canvas');canvas.width=W*2;canvas.height=H*2;
  const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.imageSmoothingQuality='high';
  const paint=(img,l)=>ctx.drawImage(img,l.x,l.y,l.width,l.width*l.ratio);
  paint(await artwork(item,{...state.crop,ink:state.ink,paper:state.paper},state.words),state.art);
  if(state.second)paint(state.second.image,state.second);
  if(state.note)paint(banner(state.note.style,state.note.text,state.note.width,state.note.width*state.note.ratio,state.note),state.note);
  return canvas;
}
