import {connectLibrary,deleteEntry,libraryCode,listQueue,newCode,publishEntry,readEntry,refreshSharedArt,saveEntry,sharedItems,updateArtwork} from './shared-art.mjs';
import {defaultPhotoArea} from './shared-designs.mjs';
import {escapeHtml as esc} from '../domain.mjs';

const kinds={sticker:'Sticker',frame:'Photo frame',postcard:'Postcard',flowers:'Flowers',hug:'Hug',reminder:'Reminder',love:'Love note'};
const standard={Stickers:'sticker','Photo frames':'frame',Postcards:'postcard',Flowers:'flowers',Hugs:'hug',Reminders:'reminder','Love notes':'love',Notes:'sticker'};
const initialArea=()=>({x:.12,y:.58,w:.76,h:.26,rotation:0});
let dialog, rows=[],scope='',busy=false,reading=false,view='',previewURL='',feedback='',progress='',page=0,redraw=0;
const opt=(value,title,current)=>'<option value="'+esc(value)+'"'+(value===current?' selected':'')+'>'+esc(title)+'</option>';
const by=selector=>dialog.querySelector(selector);
const action=(key,text,cls='secondary')=>'<button type="button" class="'+cls+'" data-art="'+key+'">'+text+'</button>';
function categories(){
  const map=new Map(Object.entries(standard));
  for(const entry of [...sharedItems(),...rows])if(!map.has(entry.category))map.set(entry.category,entry.kind);
  return map;
}
function header(title,body){
  if(previewURL) URL.revokeObjectURL(previewURL);
  previewURL='';
  dialog.innerHTML='<header><button type="button" class="art-close" data-art="close" aria-label="Close">×</button></header><h2>'+title+'</h2>'+body+'<p class="art-feedback" role="status"></p>';
  message(feedback);
}
function message(text){feedback=text;const el=by('.art-feedback');if(el)el.textContent=text;}
function pairing(){
  view='pair';
  header('Shared artwork','<p>Create a library on one phone. On the other, enter its code to share uploads.</p>'+
    action('create','Create a library','primary')+'<form class="art-join"><label>Library code<input name="code" required spellcheck="false" autocomplete="off" placeholder="Paste the code"></label><button class="secondary">Join library</button></form>');
  by('form').onsubmit=e=>{e.preventDefault();join(by('[name=code]').value,false);};
}
async function join(code,create){
  if(busy)return;busy=true;
  try{message('Connecting…');await connectLibrary(code,create);scope=libraryCode();page=0;rows=await listQueue(scope);feedback='';overview();}
  catch(e){message(e.message);}finally{busy=false;drawRows();}
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
    if(value==='@new')by('[data-new]').focus();else by('[data-kind]').value=categories().get(value)||'sticker';
    by('[data-kind]').dispatchEvent(new Event('change'));
  };
}
function overview(){
  view='queue';
  const code=scope.match(/.{4}/g).join('-');
  header('Upload pictures','<details class="art-share"><summary>Share this library</summary><p>Anyone with this code can view and add artwork.</p><input aria-label="Your library code" readonly value="'+code+'">'+action('copy','Copy code')+action('switch','Join another library')+'</details>'+
    '<input type="file" data-png accept="image/png,.png" multiple hidden>'+action('choose','＋ Upload PNGs','primary')+
    '<div class="art-queue" hidden><h3>Upload queue</h3><p data-progress role="status"></p><ol></ol>'+action('upload','Upload all','primary')+'</div>'+
    '<section class="art-library" aria-label="Your library"><h3>Your library</h3><div data-gallery></div></section>');
  by('[data-png]').onchange=e=>{const files=Array.from(e.target.files);e.target.value='';addFiles(files);};
  drawRows();drawLibrary();
}
function drawLibrary(){
  if(view!=='queue'||!dialog.open)return;
  const items=sharedItems().sort((a,b)=>b.seq-a.seq),pages=Math.ceil(items.length/12);
  page=Math.max(0,Math.min(page,pages-1));
  const tiles=items.slice(page*12,page*12+12).map(item=>{
    const label=item.name||item.category;
    return '<button type="button" class="art-tile" data-item="'+esc(item.id)+'" aria-label="Edit '+esc(label)+'"><img loading="lazy" decoding="async" alt="" src="'+esc(item.src)+'"><b>'+esc(label)+'</b>'+(item.name?'<small>'+esc(item.category)+'</small>':'')+'</button>';
  });
  by('[data-gallery]').innerHTML=tiles.length?'<div class="art-tiles">'+tiles.join('')+'</div>':'<p>Your uploaded pictures will appear here.</p>';
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
async function addFiles(files){
  if(!files.length||busy||reading)return;
  const category='Uncategorised',kind='sticker';
  reading=true;const errors=[];let count=0;const base=Date.now();
  try{
    for(let i=0;i<files.length;i++){
      const file=files[i];progress='Preparing '+(i+1)+' of '+files.length+'…';drawRows();
      try{
        const row={id:newCode(),scope,order:base+i,fileName:file.name,name:'',category,kind,textArea:initialArea(),...await dimensions(file)};
        await saveEntry('queue',{...row,blob:file});rows.push(row);count++;
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
        await publishEntry(entry);rows=rows.filter(x=>x.id!==row.id);saved++;
      }catch(e){row.error=e.message||'Upload interrupted.';}
    }
  } finally{
    busy=false;progress='';drawRows();message(saved+' of '+batch.length+' uploaded.'+(rows.length?' Tap Upload all to retry the remaining files.':''));
  }
}
async function details(row){
  const entry=await readEntry('items',scope,row.id);if(!entry||!dialog.open)return;
  row=entry;
  view='edit';feedback='';
  header('Picture details','<div class="art-stage"><img alt="Selected artwork"><div class="art-box"></div></div>'+
    '<label>Display name (optional)<input data-name maxlength="96" value="'+esc(row.name)+'"></label><div class="art-fields">'+chooser(row.category,row.kind)+'</div>'+
    '<section class="art-area"><label>Area to edit<select data-area><option value="text">Postcard text area</option><option value="photo">Photo area</option></select></label><label data-photo-mode>Photo placement<select data-placement><option value="auto">Automatic</option><option value="custom">Draw a photo area</option></select></label><p data-area-tip></p><div class="art-coordinates">'+
    [['x','Left'],['y','Top'],['w','Width'],['h','Height'],['rotation','Angle °']].map(([k,n])=>'<label>'+n+'<input type="number" step="any" data-coord="'+k+'"></label>').join('')+'</div></section>'+
    '<div class="art-actions">'+action('cancel-edit','Back')+action('save-edit','Save details','primary')+'</div>');
  previewURL=URL.createObjectURL(entry.blob);const img=by('.art-stage img'),box=by('.art-box');
  img.src=previewURL;wireChooser();
  const textArea={...(row.textArea||initialArea())};
  let photoArea=row.photoArea?{...row.photoArea}:null;
  const kind=()=>by('[data-kind]').value;
  const photo=()=>by('[data-area]').value==='photo';
  const area=()=>photo()?photoArea:textArea;
  by('[data-placement]').value=photoArea?'custom':'auto';
  function show(){
    const enabled=['frame','postcard'].includes(kind());
    const selector=by('[data-area]');
    if(kind()==='frame')selector.value='photo';
    selector.closest('label').hidden=kind()!=='postcard';
    by('.art-area').hidden=!enabled;by('[data-photo-mode]').hidden=!photo();
    const custom=by('[data-placement]').value==='custom';
    if(photo()&&custom&&!photoArea)photoArea=defaultPhotoArea(kind(),[textArea.x,textArea.y,textArea.x+textArea.w,textArea.y+textArea.h]);
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
  const stage=by('.art-stage');let origin=null;
  function point(e){const b=img.getBoundingClientRect(),clamp=x=>Math.min(1,Math.max(0,x));return [clamp((e.clientX-b.left)/b.width),clamp((e.clientY-b.top)/b.height)];}
  stage.onpointerdown=e=>{if(box.hidden)return;stage.setPointerCapture(e.pointerId);origin=point(e);};
  stage.onpointermove=e=>{if(!origin)return;const [x,y]=point(e);Object.assign(area(),{x:Math.min(x,origin[0]),y:Math.min(y,origin[1]),w:Math.abs(x-origin[0]),h:Math.abs(y-origin[1])});setNumbers();};
  stage.onpointerup=stage.onpointercancel=()=>{origin=null;};
  by('[data-art="save-edit"]').onclick=async()=>{
    if(busy||reading)return;busy=true;by('[data-art="save-edit"]').disabled=true;
    try{const {category,kind}=pickValues();
      const valid=a=>a&&[a.x,a.y,a.w,a.h].every(Number.isFinite)&&a.x>=0&&a.y>=0&&a.w>=.01&&a.h>=.01&&a.x+a.w<=1.00001&&a.y+a.h<=1.00001;
      if(kind==='postcard'&&(!valid(textArea)||!Number.isFinite(textArea.rotation)||Math.abs(textArea.rotation)>180))throw Error('Keep the writing area inside the picture and the angle between −180° and 180°.');
      const manual=['frame','postcard'].includes(kind)&&by('[data-placement]').value==='custom';
      if(manual&&!valid(photoArea))throw Error('Keep the photo area inside the picture.');
      const values={category,kind,textArea,photoArea:manual?photoArea:null,name:by('[data-name]').value.trim()};
      await updateArtwork(entry,values);feedback='Picture updated.';overview();
    }catch(e){message(e.message);if(e.status===409)await refreshSharedArt().catch(()=>{});}
    finally{busy=false;const save=by('[data-art="save-edit"]');if(save)save.disabled=false;drawRows();}
  };
}
export async function openArtworkUploads(){
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='art-upload';dialog.setAttribute('aria-label','Upload pictures');document.body.append(dialog);
    window.addEventListener('shared-art-updated',()=>{
      cancelAnimationFrame(redraw);redraw=requestAnimationFrame(drawLibrary);
    });
    dialog.addEventListener('click',async e=>{
      const btn=e.target.closest('button');if(!btn)return;
      try{
        if(btn.dataset.item){
          if(busy||reading)return message('Please wait for the upload to finish.');
          const row=sharedItems().find(item=>item.id===btn.dataset.item);
          if(row)await details(row);return;
        }
        if(btn.dataset.drop!==undefined&&!busy&&!reading){
          const row=rows[Number(btn.dataset.drop)];if(row){await deleteEntry('queue',scope,row.id);rows=rows.filter(x=>x.id!==row.id);drawRows();}return;
        }
        switch(btn.dataset.art){
          case 'close':dialog.close();break;
          case 'switch':if(rows.length||busy||reading){message('Finish or remove queued uploads before joining another library.');break;}feedback='';pairing();break;
          case 'create':await join(newCode(),true);break;
          case 'choose':by('[data-png]').click();break;
          case 'previous':page--;drawLibrary();break;
          case 'next':page++;drawLibrary();break;
          case 'upload':await upload();break;
          case 'cancel-edit':if(busy)break;feedback='';overview();break;
          case 'copy':{
            const field=by('.art-share input');field.select();
            try{await navigator.clipboard.writeText(field.value);message('Library code copied.');}catch{message('Press and hold the selected code to copy it.');}break;
          }
        }
      }catch(err){message(err.message);}
    });
  }
  if(!dialog.open)dialog.showModal();
  if(busy||reading)return;
  scope=libraryCode();if(!scope){pairing();return;}
  try {rows=await listQueue(scope);overview();refreshSharedArt().catch(()=>{});}catch(e){message(e.message);}
}
