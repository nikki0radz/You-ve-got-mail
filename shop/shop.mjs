import {mountCategoryWheel} from './category-wheel.mjs';
import {guestItems,guestSelection} from './guest-selection.mjs';
import {startGuestStudio} from './guest-studio.mjs';
import {mountFrameReel} from './frame-reel.mjs';
import {gestures,clamp,scene} from './placement.mjs';
import {composePNG} from './compositor.mjs';
import {escapeHtml as esc,collectionName as displayName} from '../domain.mjs';

const categories=['Notes','Photos','Postcards','Flowers','Love notes','Reminders','Stickers'];
const palette=[['','None'],['#fff1d4','Cream'],['#c1d6bc','Pale forest'],['#d9cce8','Lilac'],['#45634d','Forest']];
let appCatalog;
async function getCatalog(){
  if(appCatalog)return appCatalog;
  const response=await fetch('assets/post/catalog.json');
  if(!response.ok)throw new Error('The shop could not load. Open it again to retry.');
  appCatalog=await response.json();return appCatalog;
}
function miniature(item){
  const [x,y,w,h]=item.rect;
  const clip=item.artClip?' style="clip-path:path(evenodd, &quot;'+esc(item.artClip)+'&quot;)"':'';
  return '<svg viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><g'+clip+'><svg width="'+w+'" height="'+h+'" viewBox="'+[x,y,w,h].join(' ')+'" overflow="hidden"><image href="'+esc(item.sheet)+'" width="'+item.sheetWidth+'" height="'+item.sheetHeight+'"/></svg></g></svg>';
}
export function openReplyShop(onReady,initialCategory='Stickers',onCancel){
  return openShop(onReady,initialCategory,{curated:true,wheel:true,studio:true,onCancel});
}

