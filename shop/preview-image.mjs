// Trim the transparent phone canvas for display. Sending keeps the full placement geometry.
export async function fitPreview(image){
  try{
    await image.decode();
    if(!image.isConnected)return;
    const scale=Math.min(1,800/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');
    const w=canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    const h=canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0,w,h);
    const {data}=ctx.getImageData(0,0,w,h);
    let left=w,right=-1,top=h,bottom=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      if(data[(y*w+x)*4+3]<12)continue;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(right<left||bottom<top||(left<2&&top<2&&right>=w-2&&bottom>=h-2))return;
    const cropped=document.createElement('canvas');
    cropped.width=right-left+1;cropped.height=bottom-top+1;
    cropped.getContext('2d').drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
    if(image.isConnected)image.src=cropped.toDataURL('image/png');
  }catch{/* Keep the original image when its pixels cannot be read. */}
}
