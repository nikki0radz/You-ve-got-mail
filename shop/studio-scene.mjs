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
export function banner(style,text){
  const c=document.createElement('canvas');c.width=1200;c.height=360;
  const ctx=c.getContext('2d');ctx.scale(2,2);ctx.lineWidth=3;
  ctx.fillStyle=['#fff1cd','#c7ddcb','#fff9e9'][style];ctx.strokeStyle=['#a18b69','#537760','#456957'][style];
  ctx.beginPath();
  if(style===1){const pts=[[2,9],[598,9],[565,90],[598,171],[2,171],[35,90]];pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
  else ctx.roundRect(2,3,596,174,style===2?25:8);
  ctx.fill();ctx.stroke();
  if(style===2){ctx.strokeStyle='#a45c50';ctx.lineWidth=3;ctx.setLineDash([12,9]);ctx.beginPath();ctx.roundRect(13,14,574,152,15);ctx.stroke();}
  const [x,y,w,h]=noteBox(style);
  writeText(ctx,text,[600*x,180*y,600*w,180*h],'#283c30');return c;
}
export async function renderParcel(item,state){
  const canvas=document.createElement('canvas');canvas.width=W*2;canvas.height=H*2;
  const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.imageSmoothingQuality='high';
  const paint=(img,l)=>ctx.drawImage(img,l.x,l.y,l.width,l.width*l.ratio);
  paint(await artwork(item,state.crop,state.words),state.art);
  if(state.second)paint(state.second.image,state.second);
  if(state.note)paint(banner(state.note.style,state.note.text),state.note);
  return canvas;
}
