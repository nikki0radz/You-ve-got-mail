import {fonts,fontSpec,writingBox} from './lettering.mjs';
import {colourButton} from './colour-wheel.mjs';
import {W,H,artwork,banner,bannerNames,clamp,contain,makeLayer,noteBox,renderParcel} from './studio-scene.mjs';
import {guestSelection,guestMaster} from './guest-selection.mjs?v=complete-stickers';
import {fitPhoto,readPhoto} from './photo-fit.mjs';

const apps=[['☀','Weather','#e9ad61'],['♫','Music','#ae748b'],['✆','Phone','#65a184'],['✉','Mail','#779cb1'],['◉','Camera','#787785'],['☷','Notes','#d8aa60'],['☁','Cloud','#799dba'],['✿','Photos','#b48c9f']];
function phoneBackground(){
  return '<div class="sample-home" aria-hidden="true"><b>09:41</b><div class="home-widget">Wednesday<br><strong>Good morning</strong></div><div class="app-grid">'+apps.map(([icon,name,color])=>'<div><i style="background:'+color+'">'+icon+'</i><small>'+name+'</small></div>').join('')+'</div></div><div class="home-dock" aria-hidden="true"><i>✆</i><i>✉</i><i>♫</i><i>◉</i></div><div class="frost" aria-hidden="true"></div>';
}
const button=(label,key)=>'<button type="button" data-tool="'+key+'">'+label+'</button>';

