// Both the live preview and saved photo use this exact orientation transform.
export function drawCameraPhoto(video,mirrored,canvas){
 const width=video.videoWidth,height=video.videoHeight;
 if(!width||!height)throw Error('Wait for the camera to be ready.');
 if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
 const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
 if(mirrored){ctx.translate(width,0);ctx.scale(-1,1);}
 ctx.drawImage(video,0,0,width,height);ctx.setTransform(1,0,0,1,0,0);return canvas;
}
