import {connectLibrary,deleteEntry,libraryCode,listQueue,newCode,publishEntry,readEntry,refreshSharedArt,saveEntry,sharedItems} from './shared-art.mjs';
import {escapeHtml as esc} from '../domain.mjs';

const kinds={sticker:'Sticker',frame:'Photo frame',postcard:'Postcard',flowers:'Flowers',hug:'Hug',reminder:'Reminder',love:'Love note'};
const standard={Stickers:'sticker','Photo frames':'frame',Postcards:'postcard',Flowers:'flowers',Hugs:'hug',Reminders:'reminder','Love notes':'love',Notes:'sticker'};
const initialArea=()=>({x:.12,y:.58,w:.76,h:.26,rotation:0});
let dialog, rows=[],scope='',busy=false,reading=false,view='',previewURL='',feedback='',progress='',selected='Stickers',userKind='sticker';
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
  try{message('Connecting…');await connectLibrary(code,create);scope=libraryCode();rows=await listQueue(scope);feedback='';overview();}
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
    '<div class="art-fields">'+chooser(selected,userKind)+'</div>'+
    '<input type="file" data-png accept="image/png,.png" multiple hidden>'+action('choose','＋ Choose PNGs','primary')+
    '<div class="art-queue"><h3>Upload queue</h3><p data-progress role="status"></p><ol></ol></div>'+
    '<div class="art-actions">'+action('apply','Apply category to queue')+action('upload','Upload all','primary')+'</div>');
  wireChooser();by('[data-png]').onchange=e=>{const files=Array.from(e.target.files);e.target.value='';addFiles(files);};
  drawRows();
}
function drawRows(){
  if(view!=='queue')return;
  by('ol').innerHTML=rows.map((row,index)=>'<li><span><b>'+esc(row.name||row.fileName)+'</b><small>'+esc(row.error || (row.category+' · '+row.width+' × '+row.height))+'</small></span>'+
    '<button type="button" data-edit="'+index+'" '+(busy||reading?'disabled':'')+'>'+ (row.kind==='postcard'?'Text area & details':'Edit')+'</button></li>').join('');
  by('[data-progress]').textContent=progress|| (rows.length?rows.length+' ready':'Choose one or more PNGs.');
  for(const key of ['choose','apply','upload'])by('[data-art="'+key+'"]').disabled=busy||reading||(key!=='choose'&&!rows.length);
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
  const {category,kind}=pickValues();selected=category;userKind=kind;
  reading=true;const errors=[];let count=0;const base=Date.now();
  try{
    for(let i=0;i<files.length;i++){
      const file=files[i];progress='Preparing '+(i+1)+' of '+files.length+'…';drawRows();
      try{
        const row={id:newCode(),scope,order:base+i,fileName:file.name,name:'',category,kind,textArea:initialArea(),...await dimensions(file)};
        await saveEntry('queue',{...row,blob:file});rows.push(row);count++;
      }catch(e){errors.push(file.name+' ('+e.message+')');}
    }
  }finally{reading=false;progress='';drawRows();message(count+' added to the queue.'+(errors.length?' Skipped: '+errors.join(', '):''));}
}
async function applyCategory(){
  const {category,kind}=pickValues();selected=category;userKind=kind;
  busy=true;drawRows();
  try{for(const row of rows){const saved=await readEntry('queue',scope,row.id);await saveEntry('queue',{...saved,category,kind});Object.assign(row,{category,kind});}}
  finally{busy=false;drawRows();}
  message('Category applied to queued pictures.');
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
  const entry=await readEntry('queue',scope,row.id);if(!entry)return;
  view='edit';feedback='';
  header('Picture details','<div class="art-stage"><img alt="Selected artwork"><div class="art-box"></div></div>'+
    '<label>Display name (optional)<input data-name maxlength="96" value="'+esc(row.name)+'"></label><div class="art-fields">'+chooser(row.category,row.kind)+'</div>'+
    '<section class="art-area"><h3>Postcard text area</h3><p>Drag across the picture to draw the writing area, or enter percentages below.</p><div class="art-coordinates">'+
    [['x','Left'],['y','Top'],['w','Width'],['h','Height'],['rotation','Angle °']].map(([k,n])=>'<label>'+n+'<input type="number" step="any" data-coord="'+k+'"></label>').join('')+'</div></section>'+
    '<div class="art-actions">'+action('cancel-edit','Back')+action('save-edit','Save details','primary')+'</div>'+action('remove','Remove from queue','art-remove'));
  previewURL=URL.createObjectURL(entry.blob);const img=by('.art-stage img'),box=by('.art-box');
  img.src=previewURL;wireChooser();const area={...row.textArea};
  const show=()=>{
    const postcard=by('[data-kind]').value==='postcard';
    by('.art-area').hidden=!postcard;box.hidden=!postcard;by('.art-stage').classList.toggle('drawing',postcard);
    Object.assign(box.style,{left:(area.x*100)+'%',top:(area.y*100)+'%',width:(area.w*100)+'%',height:(area.h*100)+'%',transform:'rotate('+area.rotation+'deg)'});
  };
  const setNumbers=()=>{for(const el of dialog.querySelectorAll('[data-coord]')){const k=el.dataset.coord;el.value=Number((area[k]*(k==='rotation'?1:100)).toFixed(2));}show();};
  by('[data-kind]').onchange=show;setNumbers();
  for(const el of dialog.querySelectorAll('[data-coord]'))el.oninput=()=>{area[el.dataset.coord]=el.valueAsNumber/(el.dataset.coord==='rotation'?1:100);show();};
  const stage=by('.art-stage');let origin=null;
  function point(e){const b=img.getBoundingClientRect(),clamp=x=>Math.min(1,Math.max(0,x));return [clamp((e.clientX-b.left)/b.width),clamp((e.clientY-b.top)/b.height)];}
  stage.onpointerdown=e=>{if(by('[data-kind]').value!=='postcard')return;stage.setPointerCapture(e.pointerId);origin=point(e);};
  stage.onpointermove=e=>{if(!origin)return;const [x,y]=point(e);Object.assign(area,{x:Math.min(x,origin[0]),y:Math.min(y,origin[1]),w:Math.abs(x-origin[0]),h:Math.abs(y-origin[1])});setNumbers();};
  stage.onpointerup=stage.onpointercancel=()=>{origin=null;};
  by('[data-art="save-edit"]').onclick=async()=>{
    try{const {category,kind}=pickValues();
      if(kind==='postcard'&&(!Object.values(area).every(Number.isFinite)||area.x<0||area.y<0||area.w<.01||area.h<.01||area.x+area.w>1.00001||area.y+area.h>1.00001||Math.abs(area.rotation)>180))throw Error('Keep the writing area inside the picture and the angle between −180° and 180°.');
      const values={category,kind,textArea:area,name:by('[data-name]').value.trim()};
      await saveEntry('queue',{...entry,...values});Object.assign(row,values);feedback='';overview();
    }catch(e){message(e.message);}
  };
  by('[data-art="remove"]').onclick=async()=>{try{await deleteEntry('queue',scope,row.id);rows=rows.filter(v=>v.id!==row.id);feedback='';overview();}catch(e){message(e.message);}};
}
export async function openArtworkUploads(){
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='art-upload';dialog.setAttribute('aria-label','Upload pictures');document.body.append(dialog);
    dialog.addEventListener('click',async e=>{
      const btn=e.target.closest('button');if(!btn)return;
      try{
        if(btn.dataset.edit!==undefined)return await details(rows[Number(btn.dataset.edit)]);
        switch(btn.dataset.art){
          case 'close':dialog.close();break;
          case 'switch':if(rows.length||busy||reading){message('Finish or remove queued uploads before joining another library.');break;}feedback='';pairing();break;
          case 'create':await join(newCode(),true);break;
          case 'choose':pickValues();by('[data-png]').click();break;
          case 'apply':await applyCategory();break;
          case 'upload':await upload();break;
          case 'cancel-edit':feedback='';overview();break;
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
