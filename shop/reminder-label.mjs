// Build a transparent repair layer for the printed lettering when the sender rewrites it.
// Sample colour from the surrounding paper inside each design's lettering region.
const repairs=new Map();
export function reminderRepair(item,image){
  if(repairs.has(item.name))return repairs.get(item.name);
  const canvas=document.createElement('canvas');canvas.width=448;
  canvas.height=Math.round(448*item.rect[3]/item.rect[2]);
  const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d',{willReadFrequently:true});
  const region=item.master?[]:item.rect;ctx.drawImage(image,...region,0,0,w,h);
  const original=ctx.getImageData(0,0,w,h);ctx.clearRect(0,0,w,h);
  const {polygon,fill}=item.labelPatch;
  ctx.beginPath();
  for(let i=0;i<polygon.length;i+=2){
    const x=w*polygon[i],y=h*polygon[i+1];if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.fill();ctx.lineWidth=2;ctx.stroke();
  const mask=ctx.getImageData(0,0,w,h).data,src=original.data;
  const patch=ctx.createImageData(w,h),out=patch.data;
  const paper=[1,3,5].map(i=>parseInt(fill.slice(i,i+2),16));
  const lightInk=paper[0]<130;
  const ink=new Uint8Array(w*h),letters=new Uint8Array(w*h);
  const mean=paper.reduce((a,b)=>a+b)/3;
  for(let n=0;n<ink.length;n++){
    const p=4*n,tone=(src[p]+src[p+1]+src[p+2])/3;
    ink[n]=src[p+3]>180&&(lightInk?tone>mean+45:tone<mean-48)?1:0;
  }
  // Drop connected outlines extending off the label. Expand each glyph slightly
  // to cover the antialiased edge of the original full-resolution lettering.
  for(let n=0;n<ink.length;n++){
    if(!ink[n]||!mask[4*n+3])continue;
    const component=[n];ink[n]=0;let inside=0;
    for(let j=0;j<component.length;j++){
      const k=component[j];if(mask[4*k+3])inside++;
      for(const near of [k-1,k+1,k-w,k+w]){
        if(near>=0&&near<ink.length&&ink[near]){ink[near]=0;component.push(near);}
      }
    }
    if(inside<component.length*.78)continue;
    for(const k of component){
      for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
        const near=k+dy*w+dx;if(near>=0&&near<letters.length)letters[near]=1;
      }
    }
  }
  // Interpolate across paper on either side, ignoring nearby printed borders.
  function sample(x,y,direction){
    const colour=[0,0,0];let count=0;
    for(let step=1;step<=6;step++){
      const px=x+direction*step;if(px<0||px>=w)continue;
      const p=(y*w+px)*4;if(src[p+3]<245||paper.some((v,k)=>Math.abs(v-src[p+k])>25))continue;
      for(let k=0;k<3;k++)colour[k]+=src[p+k];count++;
    }
    return count?colour.map(v=>v/count):paper;
  }
  for(let y=0;y<h;y++){
    let left=0,right=w-1;
    while(left<w&&!mask[(y*w+left)*4+3])left++;
    if(left===w)continue;
    while(right>left&&!mask[(y*w+right)*4+3])right--;
    const start=sample(left,y,-1),end=sample(right,y,1);
    for(let x=left;x<=right;x++){
      const p=(y*w+x)*4,t=(x-left)/Math.max(1,right-left);
      for(let k=0;k<3;k++)out[p+k]=.75*paper[k]+.25*(start[k]+t*(end[k]-start[k]));
      const tone=(src[p]+src[p+1]+src[p+2])/3;
      if(letters[y*w+x]||Math.abs(tone-mean)<48)out[p+3]=Math.min(mask[p+3],src[p+3]);
    }
  }
  ctx.putImageData(patch,0,0);repairs.set(item.name,canvas);return canvas;
}
