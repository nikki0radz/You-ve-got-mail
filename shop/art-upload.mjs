import {simulateFriendRequest,clearFriendSimulation} from '../post/friend-requests.mjs';
import {birds} from '../post/profile-options.mjs';
import {sortArtwork} from './art-tools.mjs';
import {mountArtworkCrop} from './art-crop.mjs';
import {deleteEntry,libraryCode,listQueue,newCode,readEntry,refreshSharedArt,saveEntry,sharedItems} from './shared-art.mjs';
import {mainCategories,manage,cropMain,avatarSettings,ownerUnlocked,verifyManager,unlockManager,lockManager,queueScope,refreshMainArt,refreshAfterWrite,uploadMain} from './main-art.mjs';
import {catalogueRecords,catalogueImage,catalogueThumbnail,mountCatalogueThumbnail} from './catalogue.mjs';
import {defaultPhotoArea} from './shared-designs.mjs';
import {displayPhotoThumbnail} from './stock-photo.mjs';
import {escapeHtml as esc} from '../domain.mjs';

const kinds={sticker:'Sticker',frame:'Photo frame',postcard:'Postcard',flowers:'Flowers',hug:'Hug',reminder:'Reminder',love:'Love note',avatar:'Profile picture'};
const standard={Stickers:'sticker','Photo frames':'frame',Postcards:'postcard',Flowers:'flowers',Hugs:'hug',Reminders:'reminder','Love notes':'love',Notes:'sticker'};
const initialArea=()=>({x:.12,y:.58,w:.76,h:.26,rotation:0});
let dialog, rows=[],scope=queueScope,busy=false,reading=false,view='',previewURL='',feedback='',progress='',page=0,redraw=0;
let catalogue=[],filter='',query='',selecting=false,sort='newest';
const selected=new Set();
const opt=(value,title,current)=>'<option value="'+esc(value)+'"'+(value===current?' selected':'')+'>'+esc(title)+'</option>';
const by=selector=>dialog.querySelector(selector);
const action=(key,text,cls='secondary')=>'<button type="button" class="'+cls+'" data-art="'+key+'">'+text+'</button>';
function categories(){
  return new Map(mainCategories().map(c=>[c.name,standard[c.name]]));
}
function header(title,body){
  if(previewURL) URL.revokeObjectURL(previewURL);
  previewURL='';
  dialog.innerHTML='<header><button type="button" class="art-close" data-art="close" aria-label="Close">×</button></header><h2>'+title+'</h2>'+body+'<p class="art-feedback" role="status"></p>';
  message(feedback);
}
function message(text){feedback=text;const el=by('.art-feedback');if(el)el.textContent=text;}
function ownerLogin(){
  view='login';feedback='';
  header('Artwork manager','<p>Enter your private owner code to edit the main library.</p><form class="art-join"><label>Owner code<input name="code" type="password" required autocomplete="current-password" spellcheck="false"></label><button class="primary">Unlock manager</button></form>');
  by('form').onsubmit=async e=>{
    e.preventDefault();const submit=by('form button');submit.disabled=true;
    try{await unlockManager(by('[name=code]').value);await loadManager();}
    catch(err){message(err.message);}finally{submit.disabled=false;}
  };
}
async function loadManager(){
  await refreshMainArt();rows=await listQueue(scope);await reloadCatalogue();feedback='';overview();
}
async function reloadCatalogue(){
  catalogue=(await catalogueRecords({includeAvatars:true})).filter(row=>!row.hidden);
  const ids=new Set(catalogue.map(r=>r.id));
  for(const id of selected)if(!ids.has(id))selected.delete(id);
}
async function syncManager(){
  await refreshAfterWrite();await reloadCatalogue();
}
function chooser(category,kind){
  const map=categories(),custom=!map.has(category);
  return '<label>Category<select data-category>'+[...map.keys()].map(n=>opt(n,n,custom?'':category)).join('')+opt('@new','＋ New category',custom?'@new':'')+'</select></label>'+
    '<label data-new-label '+(custom?'':'hidden')+'>New category name<input data-new maxlength="60" value="'+esc(custom?category:'')+'"></label>'+
    '<label>Artwork type<select data-kind>'+Object.entries(kinds).map(([k,v])=>opt(k,v,kind)).join('')+'</select></label>';
}
function pickValues(){
  const category=by('[data-category]').value;
  const name=category==='@new'?by('[data-new]').value.trim():category;
  if(!name)throw Error('Give the new category a name.');
  return {category:name,kind:by('[data-kind]').value};
}
function wireChooser(){
  by('[data-category]').onchange=e=>{
    const value=e.target.value;
    by('[data-new-label]').hidden=value!=='@new';
    if(value==='@new')by('[data-new]').focus();else if(standard[value])by('[data-kind]').value=standard[value];
    by('[data-kind]').dispatchEvent(new Event('change'));
  };
}
function overview(){
  view='queue';
  header('Artwork manager','<p class="art-subtitle">Main library · '+catalogue.length+' pictures</p>'+
    '<input type="file" data-png accept="image/png,.png" multiple hidden>'+action('choose','＋ Upload PNGs','primary')+
    '<div class="art-queue" hidden><h3>Upload queue</h3><p data-progress role="status"></p><ol></ol>'+action('upload','Upload all','primary')+'</div>'+
    '<section class="art-library" aria-label="Main library"><label>Search artwork<input type="search" data-search placeholder="Name, category or tag"></label><label>Show category<select data-filter></select></label><label>Sort by<select data-sort><option value="newest">Last uploaded · newest first</option><option value="oldest">First uploaded · oldest first</option><option value="name">Name · A–Z</option></select></label><div class="art-actions">'+action('select',selecting?'Done selecting':'Select pictures')+action('categories','Manage categories')+'</div><div data-bulk></div><div data-gallery></div></section>'+ (libraryCode()?action('import','Import previous uploads'):'')+action('avatars','Profile picture options','art-link')+action('home-colours','Home colours','art-link')+action('design','Design mode','art-link')+'<section class="art-request-test"><h3>Friend request test</h3><p>Simulation only · on this device. No real request is sent.</p>'+action('simulate-request','Simulate friend request','primary')+action('clear-request-test','Clear simulation')+'</section>'+action('lock','Lock manager','art-link'));
  by('[data-png]').onchange=async e=>{
    const input=e.currentTarget;
    try{await addFiles(Array.from(input.files));}
    catch(error){message(error.message);}
    finally{input.value='';}
  };
  const filterEl=by('[data-filter]');if(!categories().has(filter))filter='';
  filterEl.innerHTML=opt('','All categories',filter)+[...categories().keys()].map(c=>opt(c,c,filter)).join('');
  filterEl.onchange=()=>{filter=filterEl.value;page=0;drawLibrary();};
  by('[data-search]').value=query;by('[data-search]').oninput=e=>{query=e.target.value;page=0;drawLibrary();};
  by('[data-sort]').value=sort;by('[data-sort]').onchange=e=>{sort=e.target.value;page=0;drawLibrary();};
  drawRows();drawLibrary();
}
function drawLibrary(){
  if(view!=='queue'||!dialog.open)return;
  const needle=query.trim().toLowerCase();
  const items=sortArtwork(catalogue,sort).filter(r=>(!filter||r.category===filter)&&[r.name,r.category,r.kind,...r.tags||[]].some(v=>(v||'').toLowerCase().includes(needle)));
  const pages=Math.ceil(items.length/12);
  const bulk=by('[data-bulk]');const dest=bulk.querySelector('[data-dest]')?.value??'',bulkKind=bulk.querySelector('[data-bulk-kind]')?.value||'';
  const bulkTags=bulk.querySelector('[data-bulk-tags]')?.value||'';
  bulk.innerHTML=selecting?'<section class="art-sort"><strong>'+selected.size+' selected</strong>'+action('page-select','Select this page')+'<label>Move to<select data-dest>'+opt('','Keep current category',dest)+[...categories().keys()].map(c=>opt(c,c,dest)).join('')+'</select></label><label>Artwork type<select data-bulk-kind>'+opt('','Keep current type',bulkKind)+Object.entries(kinds).map(([k,v])=>opt(k,v,bulkKind)).join('')+'</select></label><label>Replace tags (optional)<input data-bulk-tags maxlength="700" placeholder="food, brunch" value="'+esc(bulkTags)+'"></label><div class="art-actions">'+action('move','Apply to selected','primary')+action('delete','Delete selected')+'</div></section>':'';
  for(const control of bulk.querySelectorAll('[data-art=move],[data-art=delete]'))control.disabled=!selected.size||busy;
  page=Math.max(0,Math.min(page,pages-1));
  const visible=items.slice(page*12,page*12+12);
  const tiles=visible.map(item=>{
    const label=item.name||item.category;
    return '<button type="button" class="art-tile" data-item="'+esc(item.id)+'" '+(selecting?'aria-pressed="'+selected.has(item.id)+'"':'')+' aria-label="'+(selecting?'Select ':'Edit ')+esc(label)+'"><span class="art-thumb"></span><b>'+esc(label)+'</b><small>'+esc(item.category)+'</small></button>';
  });
  by('[data-gallery]').innerHTML=tiles.length?'<div class="art-tiles">'+tiles.join('')+'</div>':'<p>No pictures match this view.</p>';
  by('[data-gallery]').querySelectorAll('.art-thumb').forEach((host,i)=>mountCatalogueThumbnail(host,visible[i].design));
  if(pages>1){
    by('[data-gallery]').insertAdjacentHTML('beforeend','<nav class="art-pages" aria-label="Library pages">'+action('previous','Previous')+'<span>'+(page+1)+' / '+pages+'</span>'+action('next','Next')+'</nav>');
    by('[data-art="previous"]').disabled=page===0;by('[data-art="next"]').disabled=page===pages-1;
  }
}
function drawRows(){
  if(view!=='queue')return;
  by('.art-queue').hidden=!rows.length&&!reading&&!busy;
  by('ol').innerHTML=rows.map((row,index)=>'<li><span><b>'+esc(row.name||row.fileName)+'</b><small>'+esc(row.error || (row.width+' × '+row.height))+'</small></span>'+
    '<button type="button" data-drop="'+index+'" '+(busy||reading?'disabled':'')+'>Remove</button></li>').join('');
  by('[data-progress]').textContent=progress|| (rows.length?rows.length+' queued':'');
  by('[data-art="choose"]').disabled=busy||reading;
  by('[data-art="upload"]').disabled=busy||reading||!rows.length;
}
async function dimensions(file){
  if(file.size>32*1024*1024)throw Error('exceeds 32 MB');
  const view=new DataView(await file.slice(0,24).arrayBuffer());
  if(view.byteLength!==24||view.getUint32(0)!==0x89504e47||view.getUint32(4)!==0x0d0a1a0a)throw Error('not a PNG');
  const width=view.getUint32(16),height=view.getUint32(20);
  if(!width||!height||width*height>64e6)throw Error('exceeds 64 megapixels');
  return {width,height};
}
async function addFiles(files,{category='Uncategorised',kind='sticker'}={}){
  if(!files.length||busy||reading)return;
  reading=true;const errors=[];let count=0;const base=Date.now();
  try{
    for(let i=0;i<files.length;i++){
      const file=files[i];progress='Preparing '+(i+1)+' of '+files.length+'…';drawRows();
      try{
        const size=await dimensions(file);
        // Keep the original bytes in the queue after Android releases the gallery selection.
        const blob=new Blob([await file.arrayBuffer()],{type:'image/png'});
        const row={id:newCode(),scope,order:base+i,fileName:file.name,name:'',category,kind,textArea:initialArea(),...size};
        await saveEntry('queue',{...row,blob});rows.push(row);count++;
      }catch(e){errors.push(file.name+' ('+e.message+')');}
    }
  }finally{reading=false;progress='';drawRows();}
  if(count){page=0;await upload();}
  if(errors.length)message((feedback?feedback+' ':'')+'Skipped: '+errors.join(', '));
}
async function upload(){
  if(busy||reading||!rows.length)return;
  busy=true;let saved=0;const batch=[...rows];message('');
  try {
    for(let i=0;i<batch.length;i++){
      const row=batch[i];progress='Uploading '+(i+1)+' of '+batch.length+' · '+row.fileName;drawRows();
      try{
        const entry=await readEntry('queue',scope,row.id);
        const item=await uploadMain(entry);if(row.kind==='avatar')await manage('items/'+item.id,{category:row.category,kind:'avatar',name:row.fileName.replace(/\.png$/i,''),seq:item.seq});await deleteEntry('queue',scope,row.id);rows=rows.filter(x=>x.id!==row.id);saved++;
      }catch(e){row.error=e.message||'Upload interrupted.';}
    }
  } finally{
    busy=false;progress='';try{if(saved){filter='';query='';sort='newest';page=0;await syncManager();if(view==='queue')overview();}}catch(e){message('Uploaded. Reopen the manager to refresh the library.');return;}drawRows();message(saved+' of '+batch.length+' uploaded.'+(rows.length?' Tap Upload all to retry the remaining files.':''));
  }
}
async function details(row){
  const original=await catalogueImage(row.design);if(!dialog.open)return;
  view='edit';feedback='';
  header('Picture details','<div class="art-stage"><img alt="Selected artwork"><div class="art-box"></div></div>'+
    '<label>Display name (optional)<input data-name maxlength="96" value="'+esc(row.name||'')+'"></label><div class="art-fields">'+chooser(row.category,row.kind)+'</div>'+
    '<label>Search tags<input data-tags maxlength="700" value="'+esc((row.tags||[]).join(', '))+'" placeholder="food, romance, funny"></label><section class="art-area"><label>Area to edit<select data-area><option value="text">Postcard text area</option><option value="photo">Photo area</option></select></label><label data-photo-mode>Photo placement<select data-placement><option value="auto">Automatic</option><option value="custom">Draw a photo area</option></select></label><p data-area-tip></p><div class="art-coordinates">'+
    [['x','Left'],['y','Top'],['w','Width'],['h','Height'],['rotation','Angle °']].map(([k,n])=>'<label>'+n+'<input type="number" step="any" data-coord="'+k+'"></label>').join('')+'</div></section>'+
    '<div class="art-actions">'+action('cancel-edit','Back')+action('save-edit','Save details','primary')+'</div>'+action('crop','Crop picture','art-link')+(row.cropOriginal?action('restore-crop','Restore original','art-link'):'')+action('delete-one','Delete picture','art-link'));
  let img=by('.art-stage img'),origin=null,previewKey='';
  const box=by('.art-box'),originalURL=original.src||original.toDataURL('image/png');
  img.crossOrigin='anonymous';img.src=originalURL;wireChooser();
  let savedFields='';const fieldState=()=>JSON.stringify([...dialog.querySelectorAll('input,select')].map(el=>[el.dataset,el.value]));
  by('[data-art=crop]').onclick=()=>{if(fieldState()!==savedFields)return message('Save your details before cropping.');cropPicture(row,original);};
  by('[data-art=restore-crop]')?.addEventListener('click',async()=>{try{await manage('restore/'+row.id,{seq:row.seq});await syncManager();await details(catalogue.find(r=>r.id===row.id));}catch(e){message(e.message);}});
  by('[data-art=delete-one]').onclick=()=>deleteRows([row.id]).catch(e=>message(e.message));
  const textArea={...(row.textArea||initialArea())};
  let photoArea=row.photoArea?{...row.photoArea}:null;
  const kind=()=>by('[data-kind]').value;
  const photo=()=>by('[data-area]').value==='photo';
  const area=()=>photo()?photoArea:textArea;
  by('[data-placement]').value=photoArea?'custom':'auto';
  function previewArea(enabled,custom){
    if(!row.design.sharedId||origin)return;
    const selectedArea=custom?photoArea:null;
    const textBox=[textArea.x,textArea.y,textArea.x+textArea.w,textArea.y+textArea.h];
    const key=enabled?JSON.stringify([kind(),selectedArea,textBox]):'original';
    if(key===previewKey)return;
    previewKey=key;
    // A pending preview belongs to its image. Replacing that node also cancels stale draws.
    const next=img.cloneNode(false);
    img.replaceWith(next);img=next;
    if(!enabled||(selectedArea&&!(selectedArea.w>0&&selectedArea.h>0))){
      img.src=originalURL;return;
    }
    displayPhotoThumbnail(img,{...row.design,kind:kind(),photoArea:selectedArea,textBox});
  }
  function show(){
    const enabled=['frame','postcard'].includes(kind());
    const selector=by('[data-area]');
    if(kind()==='frame')selector.value='photo';
    selector.closest('label').hidden=kind()!=='postcard';
    by('.art-area').hidden=!enabled;by('[data-photo-mode]').hidden=!photo();
    const custom=by('[data-placement]').value==='custom';
    if(photo()&&custom&&!photoArea)photoArea=defaultPhotoArea(kind(),[textArea.x,textArea.y,textArea.x+textArea.w,textArea.y+textArea.h]);
    previewArea(enabled,custom);
    const drawing=enabled&&(!photo()||custom);
    by('[data-area-tip]').textContent=photo()&&!custom?'Uses the transparent opening, or an inset for solid artwork.':'Drag across the picture to set the area, or enter percentages below.';
    by('.art-coordinates').hidden=!drawing;box.hidden=!drawing;
    by('.art-stage').classList.toggle('drawing',drawing);
    by('[data-coord=rotation]').closest('label').hidden=photo();
    if(drawing){
      const a=area();
      Object.assign(box.style,{left:a.x*100+'%',top:a.y*100+'%',width:a.w*100+'%',height:a.h*100+'%',transform:'rotate('+(a.rotation||0)+'deg)'});
    }
  }
  function setNumbers(){
    show();const a=area();if(!a)return;
    for(const el of dialog.querySelectorAll('[data-coord]')){
      const k=el.dataset.coord;el.value=Number(((a[k]||0)*(k==='rotation'?1:100)).toFixed(2));
    }
  }
  by('[data-kind]').onchange=()=>{by('[data-area]').value=kind()==='postcard'?'text':'photo';setNumbers();};
  by('[data-area]').onchange=by('[data-placement]').onchange=setNumbers;
  by('[data-kind]').onchange();
  for(const el of dialog.querySelectorAll('[data-coord]'))el.oninput=()=>{area()[el.dataset.coord]=el.valueAsNumber/(el.dataset.coord==='rotation'?1:100);show();};
  const stage=by('.art-stage');
  function point(e){const b=img.getBoundingClientRect(),clamp=x=>Math.min(1,Math.max(0,x));return [clamp((e.clientX-b.left)/b.width),clamp((e.clientY-b.top)/b.height)];}
  stage.onpointerdown=e=>{if(box.hidden)return;stage.setPointerCapture(e.pointerId);origin=point(e);};
  stage.onpointermove=e=>{if(!origin)return;const [x,y]=point(e);Object.assign(area(),{x:Math.min(x,origin[0]),y:Math.min(y,origin[1]),w:Math.abs(x-origin[0]),h:Math.abs(y-origin[1])});setNumbers();};
  stage.onpointerup=stage.onpointercancel=()=>{origin=null;show();};
  savedFields=fieldState();
  by('[data-art="save-edit"]').onclick=async()=>{
    if(busy||reading)return;busy=true;by('[data-art="save-edit"]').disabled=true;
    try{const {category,kind}=pickValues();
      const valid=a=>a&&[a.x,a.y,a.w,a.h].every(Number.isFinite)&&a.x>=0&&a.y>=0&&a.w>=.01&&a.h>=.01&&a.x+a.w<=1.00001&&a.y+a.h<=1.00001;
      if(kind==='postcard'&&(!valid(textArea)||!Number.isFinite(textArea.rotation)||Math.abs(textArea.rotation)>180))throw Error('Keep the writing area inside the picture and the angle between −180° and 180°.');
      const manual=['frame','postcard'].includes(kind)&&by('[data-placement]').value==='custom';
      if(manual&&!valid(photoArea))throw Error('Keep the photo area inside the picture.');
      const values={category,kind,textArea,photoArea:manual?photoArea:null,name:by('[data-name]').value.trim()};
      if(by('[data-category]').value==='@new'&&!categories().has(category))await manage('categories',{action:'create',name:category});
      await manage('items/'+row.id,{...values,seq:row.seq||0,tags:by('[data-tags]').value.split(',').map(s=>s.trim()).filter(Boolean)});
      await syncManager();feedback='Picture updated.';overview();
    }catch(e){message(e.message);if(e.status===409)await syncManager().catch(()=>{});}
    finally{busy=false;const save=by('[data-art="save-edit"]');if(save)save.disabled=false;drawRows();}
  };
}
export async function openArtworkUploads(){
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='art-upload';dialog.setAttribute('aria-label','Artwork manager');document.body.append(dialog);
    window.addEventListener('shared-art-updated',()=>{
      if(view!=='queue'||!dialog.open)return;cancelAnimationFrame(redraw);redraw=requestAnimationFrame(async()=>{await reloadCatalogue();drawLibrary();});
    });
    dialog.addEventListener('click',async e=>{
      const btn=e.target.closest('button');if(!btn)return;
      if((busy||reading)&&!['close'].includes(btn.dataset.art))return;
      try{
        if(btn.dataset.item){
          if(busy||reading)return message('Please wait for the upload to finish.');
          if(selecting){const id=btn.dataset.item;if(selected.has(id))selected.delete(id);else selected.add(id);drawLibrary();return;}
          const row=catalogue.find(item=>item.id===btn.dataset.item);
          if(row)await details(row);return;
        }
        if(btn.dataset.drop!==undefined&&!busy&&!reading){
          const row=rows[Number(btn.dataset.drop)];if(row){await deleteEntry('queue',scope,row.id);rows=rows.filter(x=>x.id!==row.id);drawRows();}return;
        }
        switch(btn.dataset.art){
          case 'close':dialog.close();break;
          case 'simulate-request':await verifyManager();dialog.close();simulateFriendRequest();break;
          case 'clear-request-test':await verifyManager();clearFriendSimulation();message('Friend request simulation cleared.');break;
          case 'home-colours':await verifyManager();dialog.close();await window.openPigeonHomeColours?.();break;
          case 'design':await verifyManager();dialog.close();if(!await window.openPigeonDesignTools?.())throw Error('Unlock the artwork manager to use Design mode.');break;
          case 'lock':if(!busy&&!reading){lockManager();selected.clear();ownerLogin();}break;
          case 'avatars':await avatarPage();break;
          case 'select':selecting=!selecting;selected.clear();overview();break;
          case 'page-select':for(const tile of dialog.querySelectorAll('[data-item]'))selected.add(tile.dataset.item);drawLibrary();break;
          case 'move':await batchAction([...selected],{action:'move',category:by('[data-dest]').value,kind:by('[data-bulk-kind]').value,tags:by('[data-bulk-tags]').value.trim()?by('[data-bulk-tags]').value.split(',').map(s=>s.trim()).filter(Boolean):undefined});break;
          case 'delete':await deleteRows([...selected]);break;
          case 'categories':if(!busy&&!reading)categoryPage();break;
          case 'import':if(!busy&&!reading)await importPage();break;
          case 'retry-load':await loadManager();break;
          case 'choose':by('[data-png]').click();break;
          case 'previous':page--;drawLibrary();break;
          case 'next':page++;drawLibrary();break;
          case 'upload':await upload();break;
          case 'cancel-edit':if(busy)break;feedback='';overview();break;

        }
      }catch(err){if(err.status===403)ownerLogin();message(err.message);}
    });
  }
  if(!dialog.open)dialog.showModal();
  if(busy||reading)return;
  if(!ownerUnlocked()){ownerLogin();return;}
  try{await loadManager();}catch(e){if(!ownerUnlocked())ownerLogin();else {view='error';header('Artwork manager',action('retry-load','Try again'));};message(e.message);}
}

