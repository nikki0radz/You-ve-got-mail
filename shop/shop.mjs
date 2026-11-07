import {fonts} from './lettering.mjs';
import {colourButton} from './colour-wheel.mjs';
import {mountCategoryWheel} from './category-wheel.mjs';
import {guestItems,guestSelection} from './guest-selection.mjs?v=complete-stickers';
import {startGuestStudio} from './guest-studio.mjs?v=complete-stickers';
import {mountFrameReel} from './frame-reel.mjs';
import {gestures,clamp,scene} from './placement.mjs';
import {composePNG} from './compositor.mjs';
import {escapeHtml as esc} from '../domain.mjs';
import {sharedDesigns,prepareSharedFrame,shopCategoryName as displayName} from './shared-designs.mjs';

const categories=['Notes','Photos','Postcards','Flowers','Love notes','Reminders','Stickers'];
const palette=[['','None'],['#fff1d4','Cream'],['#c1d6bc','Pale forest'],['#d9cce8','Lilac'],['#45634d','Forest']];
let appCatalog;
async function getCatalog(){
  if(appCatalog)return appCatalog;
  const response=await fetch('assets/post/catalog.json?v=editable-reminders');
  if(!response.ok)throw new Error('The shop could not load. Open it again to retry.');
  appCatalog=await response.json();return appCatalog;
}
function miniature(item){
  const [x,y,w,h]=item.rect;
  const clip=item.artClip?' style="clip-path:path(evenodd, &quot;'+esc(item.artClip)+'&quot;)"':'';
  return '<svg viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><g'+clip+'><svg width="'+w+'" height="'+h+'" viewBox="'+[x,y,w,h].join(' ')+'" overflow="hidden"><image href="'+esc(item.sheet)+'" width="'+item.sheetWidth+'" height="'+item.sheetHeight+'"/></svg></g></svg>';
}
// Six approved previews already show the sample cat in the finished design.
const catPreviews=new Map([...guestSelection.Photos,guestSelection.Postcards.find(([id])=>id===105)]
  .map(([id,name])=>[name,'assets/guest/wheel-'+String(id).padStart(3,'0')+'.webp']));
let maskSerial=0;
const selections={app:new Map(),invitation:new Map(),reply:new Map()};
function reelPreview(item){
  if(item.sharedId)return '<img alt="" draggable="false" src="'+esc(item.master)+'">';
  const cat=(item.category==='Photos'||item.category==='Postcards') && catPreviews.get(item.name);
  if(cat||(item.master&&!item.maskSheet))return '<img alt="" draggable="false" src="'+esc(cat||item.master)+'">';
  if(!item.maskSheet)return miniature(item);
  const [x,y,w,h]=item.rect,[left,top,right,bottom]=item.opening;
  const key='reel-mask-'+(++maskSerial);
  // Crop the unobstructed photo from the approved Instant print example.
  const sample='<svg x="'+left*w+'" y="'+top*h+'" width="'+(right-left)*w+'" height="'+(bottom-top)*h+'" viewBox="25 29 141 120" preserveAspectRatio="xMidYMid slice"><image href="assets/guest/wheel-031.webp" width="193" height="205"/></svg>';
  const crop=path=>'<svg width="'+w+'" height="'+h+'" viewBox="'+[x,y,w,h].join(' ')+'"><image href="'+esc(path)+'" width="'+item.sheetWidth+'" height="'+item.sheetHeight+'"/></svg>';
  const foreground=item.master?'<image href="'+esc(item.master)+'" width="'+w+'" height="'+h+'"/>':crop(item.sheet);
  return '<svg aria-hidden="true" viewBox="0 0 '+w+' '+h+'"><defs><mask id="'+key+'" maskUnits="userSpaceOnUse" x="0" y="0" width="'+w+'" height="'+h+'">'+crop(item.maskSheet)+'</mask></defs><g mask="url(#'+key+')">'+sample+'</g>'+foreground+'</svg>';
}

export function backInShop(){
  const dialog=document.querySelector('#parcel-shop[open]');
  if(!dialog)return false;
  const colour=document.querySelector('.ink-picker[open]');
  if(colour)colour.close();
  else dialog.dispatchEvent(new Event('cancel',{cancelable:true}));
  return true;
}

export function openReplyShop(onReady,initialCategory='Stickers',onCancel){
  return openShop(onReady,initialCategory,{curated:true,wheel:true,studio:true,onCancel});
}

