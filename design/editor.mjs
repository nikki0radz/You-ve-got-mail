import {anchorOptions} from './option-anchors.mjs';
import {rounds} from './rounds.mjs';
import {phoneProfile,phoneSize,frameURL} from './phone.mjs';
import {pages} from './pages.mjs';
import {buttons,layouts,themes,propsForSkin} from './templates.mjs';
import {screen as composer,appVersion,elements as composerElements,numbers,choices,colours,stickerIds,empty,cleanLayout,current,newBook,record} from './model.mjs';
import {mountReview,exportReview,exportComments} from './review.mjs?v=comments-export-1';
const $=id=>document.getElementById(id),frames=[...document.querySelectorAll('iframe')];
const requested=new URLSearchParams(location.search).get('page');
const screen=Object.hasOwn(pages,requested)?requested:composer,isComposer=screen===composer;
const pageName=pages[screen][0];let elements=isComposer?composerElements:{},activeFrame=frames[0],undo=null;
for(const group of new Set(Object.values(pages).map(p=>p[1]))){
  const list=document.createElement('optgroup');list.label=group;
  for(const [id,[name,g]] of Object.entries(pages))if(group===g)list.append(new Option(name,id));$('page').append(list);
}
$('page').value=screen;$('page').onchange=()=>{cache();const u=new URL(location.href);u.searchParams.set('page',$('page').value);location.assign(u)};
document.querySelector('h1').textContent=pageName;
for(const f of frames)f.src=frameURL(screen);
$('pair').hidden=!isComposer;
const KEY='pigeon.design.workroom.key.v1',CACHE='pigeon.design.workroom.cache.v1'+(isComposer?'':'.'+screen);
const cached=()=>{try{return JSON.parse(localStorage.getItem(CACHE))||{}}catch{return {}}};
const initial=cached();let key=localStorage.getItem(KEY)||'',book=initial.book||{...newBook(),screen},version=initial.version||0,profile=initial.profile||null;
if(!isComposer)profile=phoneProfile()||profile;
let layout=cleanLayout(initial.working||current(book)?.revisions.at(-1)?.layout),dirty=!!initial.dirty,selected=isComposer?'row':'',editing=true,grid=0,locked=false,conflict=false;
$('name').value=initial.name||current(book)?.name||pageName+' layout';
let comments=structuredClone(initial.comments??current(book)?.revisions.at(-1)?.comments??[]);
const review=mountReview(frames,()=>comments,()=>update(),()=>({screen,page:pageName,appVersion,option:optionInfo(),baseRevision:current(book)?.revisions.at(-1)?.id||null}));
const ids=['All in','Bad beat','I’m horny','Unimpressed','I’m tired','I miss you'];
const status=msg=>$('status').textContent=msg;
const surface=f=>f.contentWindow?.designSurface;
let basedOnOption=initial.basedOnOption||current(book)?.revisions.at(-1)?.reviewOption||null;
const round=Object.hasOwn(rounds,screen)?rounds[screen]:null;
let comparison=round&&initial.comparison?.id===round.id?initial.comparison:{id:round?.id,active:0,states:{}};
const optionGroups=round?[round,...(round.groups||[])]:[];
const anchors=round&&anchorOptions($('round'),frames[0],optionGroups.map(group=>{
  const first=group.options[0].changes[0];return first.selector||composerElements[first.element]?.[1];
}));
const prefix=i=>optionGroups.length>1?String.fromCharCode(65+i):'';
function picks(){return optionGroups.map((g,i)=>i===0?comparison.active||0:comparison.picks?.[g.id]||0);}
function stateKey(values){
  // Appending a review group must preserve saved combinations from earlier rounds.
  const last=values.findLastIndex(Boolean);
  return last>0?values.slice(0,last+1).join('-'):String(values[0]||0);
}
function optionInfo(){
  const values=picks();if(!values.some(Boolean)&&basedOnOption)return basedOnOption;
  const groups=optionGroups.map((g,i)=>({roundId:g.id,title:g.title,number:values[i],label:prefix(i)+(values[i]||' Current'),name:g.options[values[i]-1]?.name||'Current layout'}));
  return groups.length?{...groups[0],groups}:null;
}
function clearRound(revision){basedOnOption=revision?.reviewOption||null;comparison={id:round?.id,active:0,states:{}};renderOptions();}
function switchOption(groupIndex,number){
  const values=picks(),group=optionGroups[groupIndex];if(number===values[groupIndex])return;
  const view=surface(frames[0]);if(!view)return;
  comparison.states[stateKey(values)]={layout:structuredClone(layout),comments:structuredClone(comments),option:optionInfo(),dirty};
  values[groupIndex]=number;
  let next=comparison.states[stateKey(values)];
  if(!next){
    const base=comparison.states[0],candidate=cleanLayout(layout);
    // Revert only the properties controlled by this group before applying its next choice.
    for(const option of group.options)for(const change of option.changes||[]){
      const id=change.element||view.idFor?.(change.selector);
      if(!id){status('Open the starting screen to compare this option.');return;}
      const style=candidate.styles[id]||={};
      for(const prop of Object.keys(change.style)){
        if(Object.hasOwn(base.layout.styles[id]||{},prop))style[prop]=base.layout.styles[id][prop];else delete style[prop];
      }
    }
    for(const change of group.options[number-1]?.changes||[]){
      const id=change.element||view.idFor?.(change.selector);
      Object.assign(candidate.styles[id],change.style);
    }
    next={layout:cleanLayout(candidate),comments:structuredClone(base.comments),dirty:true};
  }
  comparison.active=values[0];comparison.picks=Object.fromEntries(optionGroups.map((g,i)=>[g.id,values[i]]));
  layout=cleanLayout(next.layout);comments=structuredClone(next.comments);dirty=next.dirty;undo=null;
  cache();renderOptions();renderFrames();bookUI();elList();inspector();dimensions();
  status(group.title+' · '+(number?prefix(groupIndex)+number+' · '+group.options[number-1].name:'Current layout'));
}
function renderOptions(){
  const bar=$('round');bar.hidden=!round;if(!round)return;bar.replaceChildren();
  optionGroups.forEach((group,index)=>{
    const row=document.createElement('div');row.className='option-row';row.setAttribute('role','group');row.setAttribute('aria-label',group.title);
    row.title=group.title;row.hidden=true;
    const selected=picks()[index];
    for(const [i,name] of ['Current',...group.options.map(o=>o.name)].entries()){
      const code=i?String(i):'↶';const button=btn(code,()=>switchOption(index,i));button.title=group.title+' · '+(i?name:'Original layout');
      button.setAttribute('aria-label',group.title+' · '+code+(i?' · '+name:''));button.setAttribute('aria-pressed',String(i===selected));row.append(button);
    }
    bar.append(row);
  });
  anchors.schedule();
}
function cache(){try{localStorage.setItem(CACHE,JSON.stringify({book,version,profile,working:layout,comments,comparison,basedOnOption,name:$('name').value,dirty}))}catch{status('Browser storage is full. Save to your paired workspace before leaving.');}}
function dimensions(){
  anchors?.schedule();
  const main=phoneSize(profile);
  const available=window.innerHeight-$('bench').getBoundingClientRect().top-window.scrollY-82;
  const zoom=$('zoom').value==='fit'?Math.max(.45,Math.min(1,available/(main.height+(main.insets?.top||0)+(main.insets?.bottom||0)+10))):Number($('zoom').value);
  frames.forEach((f,i)=>{
    const width=i?Math.max(160,Math.min(320,main.width-40)):main.width,height=main.height;
    const clamp=n=>Math.max(0,Math.min(160,Number(n)||0));
    const t=clamp(main.insets?.top),b=clamp(main.insets?.bottom),l=clamp(main.insets?.left),r=clamp(main.insets?.right);
    const device=f.closest('.device'),shell=f.closest('.shell'),foot=f.closest('.footprint');
    device.hidden=i===1&&!$('compare').checked;f.style.width=width+'px';f.style.height=height+'px';f.style.marginInline=l+'px '+r+'px';
    shell.querySelector('.top').style.height=t+'px';shell.querySelector('.nav').style.height=b+'px';shell.style.transform='scale('+zoom+')';
    foot.style.width=(width+l+r+10)*zoom+'px';foot.style.height=(height+t+b+10)*zoom+'px';
    device.querySelector('small').textContent=width+' × '+height+' CSS px';
  });
  $('device-name').textContent=main.measured?'My phone':'Reference phone';
  $('device-name').title=main.measured?'Measured on Android · font scale '+main.fontScale+' · WebView text '+(main.textZoom||100)+'%':'Pair your phone to replace these example measurements.';
}
function renderFrames(){
  anchors?.schedule();
  for(const f of frames){
    const view=surface(f);if(!view)continue;
    view.configure({layout,selected,editing,grid,textScale:profile?Math.min(3,Math.max(.5,(profile.textZoom??(100*profile.fontScale))/100||1)):1});
    requestAnimationFrame(()=>{const badge=f.closest('.device').querySelector('.fit-report');badge.textContent=view.toolbarReport();badge.classList.toggle('warning',/wrap|clip/.test(badge.textContent));});
  }
}
function update(){dirty=true;cache();renderFrames();bookUI();status('Unsaved changes · Save draft to keep this revision.');}
function setValue(prop,value){const obj=layout.styles[selected]||={};if(value===null)delete obj[prop];else obj[prop]=value;update();}
function option(value,label){return new Option(label,value)}
const nice=id=>elements[id]?.[0]||'Sticker · '+(ids[stickerIds.indexOf(layout.copies.find(c=>c.id===id)?.asset)]||'copy');
function elList(){
  if(!isComposer){elements=surface(activeFrame)?.inventory()||{};if(!elements[selected])selected=Object.keys(elements).find(k=>elements[k][2]==='button')||Object.keys(elements)[0]||'';}
  const el=$('element');el.replaceChildren(...[...Object.keys(elements),...layout.copies.map(c=>c.id)].map(id=>option(id,nice(id))));el.value=selected;
}
function select(id){if(!isComposer)elements=surface(activeFrame)?.inventory()||elements;if(!elements[id]&&!layout.copies.some(c=>c.id===id))return;selected=id;elList();renderFrames();inspector();}
function label(text,child){const el=document.createElement('label');el.append(text,child);return el}
function btn(title,fn){const b=document.createElement('button');b.type='button';b.textContent=title;b.onclick=fn;return b}
const labels={width:'Width · px',height:'Height · px',margin:'Outer spacing · px',padding:'Padding · px',gap:'Button gap · px',radius:'Corner radius · px',fontSize:'Font size · px',borderWidth:'Border · px',opacity:'Opacity · %',x:'Left · %',y:'Top · %',background:'Fill',color:'Text colour',borderColor:'Border colour',font:'Font',align:'Alignment'};
const openShelves=new Set();let copied=null;
try{copied=JSON.parse(localStorage.getItem('pigeon.workroom.button-look'))}catch{}
function replaceLook(key,look){
  const old={...layout.styles[key]};
  for(const k of ['skin','decor','fontSize','font','color','background','borderWidth','borderColor','radius','padding','height'])delete old[k];
  layout.styles[key]={...old,...look};
}

