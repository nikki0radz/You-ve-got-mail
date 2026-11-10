// The minimum shows the whole camera image inside the opening. A different
// opening aspect ratio needs some transparent space rather than a forced crop.
export function minimumCameraZoom(item,width,height){
 if(!item?.maskSheet||!item.opening||!width||!height)return 1;
 const [l,t,r,b]=item.opening;
 const pw=(r-l)*item.rect[2],ph=(b-t)*item.rect[3];
 if(!(pw>0&&ph>0))return 1;
 const x=pw/width,y=ph/height;
 return Math.min(x,y)/Math.max(x,y);
}

// Bake the same centred framing into the saved image, so every downstream
// photo picker/composer preserves it without out-of-band File metadata.
export function drawCameraZoom(source,zoom,canvas){
 const width=source.width,height=source.height;
 if(canvas.width!==width)canvas.width=width;
 if(canvas.height!==height)canvas.height=height;
 const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
 ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,(width-width*zoom)/2,(height-height*zoom)/2,width*zoom,height*zoom);
 return canvas;
}