export async function openShop(onTest, initialCategory, options={}){
  // Existing guest links call openShop with true.
  const guest=options===true || Boolean(options.curated);
  const studio=guest || Boolean(options.studio);
  let completed=false;

  const dialog=document.querySelector('#parcel-shop');
  let catalog,availableCategories;
  let current,group,draft,step=0,latest=0,dirty=false,finished;
  let returnScroll=0,previewURL,shopScroll=0,backFromItem;
  let disposeReel,chosenFrame='Instant print';
  const stripOffsets=new Map();
  const trigger=document.activeElement;
  if(dialog.open)return;
  dialog.showModal();
  const cleanup=()=>{disposeReel?.();latest++;if(previewURL)URL.revokeObjectURL(previewURL);dialog.classList.remove('editing','guest-studio');dialog.replaceChildren();trigger?.focus();if(!completed)options.onCancel?.();};
  dialog.onclose=cleanup;
  let cancel=()=>dialog.close();
  dialog.oncancel=e=>{e.preventDefault();cancel();};
  const shell=(name,status,body,back)=>{
    disposeReel?.();disposeReel=null;
    dialog.innerHTML='<header class="parcel-head"><small>'+esc(status)+'</small><button type="button" aria-label="Close" class="parcel-x">×</button></header><h2>'+esc(name)+'</h2>'+body+'<p role="alert" class="parcel-error"></p>';
    dialog.querySelector('.parcel-x').onclick=()=>cancel();
    const prev=dialog.querySelector('[data-prev]');if(prev)prev.onclick=back;
    dialog.scrollTop=0;
  };
  const report=e=>{const line=dialog.querySelector('.parcel-error');if(line)line.textContent=e.message||String(e);};
  const backButton='<button class="secondary" data-prev>‹ Back</button>';
  const chooseItem=it=>{current=it;group=it.category;step=0;dirty=false;
    if(studio){
      disposeReel?.();disposeReel=null;
      startGuestStudio(dialog,it,backFromItem,async(image,name,category,reopen)=>{
        await onTest(image,name,category,reopen);completed=true;dialog.close();
      });
      return;
    }
    draft={words:'',extra:'',photo:null,zoom:1,panX:.5,panY:.5,shape:'Rounded',background:'',border:'',framePos:{x:.5,y:.45,size:.85},secondPos:{x:.78,y:.78,size:.3},second:null,layer:'framePos'};edit();};
  const shelfButton=it=>'<button type="button" class="parcel-tile" data-item="'+catalog.indexOf(it)+'">'+miniature(it)+'<span>'+esc(it.name)+'</span></button>';
  function rememberShop(){
    shopScroll=dialog.scrollTop;
    dialog.querySelectorAll('.postal-strip').forEach((strip,i)=>stripOffsets.set(i,strip.querySelector('.strip-items').scrollLeft));
  }
  const wireTiles=back=>dialog.querySelectorAll('[data-item]').forEach(btn=>btn.onclick=()=>{backFromItem=back;if(back===browse)rememberShop();else returnScroll=dialog.scrollTop;chooseItem(catalog[Number(btn.dataset.item)]);});
  function browse(){
    dialog.classList.remove('editing');dirty=false;cancel=()=>dialog.close();
    shell('Pick & post','The parcel shop','<div class="postal-shelves">'+availableCategories.map(cat=>{
      const items=catalog.filter(it=>it.category===cat);
      return '<section><h3>'+displayName(cat)+'</h3><div class="postal-strip"><button class="bubble previous" aria-label="Previous '+displayName(cat)+'">‹</button><div class="strip-items">'+items.map(shelfButton).join('')+'</div><button class="bubble following" aria-label="More '+displayName(cat)+'">›</button></div><button class="seam" data-cat="'+cat+'" aria-label="See all '+displayName(cat)+'">See all ↓</button></section>';
    }).join('')+'</div>');
    wireTiles(browse);dialog.scrollTop=shopScroll;
    dialog.querySelectorAll('[data-cat]').forEach(btn=>btn.onclick=()=>{rememberShop();group=btn.dataset.cat;returnScroll=0;gallery();});
    dialog.querySelectorAll('.postal-strip').forEach((strip,i)=>{
      const row=strip.querySelector('.strip-items'), prev=strip.querySelector('.previous'), next=strip.querySelector('.following');
      row.scrollLeft=stripOffsets.get(i)||0;
      const sync=()=>{prev.disabled=row.scrollLeft<2;next.disabled=row.scrollLeft+row.clientWidth>=row.scrollWidth-2};
      prev.onclick=()=>row.scrollBy({left:-row.clientWidth,behavior:'smooth'});next.onclick=()=>row.scrollBy({left:row.clientWidth,behavior:'smooth'});row.onscroll=sync;requestAnimationFrame(sync);
    });
  }
  function wheel(){
    disposeReel?.();disposeReel=null;
    mountCategoryWheel(dialog,{initialCategory:group,onBack:()=>dialog.close(),onBrowse:category=>{
      group=category;returnScroll=0;gallery();
    }});
    cancel=()=>dialog.close();dialog.scrollTop=0;
  }
  function gallery(){
    dialog.classList.remove('editing');dirty=false;cancel=()=>dialog.close();
    const items=catalog.filter(it=>it.category===group);
    const back=options.wheel?wheel:guest?()=>dialog.close():browse;
    if(guest&&group==='Photos'){
      const frames=[...items].sort((a,b)=>Number(b.name==='Instant print')-Number(a.name==='Instant print'));
      shell('Photo frames','Choose a frame',backButton+'<div class="frame-card"><div class="frame-rail" role="group" aria-label="Swipe through photo frames"></div><h3 class="frame-name" aria-live="polite"></h3></div><div class="frame-index">All frames <span class="frame-count"></span></div><div class="frame-thumbs" role="group" aria-label="All five frames"></div><button class="primary frame-use"></button>',back);
      disposeReel=mountFrameReel(dialog,frames,Math.max(0,frames.findIndex(it=>it.name===chosenFrame)),item=>{
        chosenFrame=item.name;backFromItem=gallery;chooseItem(item);
      });return;
    }
    shell(displayName(group),items.length+' designs',backButton+'<div class="parcel-gallery">'+items.map(shelfButton).join('')+'</div>',back);wireTiles(gallery);dialog.scrollTop=returnScroll;
  }
  function confirmExit(action){
    if(!dirty){action();return}
    shell('Discard this parcel?','Unfinished design','<button class="secondary" data-keep>Keep editing</button> <button class="primary" data-discard>Discard</button>');
    cancel=edit;dialog.querySelector('[data-keep]').onclick=edit;dialog.querySelector('[data-discard]').onclick=action;
  }
  function stages(){return [...(current.maskSheet?['Upload photo','Fit photo']:[]),...(current.textBox?['Write']:[]),'Place on screen','Finishing touches','Ready'];}
  function selectControl(key,opts){return '<label>'+key+'<select data-setting="'+key.toLowerCase()+'">'+opts.map(([v,n])=>'<option value="'+v+'" '+(draft[key.toLowerCase()]===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label>';}
  async function paint(){
    const token=++latest,slot=dialog.querySelector('.parcel-canvas');
    try{const density=guest&&stages()[step]==='Ready'?2:1;const art=await composePNG(current,draft,density);const c=['Place on screen','Finishing touches','Ready'].includes(stages()[step])?scene(art,draft,density):art;if(token!==latest||!slot?.isConnected)return;finished=c;slot.replaceChildren(c);if(stages()[step]==='Ready')dialog.querySelectorAll('[data-export]').forEach(b=>b.disabled=false);}
    catch(e){if(token===latest)report(e)}
  }
  function edit(){
    cancel=()=>confirmExit(()=>dialog.close());
    const seq=stages(),page=seq[step];let controls='';
    const place=page==='Place on screen'||page==='Finishing touches', crop=page==='Fit photo';
    dialog.classList.toggle('editing',place||crop||page==='Ready');
    if(page==='Upload photo')controls='<label>Upload your photo<input type="file" data-photo accept="image/*"></label>';
    if(crop)controls='<p>Drag your photo inside the frame. Pinch to zoom.</p><label>Photo zoom<input type="range" data-range="zoom" min="1" max="5" step=".02" value="'+draft.zoom+'"></label>';
    if(page==='Write')controls='<label>Write on this design<textarea data-text="words" maxlength="180">'+esc(draft.words)+'</textarea></label>';
    if(place){
      if(page==='Finishing touches')controls='<label>Optional note<textarea data-text="extra" maxlength="180">'+esc(draft.extra)+'</textarea></label><label>Add another picture<input type="file" data-second accept="image/*"></label>'+(draft.second?'<label>Move<select data-layer><option value="framePos">Frame</option><option value="secondPos" '+(draft.layer==='secondPos'?'selected':'')+'>Extra picture</option></select></label><button data-remove>Remove extra picture</button>':'')+'<details><summary>Frame appearance</summary>'+selectControl('Background',palette)+selectControl('Shape',['Rounded','Oval','Square'].map(v=>[v,v]))+selectControl('Border',palette)+'</details>';
      controls='<p>Drag to place it on their screen. Pinch to resize.</p><label>Size<input type="range" data-size min=".12" max="1" step=".01" value="'+draft[draft.layer].size+'"></label>'+controls;
    }
    const colourControl=(label,key,fallback)=>'<label>'+label+'<input type="color" data-setting="'+key+'" value="'+(draft[key]||fallback)+'"></label>';
    if(page==='Write'){
      if(current.category==='Notes')controls+=colourControl('Note paper','paper','#fff1cd');
      controls+=colourControl('Text colour','ink',current.ink);
    }
    if(page==='Finishing touches')controls+=colourControl('Note background','noteFill','#fff4da')+colourControl('Note text','noteInk','#273d31');
    const exportButtons=guest?'<button class="primary" data-export="test" disabled>Use this parcel</button>':'<button class="secondary" data-export="save" disabled>Save PNG</button>'+(!window.Pigeon?'<button class="secondary" data-export="share" disabled>Share PNG</button>':'')+'<button class="primary" data-export="test" disabled>Send test</button>';
    const actions=page==='Ready'?exportButtons:'<button class="primary" data-next>Next</button>';
    shell(current.name,(step+1)+' of '+seq.length+' · '+page,'<div class="parcel-canvas" role="img" aria-label="Parcel preview"></div><div class="parcel-controls">'+controls+'</div><div class="parcel-actions">'+backButton+actions+'</div>',()=>{if(step){step--;if(stages()[step]==='Place on screen')draft.layer='framePos';edit();}else confirmExit(backFromItem);});
    dialog.querySelector('[data-next]')?.addEventListener('click',()=>{if(page==='Upload photo'&&!draft.photo)return report(new Error('Choose a picture first.'));if(page==='Write'&&!draft.words.trim())return report(new Error('Add a few words first.'));step++;edit()});
    dialog.querySelectorAll('[data-setting],[data-range],[data-text]').forEach(el=>el.oninput=()=>{const k=el.dataset.setting||el.dataset.range||el.dataset.text;draft[k]=el.dataset.range?Number(el.value):el.value;dirty=true;paint()});
    const syncSize=()=>{const size=dialog.querySelector('[data-size]');if(size)size.value=draft[draft.layer].size;};
    const size=dialog.querySelector('[data-size]');if(size)size.oninput=()=>{draft[draft.layer].size=Number(size.value);dirty=true;paint();};
    const layer=dialog.querySelector('[data-layer]');if(layer)layer.onchange=()=>{draft.layer=layer.value;syncSize();};
    const remove=dialog.querySelector('[data-remove]');if(remove)remove.onclick=()=>{draft.second=null;draft.layer='framePos';dirty=true;edit();};
    const slot=dialog.querySelector('.parcel-canvas');
    if(crop||place)gestures(slot,(dx,dy,factor,box)=>{
      if(crop){
        const [, , sw,sh]=current.rect, scale=Math.min(574/sw,574/sh), [l,t,r,b]=current.opening;
        const pw=(r-l)*sw*scale,ph=(b-t)*sh*scale;
        draft.zoom=clamp(draft.zoom*factor,1,5);
        const fit=Math.max(pw/draft.photo.width,ph/draft.photo.height)*draft.zoom;
        const move=(value,delta,overflow)=>overflow>0.01?clamp(value-delta*640/box.width/overflow,0,1):.5;
        draft.panX=move(draft.panX,dx,draft.photo.width*fit-pw);draft.panY=move(draft.panY,dy,draft.photo.height*fit-ph);
        dialog.querySelector('[data-range=zoom]').value=draft.zoom;
      } else {
        const pos=draft[draft.layer], ratio=draft.layer==='secondPos'?draft.second.height/draft.second.width:(draft.extra.trim()?1.2:1);
        pos.size=clamp(pos.size*factor,.12,1);
        const width=Math.min(box.width*pos.size,box.height/ratio), height=width*ratio;
        pos.x=clamp(pos.x+dx/Math.max(1,box.width-width),0,1);pos.y=clamp(pos.y+dy/Math.max(1,box.height-height),0,1);syncSize();
      }
      dirty=true;paint();
    });
    const file=dialog.querySelector('[data-photo],[data-second]');
    if(file)file.onchange=async()=>{
      if(!file.files[0])return;
      const url=URL.createObjectURL(file.files[0]),img=new Image();img.src=url;previewURL=url;
      try{await img.decode();if(!file.isConnected||previewURL!==url)return;if(file.hasAttribute('data-second')){draft.second=img;draft.layer='secondPos';dirty=true;edit();}else{draft.photo=img;dirty=true;step++;edit();}}
      catch{report(new Error('Could not open that picture. Try JPG or PNG.'))}finally{URL.revokeObjectURL(url);}
    };
    dialog.querySelectorAll('[data-export]').forEach(btn=>btn.onclick=async()=>{
      const c=finished;if(!c)return;
      try{
        if(btn.dataset.export==='test'){dirty=false;dialog.close();onTest(c.toDataURL('image/png'),current.name,current.category);return;}
        if(window.Pigeon&&btn.dataset.export==='save'){window.Pigeon.savePNG(c.toDataURL('image/png'));return;}
        const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));const file=new File([blob],current.name+'.png',{type:'image/png'});
        if(btn.dataset.export==='share'&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file]});return;}
        const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
        if(btn.dataset.export==='share')dialog.querySelector('.parcel-error').textContent='PNG downloaded. Attach it in your messaging app.';
      }catch(e){if(e.name!=='AbortError')report(e)}
    });paint();
  }
  try{catalog=await getCatalog();availableCategories=categories;
    if(guest){catalog=guestItems(catalog);availableCategories=Object.keys(guestSelection);}
    if(dialog.open){if(options.wheel){group=initialCategory;wheel();}else if(availableCategories.includes(initialCategory)){group=initialCategory;gallery()}else browse()}}
  catch(e){shell('Shop unavailable','Pick & post','<button class="secondary" data-prev>Close</button>',()=>dialog.close());report(e);}
}
