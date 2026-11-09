import {blendBeautyPixels,faceOval,eyes,brows,outerLips,innerLips} from './beauty-pixels.mjs';
const shapes={faceOval,eyes,brows,outerLips,innerLips};
function polygon(ctx,points,indices,w,h){ctx.beginPath();indices.forEach((index,i)=>{const p=points[index];if(i)ctx.lineTo(p.x*w,p.y*h);else ctx.moveTo(p.x*w,p.y*h);});ctx.closePath();}
export function renderNaturalBeauty(output,faces,buffers={}){
 const w=output.width,h=output.height,ctx=output.getContext('2d',{willReadFrequently:true});
 function canvas(name,w,h){let c=buffers[name];if(!c)c=buffers[name]=new OffscreenCanvas(w,h);if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;return c;}
 if(!faces.length)return output;
 const soft=canvas('soft',w,h),softCtx=soft.getContext('2d',{willReadFrequently:true});
 const skin=canvas('skin',w,h),skinCtx=skin.getContext('2d',{willReadFrequently:true});skinCtx.clearRect(0,0,w,h);
 const teeth=canvas('teeth',w,h),teethCtx=teeth.getContext('2d',{willReadFrequently:true});teethCtx.clearRect(0,0,w,h);
 for(const face of faces){
  const faceWidth=Math.abs(face[454].x-face[234].x)*w,feather=Math.max(1,faceWidth*.006);
  skinCtx.globalCompositeOperation='source-over';skinCtx.filter=`blur(${feather}px)`;skinCtx.fillStyle='#fff';polygon(skinCtx,face,shapes.faceOval,w,h);skinCtx.fill();skinCtx.filter='none';
  skinCtx.globalCompositeOperation='destination-out';skinCtx.lineWidth=Math.max(2,faceWidth*.035);skinCtx.lineJoin='round';
  for(const feature of [...shapes.eyes,...shapes.brows,shapes.outerLips]){polygon(skinCtx,face,feature,w,h);skinCtx.fill();skinCtx.stroke();}
  skinCtx.globalCompositeOperation='source-over';
  const mouth=shapes.innerLips.map(i=>face[i]);
  if(Math.max(...mouth.map(p=>p.y))-Math.min(...mouth.map(p=>p.y))>Math.abs(face[152].y-face[10].y)*.018){teethCtx.fillStyle='#fff';polygon(teethCtx,face,shapes.innerLips,w,h);teethCtx.fill();}
  softCtx.filter=`blur(${Math.max(.8,Math.min(4,faceWidth*.009))}px)`;
 }
 softCtx.clearRect(0,0,w,h);softCtx.drawImage(output,0,0);softCtx.filter='none';
 const pixels=blendBeautyPixels(ctx.getImageData(0,0,w,h),softCtx.getImageData(0,0,w,h),skinCtx.getImageData(0,0,w,h),teethCtx.getImageData(0,0,w,h));ctx.putImageData(pixels,0,0);
 return output;
}
