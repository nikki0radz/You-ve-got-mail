export async function scaled(data){
  if(data.length<=1800000)return data;
  const img=new Image();img.src=data;await img.decode();
  // Preserve the portrait dimensions first. Reduce photo colour precision before resizing.
  const quant=document.createElement('canvas');quant.width=img.width;quant.height=img.height;
  const ctx=quant.getContext('2d');ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData(0,0,quant.width,quant.height);
  for(const bits of [3,4]){
    const mask=255<<bits;
    for(let i=0;i<pixels.data.length;i+=4){
      if(!pixels.data[i+3])continue;
      for(let k=i;k<i+3;k++)pixels.data[k]=Math.round((pixels.data[k]&mask)*255/(255&mask));
    }
    ctx.putImageData(pixels,0,0);const candidate=quant.toDataURL('image/png');if(candidate.length<=1800000)return candidate;
  }
  let width=img.width;
  while(data.length>1800000&&width>150){
    width=Math.round(width*.8);const c=document.createElement('canvas');c.width=width;c.height=Math.round(img.height*width/img.width);c.getContext('2d').drawImage(img,0,0,c.width,c.height);data=c.toDataURL('image/png');
  }
  return data;
}
