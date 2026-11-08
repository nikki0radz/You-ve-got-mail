import {escapeHtml as esc,collectionName} from '../domain.mjs';
import {guestItems,guestSelection} from './guest-selection.mjs?v=complete-stickers';
import {mainRecords} from './main-art.mjs';
import {recordDesign,prepareSharedFrame} from './shared-designs.mjs';
import {loadSheet} from './compositor.mjs';
import {displayPhotoThumbnail} from './stock-photo.mjs';

const kinds={Photos:'frame',Postcards:'postcard',Flowers:'flowers',Reminders:'reminder','Love notes':'love'};
const wheelOrder=Object.keys(guestSelection);
const preferred=new Map(Object.entries(guestSelection).flatMap(([category,picks])=>
  picks.map(([id,name],i)=>[category+'/'+name,{id,i}])));
let bundled;
async function bundledRecords(){
  if(!bundled)bundled=fetch('assets/post/catalog.json?v=editable-reminders').then(async response=>{
    if(!response.ok)throw Error('The shop could not load. Open it again to retry.');
    const originals=await response.json();
    const curated=new Map(guestItems(originals).map(item=>[item.category+'/'+item.name,item]));
    return originals.map((original,i)=>{
      const id='builtin-'+i,key=original.category+'/'+original.name,pick=preferred.get(key);
      const design={...(curated.get(key)||original),catalogueId:id,originalName:original.name};
      if(pick){
        design.guestRank=pick.i;
        if(original.category==='Photos'||pick.id===105)design.sample='assets/guest/wheel-'+String(pick.id).padStart(3,'0')+'.webp';
      }
      const [,,width,height]=design.rect;
      let textArea=null;
      if(design.textBox){
        const [x,y,r,b]=design.textBox;textArea={x,y,w:r-x,h:b-y,rotation:design.textRotation||0};
      }
      return {id,category:collectionName(original.category),kind:kinds[original.category]||'sticker',name:original.name,width,height,textArea,photoArea:null,tags:[],hidden:false,seq:0,design};
    });
  }).catch(error=>{bundled=null;throw error;});
  return bundled;
}

function mergeBuiltin(base,override) {
  const {design:original,...defaults}=base;
  const row={...defaults,...override},details=recordDesign(row);
  const design={...(row.imageId?details:original),notePaper:base.category==='Notes'&&base.kind===row.kind,name:details.name,useLabel:details.useLabel,category:details.category,kind:row.kind};
  design.deliveryKind=base.kind===row.kind&&base.category==='Notes'?'a note':details.deliveryKind;
  if(row.textArea)Object.assign(design,{textBox:details.textBox,textRotation:details.textRotation});
  else if(base.kind!==row.kind)delete design.textBox;
  if(base.kind!==row.kind && row.kind!=='reminder')delete design.labelPatch;
  if(base.kind!==row.kind || row.photoArea){
    delete design.maskSheet;delete design.opening;delete design.sample;
    if(['frame','postcard'].includes(row.kind)){
      design.preparePhoto=true;design.photoArea=row.photoArea;
    }
  }
  return {...row,design};
}
export async function catalogueRecords({includeHidden=false,includeAvatars=false}={}){
  const base=await bundledRecords(),records=mainRecords();
  const overrides=new Map(records.filter(row=>row.id.startsWith('builtin-')).map(row=>[row.id,row]));
  const uploaded=records.filter(row=>!row.id.startsWith('builtin-')&&(includeAvatars||row.kind!=='avatar')).map(row=>({...row,design:{...recordDesign(row),catalogueId:row.id}}));
  return [...uploaded,...base.map(row=>mergeBuiltin(row,overrides.get(row.id)))].filter(row=>(includeHidden||!row.hidden)&&(includeAvatars||row.kind!=='avatar'));
}
export async function catalogueDesigns(){
  return (await catalogueRecords()).map(row=>row.design);
}
export function wheelChoices(designs){
  const first=new Map();
  for(const design of designs){
    const current=first.get(design.category);
    if(!current||(design.guestRank??Infinity)<(current.guestRank??Infinity))first.set(design.category,design);
  }
  return [...new Set([...wheelOrder,...first.keys()])].filter(key=>first.has(key)).map(key=>first.get(key));
}

// A source image or a correctly cropped sprite for editor previews and compositing.
export async function catalogueImage(item){
  const img=await loadSheet(item.master||item.sheet);
  if(item.master)return img;
  const [x,y,w,h]=item.rect,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');
  if(item.artClip)ctx.clip(new Path2D(item.artClip),'evenodd');
  ctx.drawImage(img,x,y,w,h,0,0,w,h);
  return canvas;
}
export async function prepareCatalogueDesign(item){
  if(!item.preparePhoto)return prepareSharedFrame(item);
  const image=await catalogueImage(item);
  return prepareSharedFrame({...item,sharedId:item.catalogueId,master:image instanceof HTMLCanvasElement?image.toDataURL():image.src});
}
export function mountCatalogueThumbnail(host,item){
  if(item.sharedId && ['frame','postcard'].includes(item.kind)){
    const image=new Image();
    image.alt='';image.draggable=false;
    host.replaceChildren(image);
    displayPhotoThumbnail(image,item);
    return;
  }
  host.innerHTML=catalogueThumbnail(item);
}
let maskSerial=0;
export function catalogueThumbnail(item){
  const src=item.sample||item.master;
  if(item.sharedId||item.sample||src&&!item.maskSheet)return '<img loading="lazy" alt="" draggable="false" src="'+esc(src)+'">';
  const [x,y,w,h]=item.rect;
  const crop=path=>'<svg width="'+w+'" height="'+h+'" viewBox="'+[x,y,w,h].join(' ')+'" overflow="hidden"><image href="'+esc(path)+'" width="'+item.sheetWidth+'" height="'+item.sheetHeight+'"/></svg>';
  let layers=item.master?'<image href="'+esc(item.master)+'" width="'+w+'" height="'+h+'"/>':crop(item.sheet);
  if(item.artClip)layers='<g style="clip-path:path(evenodd, &quot;'+esc(item.artClip)+'&quot;)">'+layers+'</g>';
  if(item.maskSheet){
    const [left,top,right,bottom]=item.opening,key='catalogue-mask-'+(++maskSerial);
    const sample='<svg x="'+left*w+'" y="'+top*h+'" width="'+(right-left)*w+'" height="'+(bottom-top)*h+'" viewBox="25 29 141 120" preserveAspectRatio="xMidYMid slice"><image href="assets/guest/wheel-031.webp" width="193" height="205"/></svg>';
    layers='<defs><mask id="'+key+'" maskUnits="userSpaceOnUse" x="0" y="0" width="'+w+'" height="'+h+'">'+crop(item.maskSheet)+'</mask></defs><g mask="url(#'+key+')">'+sample+'</g>'+layers;
  }
  return '<svg viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+layers+'</svg>';
}