function templateShelf(holder){
  const type=elements[selected]?.[2]||(['row','banners','palette'].includes(selected)?'group':['art','banner','extra','title','hint','eyebrow','label','fontMenu','cropZoom'].includes(selected)||selected.startsWith('copy-')?'element':'button');
  function shelf(title,list,apply,kind){
    const details=document.createElement('details');details.className='presets';details.open=openShelves.has(title);
    details.ontoggle=()=>{if(!details.isConnected)return;if(details.open)openShelves.add(title);else openShelves.delete(title)};
    details.append(Object.assign(document.createElement('summary'),{textContent:title+' ('+Object.keys(list).length+')'}));
    const grid=document.createElement('div');grid.className='preset-grid';
    for(const [id,[name]] of Object.entries(list)){
      const b=btn(name,()=>{undo=structuredClone(layout);apply(id);update();inspector();});
      if(kind==='skin'){const [,v,shadow,w,line]=buttons[id];Object.assign(b.style,{backgroundColor:v.decor?.backgroundColor||v.background,color:v.color,border:v.borderWidth+'px solid '+(v.borderColor||'transparent'),borderRadius:v.radius+'px',fontFamily:v.font,fontWeight:w,boxShadow:shadow,textDecoration:line||'none'});}
      b.setAttribute('aria-pressed',String(layout.styles[selected]?.[kind]===id));grid.append(b);
    }
    details.append(grid);holder.append(details);
  }
  const merge=(k,s)=>{if(k)layout.styles[k]={...layout.styles[k],...s}};
  const arrange=(k,id)=>merge(k,{arrangement:id,gap:layouts[id][2],equal:layouts[id][3]==='stretch'?'equal':'content'});
  if(type==='button'){
    const actions=document.createElement('div');actions.className='template-actions';
    actions.append(btn('Copy button style',()=>{
      const look=surface(activeFrame)?.appearance(selected);if(!look)return;
      copied={name:nice(selected),look};localStorage.setItem('pigeon.workroom.button-look',JSON.stringify(copied));inspector();status('Copied '+copied.name+'. Select another button and choose Paste style.');
    }));
    const paste=btn('Paste style',()=>{undo=structuredClone(layout);replaceLook(selected,copied.look);update();inspector()});paste.disabled=!copied;paste.title=copied?'Use the look of '+copied.name:'Copy a button first';actions.append(paste);holder.append(actions);
    shelf('Button library',buttons,id=>replaceLook(selected,propsForSkin(id)),'skin');
  }
  for(const spec of surface(activeFrame)?.variants?.()||[]){
    const box=document.createElement('select');box.append(...spec.options.map((v,i)=>option(i,v)));box.value=String(layout.variants?.[spec.id]??0);
    box.onchange=()=>{undo=structuredClone(layout);(layout.variants??={})[spec.id]=Number(box.value);update();inspector()};holder.append(label('App layout · '+spec.title,box));
  }
  if(type==='group')shelf('Group layouts',layouts,id=>arrange(selected,id),'arrangement');
  shelf('Page layouts',themes,id=>{
    if(id==='original'){layout.styles={};delete layout.variants;return;}
    const [,skin,group,font]=themes[id];
    if(isComposer){merge('pocket',propsForSkin(skin));merge('title',{font});arrange('row',group);return;}
    const entries=Object.entries(elements);
    for(const [k,[,,role]] of entries){if(role==='button')merge(k,propsForSkin(skin));if(role==='heading')merge(k,{font});}
    const row=entries.find(([k,[name,path,role]])=>role==='group'&&/home-actions|dispatch-dock|studio-tools|mail-tabs|app-nav|parcel-actions|flow-actions|mail-dock|social-pair/.test(path.split(' > ').at(-1)));
    if(row)arrange(row[0],group);
  },'page');
  if(undo)holder.append(btn('Undo last template',()=>{layout=undo;undo=null;update();inspector()}));
}
function inspector(){
  const holder=$('inspector');holder.replaceChildren();const saved=layout.styles[selected]||{},measure=surface(activeFrame)?.inspect(selected)||{};
  const layer=['extra','banner','art'].includes(selected)||selected.startsWith('copy-');
  $('scope').textContent=selected==='pocket'?'Shared style · affects Add note and Add sticker on this screen.':selected==='row'?'Row only · affects the two toolbar buttons together.':'Element only · affects '+nice(selected)+'.';
  const fields=document.createElement('div');fields.className='fields';
  function field(prop){
    let input;
    if(choices[prop]){
      input=document.createElement('select');input.append(option('','Original'),...choices[prop].map(v=>option(v,v)));input.value=saved[prop]||(choices[prop].includes(measure[prop])?measure[prop]:'');
    }else{
      input=document.createElement('input');input.type=colours.includes(prop)?'color':'number';
      if(numbers[prop]){const [min,max]=numbers[prop];input.min=min;input.max=max;input.step=prop==='x'||prop==='y'?'.1':'1';input.placeholder=measure[prop]===undefined?'Auto':String(Math.round(measure[prop]));}
      input.value=input.type==='color'?(saved[prop]||measure[prop]||'#365a40'):(Number.isFinite(measure[prop])?Number(measure[prop].toFixed(input.step==='.1'?1:0)):saved[prop]??'');
      if(input.type==='number'&&!Number.isFinite(measure[prop])&&saved[prop]===undefined){input.disabled=true;input.title='Open this element in Try screen to measure it.';}
    }
    input.dataset.prop=prop;
    input.setAttribute('aria-label',labels[prop]||prop);
    input.onchange=()=>{if(!input.reportValidity())return;setValue(prop,input.value===''?null:input.type==='number'?Number(input.value):input.value);};
    if(input.type==='number'){
      input.oninput=()=>{if(input.value!==''&&input.validity.valid)setValue(prop,input.valueAsNumber)};
      input.onchange=()=>{if(input.value===''){setValue(prop,null);inspector()}};
      const wrap=document.createElement('div');wrap.className='number-field';
      const caption=document.createElement('span');caption.textContent=labels[prop]||prop;
      const controls=document.createElement('div');controls.className='step-controls';
      for(const by of [-1,1]){
        const step=btn(by<0?'−':'+',()=>{
          const actual=surface(activeFrame)?.inspect(selected)?.[prop];
          if(Number.isFinite(actual))input.value=Number(actual.toFixed(input.step==='.1'?1:0));
          if(by<0)input.stepDown();else input.stepUp();setValue(prop,input.valueAsNumber);
        });
        step.setAttribute('aria-label',(by<0?'Decrease ':'Increase ')+prop);step.disabled=input.disabled;
        if(by<0)controls.append(step,input);else controls.append(step);
      }
      wrap.append(caption,controls);return wrap;
    }
    return label(labels[prop]||prop,input);
  }
  if(selected==='row'){
    fields.append(field('gap'));const equal=document.createElement('select');equal.append(option('equal','Equal widths'),option('content','Fit labels'));equal.value=saved.equal||'equal';equal.onchange=()=>setValue('equal',equal.value);fields.append(label('Button widths',equal));
    holder.append(fields);const order=document.createElement('div');order.className='stack';const reverse=saved.order==='sticker-first';
    const swap=()=>{setValue('order',reverse?'note-first':'sticker-first');inspector();};
    for(const text of reverse?['Add sticker','Add note']:['Add note','Add sticker']){
      const chip=btn(text,swap);chip.className='orderchip';chip.draggable=true;chip.title='Drag to reorder, or click to swap';chip.ondragstart=e=>e.dataTransfer.setData('text/plain',text);chip.ondragover=e=>e.preventDefault();chip.ondrop=e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')!==text)swap()};order.append(chip);
    }
    holder.append(order);const hint=document.createElement('p');hint.textContent='Drag the labels to reorder, or click either to swap.';holder.append(hint);
  }
  const basics=document.createElement('div');basics.className='fields';
  if(layer)basics.append(field('x'),field('y'));
  for(const p of ['width','height','padding','margin','fontSize','font','align','opacity','background','color','borderWidth','borderColor','radius'])basics.append(field(p));
  if(selected!=='row'){const sizing=document.createElement('div');sizing.className='fields';sizing.append(basics.querySelector('[data-prop=width]').closest('.number-field'),basics.querySelector('[data-prop=height]').closest('.number-field'));holder.append(sizing);}
  templateShelf(holder);
  {const details=document.createElement('details');details.append(Object.assign(document.createElement('summary'),{textContent:'Spacing, type & appearance'}),basics);holder.append(details);}
  if(['note','second','pocket'].includes(selected))holder.append(btn(selected==='pocket'?'Edit Add note only':'Edit both toolbar buttons',()=>select(selected==='pocket'?'note':'pocket')));
  holder.append(btn('Reset element',()=>{delete layout.styles[selected];update();inspector()}));
  if(!isComposer)return;
  const section=document.createElement('details');section.open=layer;section.append(Object.assign(document.createElement('summary'),{textContent:'Sticker placement'}));const pick=document.createElement('select');pick.append(...stickerIds.map((v,i)=>option(v,ids[i])));section.append(label('Sticker to add',pick));
  function add(asset,source={}){
    if(layout.copies.length>=16){status('This screen supports up to 16 design stickers.');return;}
    const id='copy-'+crypto.randomUUID();layout.copies.push({id,asset});layout.styles[id]={x:58,y:60,...source};
    selected=id;update();select(id);
  }
  section.append(btn('Add design sticker',()=>add(Number(pick.value))));
  const cp=layout.copies.find(c=>c.id===selected);
  if(cp||selected==='extra'){
    section.append(btn('Duplicate sticker',()=>{
      const asset=cp?.asset||surface(frames[0])?.addedSticker();if(!stickerIds.includes(asset)){status('Add a sticker in Try screen first.');return;}
      add(asset,{...saved,x:Math.min(90,(saved.x??measure.x??50)+5),y:Math.min(90,(saved.y??measure.y??50)+5)});
    }));
  }
  if(cp)section.append(btn('Remove design sticker',()=>{layout.copies=layout.copies.filter(c=>c.id!==selected);delete layout.styles[selected];selected='row';update();select('row');}));
  const snap=document.createElement('select');for(const n of [0,4,8,16])snap.append(option(n,n?n+' px':'Off'));snap.value=grid;snap.onchange=()=>{grid=Number(snap.value);renderFrames()};section.append(label('Snap when dragging',snap));holder.append(section);
}
function bookUI(){
  review.render();
  const d=current(book),latest=d?.revisions.at(-1);$('revision').textContent=latest?(d.name+' · Revision '+d.revisions.length+' · '+latest.id.slice(0,8)+' · App '+latest.appVersion+(dirty?' · Edited':'')):'Original layout · App '+appVersion+(dirty?' · Edited':'');
  $('drafts').replaceChildren(...(book.drafts.length?book.drafts.map(x=>option(x.id,x.name)):[option('','No saved drafts')]));$('drafts').value=book.active||'';
  const prior=$('history').value;$('history').replaceChildren(...(d?.revisions||[]).map((r,i)=>option(r.id,'Revision '+(i+1)+' · '+r.id.slice(0,8)+(d.approved===r.id?' · Approved':''))).reverse());
  if(d?.revisions.some(r=>r.id===prior))$('history').value=prior;
  $('approval').textContent=d?.approved?'Approved revision '+d.approved.slice(0,8)+'. Publishing is separate.':'Approval records your choice. Live app publishing is separate.';
  $('restore').disabled=!d;$('approve').disabled=!d;$('duplicate').disabled=!d;
}
async function api(action,payload){
  const r=await fetch('https://pigeon-post-delivery.nikki0radz.chatgpt.site/api/design/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),referrerPolicy:'no-referrer',cache:'no-store'});
  let data;try{data=await r.json()}catch{throw Error('The workspace service is unavailable. Your local edits are still here.')}
  if(!r.ok){if(r.status===409)conflict=true;throw Error(r.status===409?'Another session saved first. Reconnect to load its changes before saving.':data.error||'Workspace request failed.');}return data;
}
async function ensureKey(){if(!key){const r=await api('create',{});key=r.key;localStorage.setItem(KEY,key);}return key;}
async function read(k,replace){
  const data=await api('read',{key:k});
  if(data.book&&(data.book.schema!==1||data.book.screen!==screen||!Array.isArray(data.book.drafts)))throw Error('This workspace uses a different screen or format.');
  profile=data.profile;
  if(replace){book=data.book||newBook();version=data.version;const d=current(book);clearRound(d?.revisions.at(-1));layout=cleanLayout(d?.revisions.at(-1)?.layout);comments=structuredClone(d?.revisions.at(-1)?.comments||[]);$('name').value=d?.name||pageName+' layout';dirty=false;conflict=false;selected='row';}
  dimensions();renderFrames();bookUI();elList();inspector();cache();
}
async function commit(next){if(!isComposer){localStorage.setItem(CACHE,JSON.stringify({book:next,dirty:false,profile}));book=next;return;}if(conflict)throw Error('Reconnect to load the latest workspace first.');await ensureKey();const r=await api('save',{key,version,book:next});book=next;version=r.version;cache();}
function action(fn){return async()=>{if(locked)return;locked=true;document.querySelector('main').inert=true;try{await fn()}catch(e){status(e.message);$('pair-status').textContent=e.message;}finally{locked=false;document.querySelector('main').inert=false}}}
async function save(copy=false){
  const name=$('name').value.trim();if(!name)throw Error('Give your draft a name first.');
  const next=structuredClone(book),dname=copy?name+' (copy)':name;
  const rev=record(next,dname,layout,copy);rev.comments=structuredClone(comments);rev.reviewOption=optionInfo();await commit(next);dirty=false;$('name').value=dname;cache();bookUI();$('history').value=rev.id;
  status('Saved '+dname+' · '+rev.id.slice(0,8)+'. '+(isComposer?'On your phone, tap Refresh draft.':'Saved on this laptop.'));
}
function commentsForPage(id,data,allOptions){
  const rd=Object.hasOwn(rounds,id)?rounds[id]:null,cmp=data.comparison;
  const groups=rd?[rd,...(rd.groups||[])]:[];
  const active=groups.map((g,i)=>i===0?cmp?.active||0:cmp?.picks?.[g.id]||0);
  const activeKey=stateKey(active);
  function options(k){
    if(!rd||rd.id!==cmp?.id)return null;
    const nums=k.split('-').map(Number);
    return groups.map((g,i)=>({element:g.title,roundId:g.id,choice:(groups.length>1?String.fromCharCode(65+i):'')+(nums[i]||' Current'),name:g.options[(nums[i]||0)-1]?.name||'Current layout'}));
  }
  const draft=current(data.book||newBook()),latest=draft?.revisions.at(-1);
  function section(notes,k,info){
    return {screen:id,page:pages[id][0],flow:pages[id][1],appVersion,draft:data.name||draft?.name||null,
      baseRevision:latest?.id||null,options:info||options(k),comments:notes};
  }
  const sections=[];
  const notes=data.comments??latest?.comments??[];
  if(notes.length)sections.push(section(notes,activeKey,data.option||(!active.some(Boolean)&&data.basedOnOption)||null));
  if(allOptions)for(const [k,view] of Object.entries(cmp?.states||{})){
    if(k!==activeKey&&view.comments?.length)sections.push(section(view.comments,k,view.option));
  }
  return sections;
}
$('export-comments').onclick=()=>{
  const all=$('comment-scope').value==='board',sections=[];
  for(const id of all?Object.keys(pages):[screen]){
    let data;
    if(id===screen)data={book,comparison,comments,option:optionInfo(),name:$('name').value};
    else try{data=JSON.parse(localStorage.getItem('pigeon.design.workroom.cache.v1'+(id===composer?'':'.'+id)))}catch{}
    if(data)sections.push(...commentsForPage(id,data,all));
  }
  if(!sections.length){status('No comments in this selection. Right-click an element and choose Keep comment, or change the export scope under Comments.');return;}
  exportComments(sections,all?'screen-board':pageName);
  status('Comments downloaded. Attach the comments.json file to this chat.');
};
$('export').onclick=()=>{
  const d=current(book),rev=d?.revisions.at(-1);
  exportReview({name:$('name').value.trim()||pageName+' layout',draftId:d?.id||null,baseRevision:rev?.id||null,
    state:dirty||!rev?'Working copy':'Saved revision',approved:!!rev&&!dirty&&d.approved===rev.id,
    reviewOption:optionInfo()||rev?.reviewOption||null,preview:{preset:$('device-name').textContent,width:frames[0].contentWindow.innerWidth,height:frames[0].contentWindow.innerHeight},component:pageName,sourceFiles:isComposer?['shop/guest-studio.mjs','shop/studio.css']:pages[screen][1]==='Main app'?['app.js','post/','styles.css']:['post/guest.mjs','shop/','post/guest.css'],appVersion,screen,layout:cleanLayout(layout),comments,elementPaths:Object.fromEntries(Object.keys(layout.styles).filter(k=>elements[k]).map(k=>[k,elements[k][1]])),targets:Object.fromEntries(Object.keys(layout.styles).map(k=>[k,nice(k)]))});
  status('Review file downloaded. Attach the .json file to this chat.');
};
$('save').onclick=action(()=>save());$('duplicate').onclick=action(()=>save(true));
$('restore').onclick=()=>{const r=current(book)?.revisions.find(r=>r.id===$('history').value);if(r){clearRound(r);layout=cleanLayout(r.layout);comments=structuredClone(r.comments||[]);selected='row';update();select('row');status('Revision '+r.id.slice(0,8)+' restored locally. Save draft to create a new revision.');}};
$('approve').onclick=action(async()=>{const next=structuredClone(book),d=current(next);d.approved=$('history').value;await commit(next);bookUI();status('Approval recorded for '+d.approved.slice(0,8)+'.');});
$('drafts').onchange=action(async()=>{const id=$('drafts').value;if(dirty&&!confirm('Discard unsaved edits and switch drafts?')){bookUI();return;}const next=structuredClone(book);next.active=id;try{await commit(next)}catch(e){bookUI();throw e}const d=current(book);clearRound(d.revisions.at(-1));layout=cleanLayout(d.revisions.at(-1).layout);comments=structuredClone(d.revisions.at(-1).comments||[]);dirty=false;$('name').value=d.name;selected='row';cache();bookUI();select('row');status(isComposer?'Active draft changed. Refresh draft on your phone to follow it.':'Active laptop draft changed.');});
$('name').oninput=()=>{dirty=true;cache();bookUI()};
$('pair').onclick=action(async()=>{$('pairDialog').showModal();$('key').value=await ensureKey();$('pair-status').textContent=profile?'Phone measurements received.':'Waiting for your phone to report its measurements.'});
$('copy').onclick=action(async()=>{await navigator.clipboard.writeText($('key').value);$('pair-status').textContent='Key copied.'});
$('connect').onclick=action(async()=>{const k=$('key').value.trim().toLowerCase();if(!/^[a-f0-9]{32}$/.test(k))throw Error('Enter the 32-character workspace key.');if(dirty&&!confirm('Replace local edits with this saved workspace?'))return;await read(k,true);key=k;localStorage.setItem(KEY,k);$('pair-status').textContent='Connected.';status('Workspace loaded.');});
$('measure').onclick=action(async()=>{await read(await ensureKey(),false);$('pair-status').textContent=profile?'My phone measurements updated.':'Pair your installed app and tap Refresh draft first.';});
$('element').onchange=e=>select(e.target.value);
function mode(edit){editing=edit;$('edit').setAttribute('aria-pressed',String(edit));$('try').setAttribute('aria-pressed',String(!edit));renderFrames();$('bench-hint').textContent=edit?'Click an element to inspect it. Drag a selected sticker to position it.':'Tap through either preview. Sample deliveries stay in Design Mode.';}
$('edit').onclick=()=>mode(true);$('try').onclick=()=>mode(false);$('compare').onchange=$('zoom').onchange=dimensions;
window.addEventListener('message',e=>{if(e.origin!==location.origin||!frames.some(f=>f.contentWindow===e.source)||e.data?.app!=='pigeon-studio')return;const m=e.data;if(m.type==='ready'){elList();renderFrames();inspector()}else if(m.type==='select'&&editing){activeFrame=frames.find(f=>f.contentWindow===e.source);select(m.key);document.querySelector('aside').scrollTop=0;}else if(m.type==='move'&&editing&&m.key===selected){const obj=layout.styles[selected]||={};obj.x=Math.round(m.x*10)/10;obj.y=Math.round(m.y*10)/10;update();inspector();}});
renderOptions();window.addEventListener('resize',dimensions);dimensions();elList();inspector();bookUI();
if(isComposer&&key)action(async()=>{if(dirty||Object.keys(comparison.states).length){await read(key,false);status('Local edits restored.');}else{await read(key,true);status('Saved workspace loaded.');}})();