export async function openShop(onTest, initialCategory, options={}, initialDesign=null){
  // Existing guest links call openShop with true.
  const guest=options===true || Boolean(options.curated);
  const studio=guest || Boolean(options.studio);
  let completed=false;

  const dialog=document.querySelector('#parcel-shop');
  let catalog,availableCategories;
  let current,group,draft,step=0,latest=0,dirty=false,finished;
  let gridScroll=0,previewURL,backFromItem;
  let disposeReel,refreshTimer;
  const chosenDesign=options.wheel?selections.reply:guest?selections.invitation:selections.app;
  const trigger=document.activeElement;
  if(dialog.open)return;
  // A close event is queued by the browser. Finish the previous session before reopening.
  dialog.onclose?.();
  dialog.showModal();
  const cleanup=()=>{if(dialog.open)return;clearTimeout(refreshTimer);window.removeEventListener('shared-art-updated',scheduleListingUpdate);dialog.onclose=null;disposeReel?.();latest++;if(previewURL)URL.revokeObjectURL(previewURL);dialog.classList.remove('editing','guest-studio');dialog.replaceChildren();trigger?.focus();if(!completed)options.onCancel?.();};
  dialog.onclose=cleanup;
  let cancel=()=>dialog.close();
  let navigateBack=()=>cancel();
  dialog.oncancel=e=>{e.preventDefault();navigateBack();};
  const shell=(name,status,body,back,guestLibrary=false)=>{
    disposeReel?.();disposeReel=null;
    navigateBack=back||(()=>cancel());
    const header=guestLibrary?
      '<header class="parcel-head guest-library-head"><button type="button" class="wheel-back pocket-back" data-prev><span class="back-arrow" aria-hidden="true"></span> Back</button><small>'+esc(status)+'</small></header>':
      '<header class="parcel-head"><small>'+esc(status)+'</small><button type="button" aria-label="Close" class="parcel-x">×</button></header>';
    dialog.dataset.reviewScreen='shop / '+name+' / '+status;
    dialog.innerHTML=header+'<h2>'+esc(name)+'</h2>'+body+'<p role="alert" class="parcel-error"></p>';
    const close=dialog.querySelector('.parcel-x');if(close)close.onclick=()=>cancel();
    const prev=dialog.querySelector('[data-prev]');if(prev)prev.onclick=back;
    dialog.scrollTop=0;
  };
  const report=e=>{const line=dialog.querySelector('.parcel-error');if(line)line.textContent=e.message||String(e);};
  const backButton='<button class="secondary" data-prev><span class="back-arrow" aria-hidden="true"></span> Back</button>';
  const chooseItem=it=>{current=it;step=0;dirty=false;
    if(studio){
      disposeReel?.();disposeReel=null;
      startGuestStudio(dialog,it,backFromItem,async(image,name,category,reopen)=>{
        const resume=()=>{dialog.onclose=cleanup;reopen();};
        await onTest(image,name,category,resume,it.deliveryKind);completed=true;dialog.close();
      });
      return;
    }
    draft={words:it.labelPatch?it.name:'',extra:'',photo:null,zoom:1,panX:.5,panY:.5,shape:'Rounded',background:'',border:'',framePos:{x:.5,y:.45,size:.85},secondPos:{x:.78,y:.78,size:.3},second:null,layer:'framePos'};edit();};
  function wheel(){
    disposeReel?.();disposeReel=null;
    mountCategoryWheel(dialog,{initialCategory:group,additional:catalog.filter(item=>item.sharedId),onBack:()=>dialog.close(),onBrowse:category=>{
      group=category;gridScroll=0;library();
    }});
    cancel=()=>dialog.close();navigateBack=cancel;dialog.scrollTop=0;
  }
  const designKey=item=>item.sharedId||item.category+'/'+item.name;
  function library(grid=false){
    dialog.classList.remove('editing');dirty=false;cancel=()=>dialog.close();
    const items=group==='All'?catalog:catalog.filter(item=>item.category===group);
    if(group==='Photos')items.sort((a,b)=>Number(b.name==='Instant print')-Number(a.name==='Instant print'));
    const label=group==='All'?'All designs':displayName(group),unit=group==='Photos'?'frames':'designs';
    const back=grid?()=>library():options.wheel?wheel:()=>dialog.close();
    let content;
    if(grid){
      content='<div class="library-grid">'+items.map((item,i)=>'<button type="button" data-design="'+i+'" aria-label="Edit '+esc(item.name)+'"><span class="grid-art"></span><span>'+esc(item.name)+'</span></button>').join('')+'</div>';
    }else{
      content='<div class="frame-card" data-base-look="railwidth-1" data-review-look="railwidth-1"><div class="frame-rail" role="group" aria-label="Swipe through '+esc(label)+'"></div><h3 class="frame-name" data-base-look="catalogfont-1" data-review-look="catalogfont-1" aria-live="polite"></h3></div><div class="frame-index"><span>All '+unit+'</span><span class="frame-count"></span><button type="button" class="library-see-all" data-grid>See all</button></div><div class="frame-thumbs" role="group" aria-label="All '+esc(label)+'"></div><button class="primary frame-use"></button>';
    }
    const guestLibrary=options===true;
    shell(label,items.length+' '+unit,(guestLibrary?'':backButton)+content,back,guestLibrary);
    const remember=item=>chosenDesign.set(group,designKey(item));
    const pick=async item=>{
      const rail=dialog.querySelector('.frame-rail,.library-grid');
      try{item=await prepareSharedFrame(item);}catch(error){if(rail?.isConnected)report(error);return;}
      if(!dialog.open||!rail?.isConnected)return;
      remember(item);if(grid)gridScroll=dialog.scrollTop;
      backFromItem=()=>library(grid);chooseItem(item);
    };
    if(grid){
      const tiles=[...dialog.querySelectorAll('[data-design]')];
      const paint=tile=>{tile.querySelector('.grid-art').innerHTML=reelPreview(items[Number(tile.dataset.design)]);};
      const observer=new IntersectionObserver(entries=>{
        for(const {target,isIntersecting} of entries)if(isIntersecting){paint(target);observer.unobserve(target);}
      },{root:dialog,rootMargin:'300px'});
      for(const tile of tiles){
        observer.observe(tile);
        tile.onclick=()=>pick(items[Number(tile.dataset.design)]);
      }
      disposeReel=()=>observer.disconnect();
      dialog.scrollTop=gridScroll;
    }else{
      dialog.querySelector('[data-grid]').onclick=()=>{gridScroll=0;library(true);};
      const first=Math.max(0,items.findIndex(item=>designKey(item)===chosenDesign.get(group)));
      disposeReel=mountFrameReel(dialog,items,first,reelPreview,remember,pick);
    }
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
    try{const density=stages()[step]==='Ready'?2:1;const art=await composePNG(current,draft,density);const c=['Place on screen','Finishing touches','Ready'].includes(stages()[step])?scene(art,draft,density):art;if(token!==latest||!slot?.isConnected)return;finished=c;slot.replaceChildren(c);if(stages()[step]==='Ready')dialog.querySelectorAll('[data-export]').forEach(b=>b.disabled=false);}
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
    const editableColours=[];
    if(page==='Write'){
      if(current.category==='Notes')editableColours.push(['Paper','Note paper colour','paper','#fff1cd']);
      editableColours.push(['Text','Design text colour','ink',current.ink]);
    }
    if(page==='Finishing touches')editableColours.push(['Banner','Banner colour','noteFill','#fff4da'],['Text','Banner text colour','noteInk','#273d31']);
    if(editableColours.length)controls+='<div class="ink-row"></div>';
    const exportButtons=guest?'<button class="primary" data-export="test" disabled>Use this parcel</button>':'<button class="secondary" data-export="save" disabled>Save PNG</button>'+(!window.Pigeon?'<button class="secondary" data-export="share" disabled>Share PNG</button>':'')+'<button class="primary" data-export="test" disabled>Send test</button>';
    const actions=page==='Ready'?exportButtons:'<button class="primary" data-next>Next</button>';
    shell(current.name,(step+1)+' of '+seq.length+' · '+page,'<div class="parcel-canvas" role="img" aria-label="Parcel preview"></div><div class="parcel-controls">'+controls+'</div><div class="parcel-actions">'+backButton+actions+'</div>',()=>{if(step){step--;if(stages()[step]==='Place on screen')draft.layer='framePos';edit();}else confirmExit(backFromItem);});
    for(const [label,accessible,key,fallback] of editableColours){
      dialog.querySelector('.ink-row').append(colourButton(label,accessible,draft[key]||fallback,value=>{draft[key]=value;dirty=true;paint();}));
    }
    if(editableColours.length){
      const key=page==='Write'?'font':'extraFont',picker=document.createElement('select');
      picker.className='note-font';picker.setAttribute('aria-label',page==='Write'?'Note font':'Banner font');
      for(const label of Object.keys(fonts))picker.append(new Option(label,label));
      picker.value=draft[key]||'Handwritten';picker.onchange=()=>{draft[key]=picker.value;dirty=true;paint();};
      dialog.querySelector('.ink-row').append(picker);
    }
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
  function scheduleListingUpdate(){
    clearTimeout(refreshTimer);refreshTimer=setTimeout(updateSharedListing,300);
  }
  function updateSharedListing(){
    const uploaded=sharedDesigns();
    catalog=[...uploaded,...catalog.filter(item=>!item.sharedId)];
    availableCategories=[...new Set([...categories,...catalog.map(item=>item.category)])];
    if(!dialog.open)return;
    if(dialog.querySelector('.category-reel'))wheel();
    else if(dialog.querySelector('.frame-rail,.library-grid')){
      if(!availableCategories.includes(group))group='All';
      library(Boolean(dialog.querySelector('.library-grid')));
    }
  }
  try{catalog=await getCatalog();availableCategories=categories;
    if(guest){catalog=guestItems(catalog);availableCategories=Object.keys(guestSelection);}
    if(options!==true&&dialog.open){
      window.addEventListener('shared-art-updated',scheduleListingUpdate);
      const uploaded=sharedDesigns();
      catalog=[...uploaded,...catalog];
      availableCategories=[...new Set([...availableCategories,...uploaded.map(item=>item.category)])];
    }
    if(dialog.open){group=availableCategories.includes(initialCategory)?initialCategory:'All';if(initialDesign&&catalog.some(it=>it.category===group&&it.name===initialDesign)){backFromItem=library;chooseItem(await prepareSharedFrame(catalog.find(it=>it.category===group&&it.name===initialDesign)));}else if(options.wheel)wheel();else library();}
  }
  catch(e){shell('Shop unavailable','Pick & post','<button class="secondary" data-prev>Close</button>',()=>dialog.close());report(e);}
}
