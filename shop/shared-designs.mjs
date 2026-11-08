import {collectionName} from '../domain.mjs';

const primaryCategories=new Map([
  ['Photo frames','Photos'],['Postcards','Postcards'],['Flowers','Flowers'],['Love notes','Love notes'],
  ['Reminders','Reminders'],['Notes','Notes'],['Pigeons','Stickers']
]);
const subjects={frame:'frame',postcard:'postcard',flowers:'flowers',love:'love note',hug:'hug',reminder:'reminder',sticker:'sticker'};
const categorySubjects=new Map([
  ['photos','frame'],['photo frames','frame'],['frames','frame'],['postcards','postcard'],
  ['stickers','sticker'],['pigeons','pigeon'],['notes','note'],['love notes','love note'],['flowers','flowers'],
  ['reminders','reminder'],['hugs','hug'],['uncategorised','sticker']
]);
const extraPrefix='shared/';

export function sharedCategory(label){
  return primaryCategories.get(label)||extraPrefix+label;
}
export function shopCategoryName(key){return key.startsWith(extraPrefix)?key.slice(extraPrefix.length):collectionName(key);}
export function recordDesign(record){
    const {id,category,kind,width,height,src,textArea}=record;
    const subject=subjects[kind]||'picture',title=record.name?.trim();
    const categorySubject=categorySubjects.get(category.toLowerCase());
    const fallback=categorySubject?categorySubject[0].toUpperCase()+categorySubject.slice(1):category;
    const buttonSubject=categorySubject||subject;
    const item={
      deliveryKind:kind==='flowers'?'flowers':kind==='frame'?'a framed photo':'a '+subject,
      sharedId:id,kind,category:sharedCategory(category),name:title||fallback,
      useLabel:title?'Use '+title:buttonSubject==='flowers'?'Use these flowers':'Use this '+buttonSubject,
      master:src,photoArea:record.photoArea,rect:[0,0,width,height],ink:'#283c30'
    };
    if(textArea){
      const {x,y,w,h,rotation}=textArea;
      item.textBox=[x,y,x+w,y+h];item.textRotation=rotation||0;
    }
    return item;
}

// At a bounded preview size, find the largest transparent region completely enclosed
// by the printed frame. Transparent padding outside the frame must stay transparent.
export function findFrameOpening(rgba,width,height){
  const count=width*height,seen=new Uint8Array(count),queue=new Int32Array(count);
  let largest=null;
  for(let seed=0;seed<count;seed++){
    if(seen[seed]||rgba[seed*4+3]>96)continue;
    let head=0,tail=1,outside=false,left=width,right=0,top=height,bottom=0;
    queue[0]=seed;seen[seed]=1;
    while(head<tail){
      const index=queue[head++],x=index%width,y=Math.floor(index/width);
      if(x===0||y===0||x===width-1||y===height-1)outside=true;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      const visit=next=>{if(!seen[next]&&rgba[4*next+3]<=96){seen[next]=1;queue[tail++]=next;}};
      if(x)visit(index-1);
      if(x+1<width)visit(index+1);
      if(y)visit(index-width);
      if(y+1<height)visit(index+width);
    }
    if(!outside&&(!largest||tail>largest.pixels.length)){
      largest={pixels:queue.slice(0,tail),opening:[left/width,top/height,(right+1)/width,(bottom+1)/height]};
    }
  }
  return largest;
}

export async function prepareSharedFrame(item,sourceImage){
  if(!item.sharedId || !['frame','postcard'].includes(item.kind) || item.maskSheet)return item;
  if(item.photoArea)return rectangularOpening(item,item.photoArea);
  const image=sourceImage||new Image();
  if(!sourceImage){
    if(/^https?:/i.test(item.master))image.crossOrigin='anonymous';
    image.src=item.master;await image.decode();
  }
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  const scale=Math.min(1,640/Math.max(width,height));
  const mask=document.createElement('canvas');
  mask.width=Math.max(1,Math.round(width*scale));mask.height=Math.max(1,Math.round(height*scale));
  const context=mask.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,0,0,mask.width,mask.height);
  const source=context.getImageData(0,0,mask.width,mask.height);
  const hole=findFrameOpening(source.data,mask.width,mask.height);
  // Opaque cards and open-ended frames still accept a picture in an inset area.
  if(!hole||hole.pixels.length<Math.max(4,mask.width*mask.height*.008))
    return rectangularOpening(item,defaultPhotoArea(item.kind,item.textBox));
  const fill=context.createImageData(mask.width,mask.height);
  for(const pixel of hole.pixels)fill.data[pixel*4+3]=255;
  context.putImageData(fill,0,0);
  // Overlap the inner edge so the foreground's own anti-aliasing defines the contour.
  const expanded=document.createElement('canvas');expanded.width=mask.width;expanded.height=mask.height;
  const brush=expanded.getContext('2d');
  for(const [x,y] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])brush.drawImage(mask,x,y);
  return {...item,maskSheet:expanded.toDataURL('image/png'),opening:hole.opening};
}

export function defaultPhotoArea(kind,textBox){
  if(kind==='frame')return {x:.15,y:.15,w:.7,h:.7};
  const [left,top,right,bottom]=textBox||[.12,.58,.88,.84];
  const candidates=[[.08,.08,.92,top-.025],[.08,bottom+.025,.92,.92],
    [.08,.08,left-.025,.92],[right+.025,.08,.92,.92]];
  const [x,y,r,b]=candidates.filter(([x,y,r,b])=>r-x>=.1&&b-y>=.1)
    .sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0]||[.1,.1,.9,.48];
  return {x,y,w:r-x,h:b-y};
}
function rectangularOpening(item,{x,y,w,h}){
  const mask=document.createElement('canvas');mask.width=512;mask.height=512;
  mask.getContext('2d').fillRect(x*512,y*512,w*512,h*512);
  return {...item,maskSheet:mask.toDataURL('image/png'),opening:[x,y,x+w,y+h],photoOnTop:true};
}
