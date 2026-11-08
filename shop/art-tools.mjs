export function sortArtwork(items,order='newest'){
 return [...items].sort((a,b)=>order==='name'?(a.name||a.category).localeCompare(b.name||b.category):((Number(a.uploadedAt)||0)-(Number(b.uploadedAt)||0))*(order==='oldest'?1:-1)||a.id.localeCompare(b.id));
}
export function alphaBounds(data,width,height){
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 return right<0?null:{x:left,y:top,w:right-left+1,h:bottom-top+1};
}
export function cropArea(area,crop,width,height){
 if(!area)return null;
 const x=Math.max(0,Math.min(.99,(area.x*width-crop.x)/crop.w)),y=Math.max(0,Math.min(.99,(area.y*height-crop.y)/crop.h));
 return {...area,x,y,w:Math.max(.01,Math.min(1-x,(area.x*width+area.w*width-crop.x)/crop.w-x)),h:Math.max(.01,Math.min(1-y,(area.y*height+area.h*height-crop.y)/crop.h-y))};
}