export function startGuestStudio(dialog,item,back,onReady){
  const ratio=item.rect[3]/item.rect[2];
  const state={art:contain(makeLayer(ratio)),words:item.labelPatch?item.name:'',crop:{photo:null,zoom:1,panX:.5,panY:.5},note:null,second:null};
  let dirty=false,active='art',serial=0,editing='',busy=false,noteMoved=false;
  const previousCancel=dialog.oncancel;
  const tool=key=>dialog.querySelector('[data-tool="'+key+'"]');
  const leave=()=>{if(!busy&&(!dirty||window.confirm('Discard your changes to this parcel?'))){dialog.classList.remove('guest-studio');dialog.oncancel=previousCancel;back();}};
  const grabError=e=>{const el=dialog.querySelector('.studio-error');if(el)el.textContent=e.message||String(e);};
  function select(key){active=key;dialog.querySelectorAll('.move-layer').forEach(n=>n.classList.toggle('picked',n.dataset.layer===key));}
  function attachNote(){
    if(!state.note||noteMoved)return;
    const a=state.art,n=state.note;
    n.x=a.x+(a.width-n.width)/2;n.y=a.y+a.width*a.ratio+10;contain(n);
  }
  function layout(){
    const stage=dialog.querySelector('.sample-phone');if(!stage)return;
    for(const el of stage.querySelectorAll('.move-layer')){
      const l=state[el.dataset.layer];Object.assign(el.style,{left:l.x/W*100+'%',top:l.y/H*100+'%',width:l.width/W*100+'%',height:l.width*l.ratio/H*100+'%'});
    }
  }
  function setCanvas(el,c){if(el?.isConnected)el.querySelector('.layer-image').replaceChildren(c);}
  async function paintArt(){
    const id=++serial,el=dialog.querySelector('[data-layer=art]');try{
      const c=await artwork(item,{...state.crop,ink:state.ink,paper:state.paper,font:state.font},editing==='art'?'':state.words);
      if(id===serial)setCanvas(el,c);
    }catch(e){grabError(e);}
  }
  async function paintNote(){
    if(!state.note)return;await document.fonts.load(fontSpec(state.note.font,20));
    if(state.note)setCanvas(dialog.querySelector('[data-layer=note]'),banner(state.note.style,editing==='note'?'':state.note.text,state.note.width,state.note.width*state.note.ratio,state.note));
  }
  function startText(key){
    const el=dialog.querySelector('[data-layer='+key+']');if(!el||(key==='art'&&!item.textBox))return;
    const existing=el.querySelector('textarea');if(existing){existing.focus();return;}
    document.activeElement?.blur();editing=key;select(key);
    const isNote=key==='note';let box;
    if(isNote)box=noteBox(state.note.style);
    else{const [l,t,r,b]=writingBox(item);box=[l,t,r-l,b-t];}
    const [x,y,w,h]=box;
    const field=document.createElement('textarea');field.maxLength=180;field.className='inline-words';field.setAttribute('aria-label',isNote?'Banner text':'Write on this design');field.placeholder='Type here';field.value=isNote?state.note.text:state.words;
    delete el.querySelector('.layer-image').dataset.hint;el.append(field);
    function fit(){
      const width=el.clientWidth*w,height=el.clientHeight*h;
      Object.assign(field.style,{left:x*100+'%',width:width+'px',height:'1px',color:isNote?(state.note.ink||'#283c30'):(state.ink||item.ink)});
      let font=Math.max(5,Math.floor(height*.88));
      for(;font>4;font--){field.style.fontSize=font+'px';field.style.height='1px';if(field.scrollHeight<=height)break;}
      field.style.fontSize=font+'px';field.style.height='1px';const fitted=Math.min(height,field.scrollHeight);
      field.style.height=fitted+'px';field.style.top=(y*el.clientHeight+(height-fitted)/2)+'px';
    }
    const [family,weight]=fonts[(isNote?state.note:state).font]||fonts.Handwritten;
    field.style.fontFamily=family;field.style.fontWeight=weight;field.style.lineHeight='1.13';
    field.oninput=()=>{if(isNote)state.note.text=field.value;else state.words=field.value;dirty=true;fit();};
    field.onblur=()=>{field.remove();editing='';if(!field.value.trim())el.querySelector('.layer-image').dataset.hint='Tap to write';if(isNote)paintNote();else paintArt();};
    if(isNote)paintNote();else paintArt();fit();field.focus();
  }
  function sizeNote(note,width,height){
    note.width=clamp(width,86,W-note.x);
    note.ratio=clamp(height,38,H-note.y)/note.width;
    paintNote();
  }
  function bindLayer(el){
    const key=el.dataset.layer,l=state[key],stage=el.parentElement;
    let gesture=null;
    el.onpointerdown=e=>{
      if(e.target.closest('textarea')||gesture)return;
      e.preventDefault();document.activeElement?.blur();select(key);
      el.setPointerCapture(e.pointerId);
      gesture={id:e.pointerId,x:e.clientX,y:e.clientY,oldX:l.x,oldY:l.y,oldW:l.width,oldH:l.width*l.ratio,resizing:!!e.target.closest('.corner'),moved:false};
    };
    el.onpointermove=e=>{
      const g=gesture;if(!g||g.id!==e.pointerId)return;
      const rect=stage.getBoundingClientRect(),dx=(e.clientX-g.x)*W/rect.width,dy=(e.clientY-g.y)*H/rect.height;
      if(!g.moved&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<3)return;
      g.moved=true;dirty=true;if(key==='note')noteMoved=true;
      if(g.resizing&&key==='note')sizeNote(l,g.oldW+dx,g.oldH+dy);
      else if(g.resizing)l.width=clamp(g.oldW+(dx+dy*l.ratio)/(1+l.ratio*l.ratio),86,Math.min(W-l.x,(H-l.y)/l.ratio));
      else {l.x=g.oldX+dx;l.y=g.oldY+dy;}
      contain(l);if(key==='art')attachNote();layout();
    };
    el.onpointerup=e=>{if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;if(!g.moved&&!g.resizing&&(key==='note'||(key==='art'&&item.textBox)))startText(key);};
    el.onpointercancel=el.onlostpointercapture=()=>{gesture=null;};
    el.onkeydown=e=>{
      if(e.target.closest('textarea'))return;
      if(e.key==='Enter'&&e.target===el){e.preventDefault();startText(key);return;}
      const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!dir)return;
      e.preventDefault();select(key);dirty=true;if(key==='note')noteMoved=true;
      if(e.target.closest('.corner')&&key==='note')sizeNote(l,l.width+dir[0]*12,l.width*l.ratio+dir[1]*12);
      else if(e.target.closest('.corner'))l.width+=12*(dir[0]+dir[1]);else {l.x+=dir[0]*10;l.y+=dir[1]*10;}
      contain(l);if(key==='art')attachNote();layout();
    };
  }
  function openCrop(crop){
    const cancelCrop=()=>show();
    dialog.oncancel=e=>{e.preventDefault();cancelCrop();};
    fitPhoto(dialog,item,crop,applied=>{state.crop=applied;dirty=true;show();},cancelCrop);
  }
  async function upload(input){
    if(!input.files?.[0])return;const source=input.files[0];input.value='';
    try{const img=await readPhoto(source);if(input.isConnected)openCrop({photo:img,zoom:1,panX:.5,panY:.5});}
    catch(e){grabError(e);}
  }
  function bindStickerPicker(panel){
    for(const [id,name] of guestSelection.Stickers){
      const pick=document.createElement('button'),img=new Image();
      pick.type='button';img.alt='';img.src=guestMaster(id);
      pick.append(img,name);pick.setAttribute('aria-pressed',String(state.second?.id===id));
      pick.onclick=async()=>{
        if(busy)return;
        busy=true;
        try{
          await img.decode();if(!panel.isConnected)return;
          const position=state.second||makeLayer(1,170,700);
          state.second=contain({...position,id,name,image:img,ratio:img.naturalHeight/img.naturalWidth});
          active='second';dirty=true;show();tool('second').focus();
        }catch(e){grabError(e);}finally{busy=false;}
      };
      panel.querySelector('.sticker-grid').append(pick);
    }
    if(state.second)tool('remove-second').onclick=()=>{state.second=null;active='art';dirty=true;show();tool('second').focus();};
  }
  function layer(key,label){
    return '<div class="move-layer" tabindex="0" role="group" aria-label="'+label+'" data-layer="'+key+'"><div class="layer-image"></div><button type="button" class="corner" aria-label="Resize '+label+'">↘</button></div>';
  }
  function show(){
    dialog.dataset.reviewScreen="placement / "+item.name;
    serial++;editing='';busy=false;dialog.classList.add('guest-studio');dialog.oncancel=e=>{e.preventDefault();leave();};
    dialog.innerHTML='<div class="studio-heading"><button class="studio-back" data-tool="back">‹ Designs</button><small>PLACEMENT PREVIEW</small></div><h2></h2><p class="studio-tip">Drag to move. Pull the corner to resize.'+(item.labelPatch?' Tap the reminder to change its wording.':item.textBox?' Tap the paper to write.':'')+'</p><div class="sample-phone" aria-label="Example frosted phone screen">'+phoneBackground()+layer('art','Artwork')+(state.second?layer('second',state.second.name+' sticker'):'')+(state.note?layer('note','Note banner'):'')+'</div><div class="studio-photo">'+(item.maskSheet?button(state.crop.photo?'Edit picture':'Upload photo','photo'):'')+'</div><div class="studio-tools">'+button(state.note?'Note options':'+ Add note','note')+button(state.second?'Edit sticker':'+ Add sticker','second')+'</div><div class="banner-options" hidden><small>CHOOSE YOUR BANNER</small><div>'+bannerNames.map((s,i)=>'<button class="style-'+i+'" data-style="'+i+'">'+s+'</button>').join('')+'</div>'+(state.note?button('Edit text','edit-note')+button('Remove note','remove-note'):'')+'</div><section class="sticker-options" aria-label="Choose a sticker" hidden><small>CHOOSE A STICKER</small><div class="sticker-grid"></div>'+(state.second?button('Remove sticker','remove-second'):'')+'</section><input hidden type="file" accept="image/*" data-file="main"><p role="alert" class="studio-error"></p><button class="studio-primary" data-tool="ready">Ready for post　›</button>';
    dialog.querySelector('h2').textContent=item.name;
    const stage=dialog.querySelector('.sample-phone'),artEl=stage.querySelector('[data-layer=art]');
    for(const el of stage.querySelectorAll('.move-layer'))bindLayer(el);
    if(item.textBox&&!state.words)artEl.querySelector('.layer-image').dataset.hint='Tap to write';
    if(state.note&&!state.note.text)stage.querySelector('[data-layer=note] .layer-image').dataset.hint='Tap to write';
    if(state.second){const image=state.second.image;image.alt='';stage.querySelector('[data-layer=second] .layer-image').append(image);}
    if(item.textBox||state.note){
      const controls=document.createElement('div');controls.className='studio-colours';
      function row(fields){
        const group=document.createElement('div');group.className='ink-row';
        for(const [label,accessible,object,key,initial,repaint] of fields){
          group.append(colourButton(label,accessible,object[key]||initial,value=>{object[key]=value;dirty=true;repaint();}));
        }
        const object=fields[0][2],repaint=fields[0][5],picker=document.createElement('select');
        picker.setAttribute('aria-label',object===state?'Note font':'Banner font');picker.className='note-font';
        for(const [label,[family]] of Object.entries(fonts)){
          const option=new Option(label,label);option.style.fontFamily=family;picker.append(option);
        }
        picker.value=object.font||'Handwritten';picker.onchange=()=>{object.font=picker.value;dirty=true;repaint();};
        group.append(picker);controls.append(group);
      }
      if(item.textBox){
        const fields=[['Text','Design text colour',state,'ink',item.ink,paintArt]];
        if(item.category==='Notes')fields.unshift(['Paper','Note paper colour',state,'paper','#fff1cd',paintArt]);
        row(fields);
      }
      if(state.note)row([
        ['Banner','Banner colour',state.note,'fill',['#fff1cd','#c7ddcb','#fff9e9'][state.note.style],paintNote],
        ['Text','Banner text colour',state.note,'ink','#283c30',paintNote]
      ]);
      dialog.querySelector('.sticker-options').before(controls);
    }
    select(active);layout();paintArt();paintNote();
    tool('back').onclick=leave;
    const source=dialog.querySelector('[data-file=main]');
    if(item.maskSheet){tool('photo').onclick=()=>state.crop.photo?openCrop(state.crop):source.click();source.onchange=()=>upload(source);}
    const styles=dialog.querySelector('.banner-options'),stickers=dialog.querySelector('.sticker-options');
    const removeNote=tool('remove-note');
    if(removeNote)styles.after(removeNote);
    function togglePanel(panel){
      if(panel===stickers&&!stickers.querySelector('.sticker-grid button'))bindStickerPicker(stickers);
      const opening=panel.hidden;styles.hidden=true;stickers.hidden=true;panel.hidden=!opening;
      if(removeNote){
        if(styles.hidden)styles.after(removeNote);
        else styles.append(removeNote);
      }
      tool('note').setAttribute('aria-expanded',String(!styles.hidden));
      tool('second').setAttribute('aria-expanded',String(!stickers.hidden));
    }
    for(const [key,panel] of [['note',styles],['second',stickers]]){
      tool(key).setAttribute('aria-expanded','false');tool(key).onclick=()=>togglePanel(panel);
    }
    styles.querySelectorAll('[data-style]').forEach(b=>{const style=Number(b.dataset.style);
      const icon=banner(style,'Aa',180,58);icon.setAttribute('aria-hidden','true');b.prepend(icon);
      b.setAttribute('aria-pressed',String(state.note?.style===style));b.onclick=()=>{
      if(!state.note){state.note=makeLayer(.3,Math.min(state.art.width,440));attachNote();}
      state.note.style=Number(b.dataset.style);state.note.text??='';dirty=true;active='note';show();startText('note');
    };});
    if(state.note){
      tool('edit-note').onclick=()=>startText('note');
      removeNote.onclick=()=>{state.note=null;noteMoved=false;active='art';dirty=true;show();tool('note').focus();};
    }
    tool('ready').onclick=async()=>{
      if(busy)return;
      const error=dialog.querySelector('.studio-error');
      if(item.maskSheet&&!state.crop.photo){error.textContent='Upload a photo to fill your frame.';return;}
      if(item.textBox&&!state.words.trim()){error.textContent='Tap the writing area and add your words first.';startText('art');return;}
      if(state.note&&!state.note.text.trim()){error.textContent='Write on the banner or tap Remove note.';startText('note');return;}
      busy=true;const ready=tool('ready');ready.disabled=true;
      try{const canvas=await renderParcel(item,state,dialog.designGeometry?.());await onReady(canvas.toDataURL('image/png'),item.name,item.category,reopen);}
      catch(e){grabError(e);}finally{busy=false;ready.disabled=false;}
    };
    dialog.scrollTop=0;
  }
  function reopen(){if(!dialog.open)dialog.showModal();show();}
  show();
}