async function batchAction(ids,operation){
  if(!ids.length||busy)return;
  busy=true;message('Saving…');
  try{
    for(let i=0;i<ids.length;i+=90){
      const group=ids.slice(i,i+90);
      await manage('bulk',{...operation,ids:group});
      for(const id of group)selected.delete(id);
    }
    await syncManager();selecting=false;feedback=operation.action==='delete'?'Pictures deleted.':'Pictures updated.';overview();
  }catch(e){await syncManager().catch(()=>{});message(e.message);}
  finally{busy=false;drawRows();drawLibrary();}
}
async function deleteRows(ids){
  if(ids.length&&confirm('Delete '+ids.length+' '+(ids.length===1?'picture':'pictures')+' from the main library for everyone?'))await batchAction(ids,{action:'delete'});
}
function categoryPage(){
  view='categories';feedback='';
  const list=mainCategories().filter(c=>c.id!==1);
  header('Manage categories','<form data-create><label>New category<input name="name" maxlength="60" required placeholder="e.g. Food frames"></label><button class="primary">Create category</button></form>'+
    (list.length?'<form data-category-edit><label>Existing category<select name="from">'+list.map(c=>opt(c.name,c.name,'')).join('')+'</select></label><label>Category name<input name="name" required maxlength="60"></label><div class="art-actions"><button class="primary">Rename</button>'+action('remove-category','Delete category')+'</div></form>':'')+action('cancel-edit','Back to pictures'));
  async function change(body){
    if(busy)return;busy=true;
    try{await manage('categories',body);await syncManager();categoryPage();message('Categories updated.');}
    catch(e){message(e.message);}finally{busy=false;}
  }
  by('[data-create]').onsubmit=e=>{e.preventDefault();change({action:'create',name:e.target.elements.name.value.trim()});};
  const form=by('[data-category-edit]');if(!form)return;
  const from=form.elements.from,name=form.elements.name;
  from.onchange=()=>{name.value=from.value;};from.onchange();
  form.onsubmit=e=>{e.preventDefault();change({action:'rename',from:from.value,name:name.value.trim()});};
  by('[data-art=remove-category]').onclick=()=>{if(confirm('Delete “'+from.value+'”? Its pictures will move to Uncategorised.'))change({action:'delete',from:from.value});};
}
async function importPage(){
  view='import';feedback='';
  header('Import previous uploads','<p>Choose pictures from your previous shared library to publish in the main library.</p><div data-import-list></div>'+action('publish-import','Publish selected','primary')+action('cancel-edit','Back'));
  await refreshSharedArt();if(view!=='import')return;
  const entries=sharedItems(),published=new Set(catalogue.map(r=>r.id));
  const candidates=entries.filter(r=>!published.has(r.id));
  by('[data-import-list]').innerHTML=candidates.map(r=>'<label class="art-import-row"><input type="checkbox" value="'+esc(r.id)+'"><img alt="" loading="lazy" src="'+esc(r.src)+'"><span>'+esc(r.name||r.category)+'</span></label>').join('')||'<p>No more pictures to import.</p>';
  const publish=by('[data-art=publish-import]');publish.disabled=!candidates.length;
  publish.onclick=async()=>{
    if(busy)return;
    const checks=[...dialog.querySelectorAll('[data-import-list] input:checked')];if(!checks.length)return message('Select a picture first.');
    busy=true;publish.disabled=true;let count=0;
    try{
      for(const check of checks){
        const previous=await readEntry('items',libraryCode(),check.value);if(!previous)continue;
        const item=await uploadMain({...previous,scope:queueScope,id:'import-'+previous.id});
        if(!mainCategories().some(c=>c.name===previous.category)){
          try{await manage('categories',{action:'create',name:previous.category});}catch(e){if(e.status!==409)throw e;}
        }
        await manage('items/'+previous.id,{...Object.fromEntries(['category','kind','name','textArea','photoArea','tags'].map(k=>[k,previous[k]])),seq:item.seq});
        ++count;check.checked=false;check.disabled=true;message(count+' published.');
      }
      await syncManager();feedback=count+' published.';overview();
    }catch(e){message(count+' published. '+e.message);}finally{busy=false;publish.disabled=false;drawRows();}
  };
}

