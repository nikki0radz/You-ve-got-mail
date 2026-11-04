const limit=1800000;
export async function scaled(data){
  if(data.length<=limit)return data;
  const img=new Image();img.src=data;await img.decode();
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  // At each size, try the full-colour image, then fewer RGB levels before sacrificing pixels.
  // Always resize the original and preserve every alpha value in the colour pass.
  let width=img.width;
  while(width>=1){
    canvas.width=width;canvas.height=Math.max(1,Math.round(img.height*width/img.width));
    ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,canvas.width,canvas.height);
    if(width!==img.width){
      const original=canvas.toDataURL('image/png');if(original.length<=limit)return original;
    }
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    const rgb=new Uint8ClampedArray(pixels.data);
    for(const bits of [2,3,4]){
      const mask=255<<bits;
      for(let i=0;i<rgb.length;i+=4){
        if(!rgb[i+3])continue;
        for(let k=i;k<i+3;k++)pixels.data[k]=Math.round((rgb[k]&mask)*255/(255&mask));
      }
      ctx.putImageData(pixels,0,0);
      const candidate=canvas.toDataURL('image/png');if(candidate.length<=limit)return candidate;
    }
    width=Math.floor(width*.9);
  }
  throw new Error('This parcel could not fit the delivery size limit.');
}