async function cropPicture(row,image){
 view='crop';header('Crop picture','<div data-crop-editor></div>');
 mountArtworkCrop(by('[data-crop-editor]'),image,{onBack:()=>details(row),save:async(blob,crop,size)=>{await cropMain(row,blob,crop,size);await syncManager();await details(catalogue.find(r=>r.id===row.id));message('Crop saved for everyone.');}});
}

async function avatarPage(){
 view='avatars';
 const hidden=new Set(avatarSettings().hidden||[]),uploads=catalogue.filter(r=>r.kind==='avatar');
 header('Profile picture options','<p>Choose which pictures appear in the profile picker. Existing profile photos stay as they are.</p><input hidden type="file" data-avatar-png accept="image/png,.png" multiple>'+action('avatar-upload','＋ Upload profile pictures','primary')+'<h3>Uploaded pictures</h3><div class="art-tiles">'+uploads.map(r=>'<button class="art-tile" data-item="'+esc(r.id)+'">'+catalogueThumbnail(r.design)+'<b>'+esc(r.name||'Profile picture')+'</b></button>').join('')+'</div><h3>Pigeon portraits</h3><div class="avatar-controls">'+birds.map((name,i)=>'<label><span class="avatar-sprite" style="background-position:'+i%6*20+'% '+Math.floor(i/6)*25+'%"></span><span>'+esc(name)+'</span><input type="checkbox" data-avatar-visible="'+i+'" '+(hidden.has(i)?'':'checked')+'></label>').join('')+'</div><div class="art-actions">'+action('avatar-back','Back')+action('avatar-save','Save available portraits','primary')+'</div>');
 by('[data-art=avatar-back]').onclick=overview;
 by('[data-art=avatar-save]').onclick=async()=>{try{const hidden=[...dialog.querySelectorAll('[data-avatar-visible]:not(:checked)')].map(el=>Number(el.dataset.avatarVisible));await manage('avatars',{hidden});await syncManager();message('Profile picture options saved for everyone.');}catch(e){message(e.message);}};
 by('[data-art=avatar-upload]').onclick=()=>by('[data-avatar-png]').click();
 by('[data-avatar-png]').onchange=async e=>{try{if(!mainCategories().some(c=>c.name==='Profile pictures')){await manage('categories',{action:'create',name:'Profile pictures'});await refreshAfterWrite();}await addFiles([...e.target.files],{category:'Profile pictures',kind:'avatar'});await avatarPage();}catch(err){message(err.message);}};
}
