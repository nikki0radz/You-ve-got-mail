import {feedbackGroups,approvedLooks} from './rounds.mjs';
import {selector,label,describe,layout,screen} from './live-review-model.mjs';
import {freezeFrame} from './review-freeze.mjs';

const prefix='pigeon.live-review.v1.';
const properties={background:'background-color',text:'color',border:'border-color'};
const palette=['#fff9ed','#f2d5bf','#dbc6d4','#c9ddd1','#a1c6bc','#597c66','#283f32','#111c19'];
const json = (key,fallback) => {try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;}};
const unsaved = new Map();
const records = () => Object.keys(localStorage).filter(k=>k.startsWith(prefix)).map(k=>json(k,null)).filter(Boolean);
const keyFor = meta => prefix+JSON.stringify([meta.surface,meta.view,meta.theme]);
function repairFlowerSwatches(){
  try{
    const marker='pigeon.repair.flower-swatches.020';if(localStorage.getItem(marker))return;
    const key=keyFor({surface:'app',view:'shop / Flowers / 30 designs',theme:'dark'}),entry=json(key,null);
    if(!entry?.targets)return;
    const tile='#parcel-shop > div.frame-card > div.frame-rail > button:nth-of-type(';
    if(!entry.targets[tile+'27)']?.comment?.includes('accidentally changed'))return;
    for(const n of [27,30,31,32]){
      const item=entry.targets[tile+n+')'];
      if(item?.colours&&(n===27||item.colours.background==='#fff9ed'))delete item.colours.background;
    }
    localStorage.setItem(key,JSON.stringify(entry));localStorage.setItem(marker,'1');
  }catch{}
}
repairFlowerSwatches();
const spacer=document.createElement('div');
spacer.className='review-space';
document.body.prepend(spacer);
const dock=document.createElement('div');
dock.dataset.reviewUi='dock';
const ui=dock.attachShadow({mode:'open'});
ui.innerHTML=`<style>
:host{all:initial} *{box-sizing:border-box} [hidden]{display:none!important}
.bar,.panel{pointer-events:auto;color:#213a30;background:#fbf6e9;font:500 14px/1.35 system-ui,sans-serif}
.bar{display:inline-flex;gap:4px;align-items:center;padding:3px 6px;border:1px solid #869988;border-radius:0 0 0 15px;box-shadow:0 2px 8px #20342a22}
button,select,input,textarea{font:inherit;color:inherit}button,select{cursor:pointer}
button{border:1px solid #9daa98;background:#fffaf1;border-radius:10px;min-height:36px;padding:5px 10px;font-weight:650}
button:focus-visible,select:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #88456b;outline-offset:1px}
.bar button{min-height:30px;font-size:12px;border:0;background:transparent}.bar .export{background:#315846;color:white}
.switch{display:inline-flex;align-items:center;gap:6px}.track{width:26px;height:16px;background:#67766c;border-radius:12px;padding:2px}.track i{display:block;width:12px;height:12px;background:white;border-radius:100%}
[aria-checked=true] .track{background:#315846}[aria-checked=true] i{transform:translateX(10px)}
.panel,.hint{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:min(100%,440px);text-align:left;border:1px solid #91a390;border-radius:18px 18px 0 0;padding:12px 15px max(12px,env(safe-area-inset-bottom));box-shadow:0 -3px 16px #17291d33}
.channels{display:flex;gap:4px;margin:8px 0}.channels [aria-pressed=true]{background:#315846;color:white}.channels button{flex:1}
.panel{max-height:65dvh;overflow:auto}.panel header,.colours,.panel footer{display:flex;align-items:center;gap:7px}.panel header,.panel footer{justify-content:space-between}.panel header strong{font-size:16px}.panel label{display:block;margin-top:8px;font-size:12px;font-weight:650}.panel select,.panel textarea,.hex{background:#fffdf6;border:1px solid #829584;border-radius:8px;padding:6px}.target,textarea{width:100%}textarea{display:block;resize:vertical;min-height:54px}
.colours{margin:5px 0;flex-wrap:wrap}.colours input[type=color]{width:35px;height:32px}.hex{width:84px}.palette{display:flex;gap:5px}.palette button{min-height:24px;width:24px;padding:0;border-radius:50%;border:1px solid #778678}
.hint{width:auto;max-width:95%;white-space:nowrap;padding:6px 12px;bottom:9px;border-radius:14px;font:600 12px system-ui;background:#263e32;color:white;pointer-events:none}.status{font-size:12px}.done{background:#315846;color:white}
</style><div class="bar"><button class="export" hidden>Export design</button><button class="switch" role="switch" aria-checked="false"><span class="track"><i></i></span>Design mode</button></div>
<div class="hint" role="status" hidden>Tap an element to mark it up</div>
<section class="panel" aria-label="Element feedback" hidden><header><strong>Element feedback</strong><button class="done">Done</button></header>
<label>Selected element<select class="target"></select></label><div class="channels" role="group" aria-label="Colour property"><button data-channel="background" aria-pressed="true">Background</button><button data-channel="text" aria-pressed="false">Text colour</button><button data-channel="border" aria-pressed="false">Border</button></div><div class="colours"><input type="color" aria-label="Choose colour"><input class="hex" aria-label="Hex colour" maxlength="7"><button class="reset">Original</button></div><div class="palette"></div>
<label>Comment<textarea rows="2" maxlength="4000" placeholder="What would you change here?"></textarea></label><footer><span class="status" role="status"></span></footer></section>`;
const $=s=>ui.querySelector(s);
let channel='background';
const freeze=document.createElement('dialog');
freeze.dataset.reviewUi='freeze';freeze.setAttribute('aria-label','Design review');
document.body.append(freeze);
let session=null,selected=null,lastLiveKey='',liveStyle=document.createElement('style');
liveStyle.setAttribute('data-live-colours','');
document.head.append(liveStyle);
let openOrder=[];
function rootNow(){
  const opened=[...document.querySelectorAll('dialog[open]:not([data-review-ui])')];
  openOrder=openOrder.filter(n=>opened.includes(n));
  for(const n of opened)if(!openOrder.includes(n))openOrder.push(n);
  return openOrder.at(-1)||document.querySelector('#phone-studio,.guest,#app')||document.body;
}
function rules(items){
  return Object.values(items||{}).map(item=>{
    let css='';
    for(const [key,value] of Object.entries(item.colours||{})){
      if(!properties[key]||!/^#[a-f0-9]{6}$/i.test(value))continue;
      css+=properties[key]+':'+value+'!important;';
      if(key==='background')css+='background-image:none!important;';
    }
    if(!css)return '';
    let rule=item.selector+'{'+css+'}';
    if(item.selector.endsWith('div.frame-card')){
      const children=['.frame-rail','.frame-name'].map(c=>item.selector+' > '+c).join(',');
      const shared=Object.keys(item.colours||{}).filter(k=>Object.hasOwn(properties,k)).map(k=>properties[k]+':inherit!important;').join('');
      rule+=children+'{'+shared+'}';
    }
    return rule;
  }).join('\n');
}
const optionKey=group=>'pigeon-style-'+group.id;
function optionNumber(group){
  const number=Number(json(optionKey(group),0));
  return Number.isInteger(number)&&number>=1&&number<=group.options.length?number:0;
}
function applyOptions(root){
  for(const group of feedbackGroups){
    const el=root.querySelector(group.selector);
    if(!el)continue;
    const n=approvedLooks[group.key]||optionNumber(group);
    if(n)el.dataset.reviewLook=group.key+'-'+n;
  }
}
function numberControls(doc,root){
  for(const group of feedbackGroups){
    if(approvedLooks[group.key])continue;
    const target=root.querySelector(group.selector),anchor=root.querySelector(group.anchor);
    if(!target||!anchor)continue;
    const row=doc.createElement('aside');
    row.className='element-numbers';row.dataset.reviewUi='options';row.setAttribute('role','group');
    row.setAttribute('aria-label',group.title+' design options');
    group.options.forEach((option,i)=>{
      const b=doc.createElement('button');b.type='button';b.textContent=String(i+1);
      b.setAttribute('aria-label',group.title+' '+(i+1)+' · '+option.name);
      b.setAttribute('aria-pressed',String((optionNumber(group)||Number(target.dataset.baseLook?.split('-')[1]||1))===i+1));
      row.append(b);
    });
    // Keep the controls adjacent to their element in the scrolling phone copy.
    if(anchor.matches('legend'))anchor.after(row);else if(anchor.matches('summary,.note-question'))anchor.parentElement.before(row);else anchor.before(row);
    row.choose=button=>{
      const n=Number(button.textContent);
      target.dataset.reviewLook=group.key+'-'+n;
      for(const b of row.children)b.setAttribute('aria-pressed',String(b===button));
      try{localStorage.setItem(optionKey(group),String(n));}catch{}
      session.entry.choices??={};
      session.entry.choices[group.id]={group:group.title,number:n,name:group.options[n-1].name};
      save(true);
    };
  }
}
function sync(force=false){
  if(session)return;
  const root=rootNow(),host=root.matches('dialog[open]')?root:document.body;
  if(dock.parentNode!==host)host.append(dock);
  applyOptions(root);
  const key=keyFor(screen(document,root));
  if(force||key!==lastLiveKey){lastLiveKey=key;liveStyle.textContent=rules((unsaved.get(key)||json(key,{targets:{}})).targets)+linkedRules(document.documentElement.dataset.theme);}
}
const observer=new MutationObserver(()=>sync());
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','data-review-screen','aria-current','aria-pressed']});
observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
window.addEventListener('storage',()=>sync(true));
function status(message){$('.status').textContent=message;}
function save(updateLayout=false,changed){
  const {meta,root,entry}=session;
  const key=keyFor(meta);
  const previous=unsaved.get(key)||json(key,null);
  if(previous){
    const latest={...previous.targets};
    if(changed){if(entry.targets[changed])latest[changed]=entry.targets[changed];else delete latest[changed];}
    entry.targets=latest;
  }
  if(updateLayout)entry.layout=layout(root);
  entry.updatedAt=new Date().toISOString();
  try{localStorage.setItem(key,JSON.stringify(entry));unsaved.delete(key);status('Saved on this device');}
  catch{unsaved.set(key,entry);status('Device storage is full or unavailable. Export before leaving.');}
}
// Linked navigation colours follow the active state, even on another tab.
const linkedColourKey = theme => 'pigeon.linked-navigation.v1.'+theme;
function linkedTarget(el){
  const tab=el.closest('.app-nav button, .mail-tabs button');
  if(!tab)return '';
  if(tab.closest('.app-nav'))return '#app .app-nav button'+(tab.hasAttribute('aria-current')?'[aria-current=page]':':not([aria-current])');
  return '#app .mail-tabs button[aria-pressed='+tab.getAttribute('aria-pressed')+']';
}
function linkedRules(theme){
  return rules(json(linkedColourKey(theme),{}));
}
function updateLinkedColour(value){
  const selector=linkedTarget(selected);
  if(!selector)return;
  const key=linkedColourKey(session.meta.theme),items=json(key,{});
  const record=items[selector]||{selector,colours:{}};
  if(value)record.colours[channel]=value;else delete record.colours[channel];
  items[selector]=record;
  try{localStorage.setItem(key,JSON.stringify(items));}catch{}
}
function paint(){
  session.style.textContent=rules(session.entry.targets)+linkedRules(session.meta.theme);
}
function closePanel(){
  selected?.removeAttribute('data-review-picked');selected=null;
  $('.panel').hidden=true;$('.hint').hidden=!session;
}
function finish(){
  if(!session)return false;
  save(true);closePanel();session=null;freeze.close();freeze.replaceChildren();
  $('.switch').setAttribute('aria-checked','false');$('.export').hidden=true;$('.hint').hidden=true;
  sync(true);$('.switch').focus({preventScroll:true});return true;
}
function record(){
  const path=selector(selected),items=session.entry.targets;
  return items[path]??={selector:path,label:label(selected),atSelection:describe(selected),colours:{},comment:''};
}
function edit(write){
  const item=record();write(item);
  if(!item.comment && !Object.keys(item.colours).length)delete session.entry.targets[item.selector];
  paint();save(false,item.selector);
}
function colourState(){
  const prop=channel,computed=session.doc.defaultView.getComputedStyle(selected).getPropertyValue(properties[prop]);
  const rgb=computed.match(/[\d.]+/g)||[];
  const current=session.entry.targets[selector(selected)]?.colours?.[prop]||
    (rgb.length>=3&&rgb[3]!=='0'?'#'+rgb.slice(0,3).map(x=>Number(x).toString(16).padStart(2,'0')).join(''):'');
  $('.hex').value=current;$('.hex').placeholder='Original';$('input[type=color]').value=current||'#ffffff';
}
function setColour(v){if(!/^#[0-9a-f]{6}$/i.test(v))return;updateLinkedColour(v.toLowerCase());edit(item=>{item.colours[channel]=v.toLowerCase();});colourState();}
function select(el){
  selected?.removeAttribute('data-review-picked');selected=el;el.setAttribute('data-review-picked','');
  $('textarea').value=session.entry.targets[selector(el)]?.comment||'';
  $('.panel').hidden=false;$('.hint').hidden=true;
  const current=session.entry.targets[selector(el)];
  status(current?'Saved on this device':'');colourState();
}
function pick(el){
  if(el.closest('svg'))el=el.closest('svg');
  if(!session.root.contains(el)&&el!==session.root) el=session.root.matches('dialog')?session.root:session.doc.body;
  const trail=[];for(let n=el;n&&n.localName!=='html';n=n.parentElement){trail.push(n);if(n===session.root && n.matches('dialog'))break;}
  const choices=$('.target');choices.replaceChildren();
  for(const n of trail)choices.add(new Option(label(n),String(choices.options.length)));
  const card=el.closest('.frame-card');
  choices.selectedIndex=card?trail.indexOf(card):0;
  choices.onchange=()=>select(trail[choices.selectedIndex]);select(trail[choices.selectedIndex]);
}
function begin(){
  const root=rootNow(),meta=screen(document,root);
  const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-same-origin');frame.title='Paused app screen';
  frame.style.width=innerWidth+'px';frame.style.height=innerHeight+'px';
  freeze.append(frame);freeze.showModal();
  const {doc,root:twin}=freezeFrame(frame,root);
  const style=doc.createElement('style');doc.head.append(style);
  const mark=doc.createElement('style');mark.textContent='[data-review-picked]{outline:3px dashed #b13b79!important;outline-offset:-3px!important}';doc.head.append(mark);
  const entry=unsaved.get(keyFor(meta))||json(keyFor(meta),{...meta,targets:{}});
  session={doc,root:twin,meta,entry,style};paint();save(true);numberControls(doc,twin);
  freeze.append(dock);
  $('.switch').setAttribute('aria-checked','true');$('.export').hidden=false;$('.hint').hidden=false;
  doc.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const b=e.target.closest('.element-numbers button');if(b)b.parentElement.choose(b);else pick(e.target);},true);
  // Disabled HTML controls do not dispatch click in every WebView.
  doc.addEventListener('pointerup',e=>{if(e.target.matches(':disabled'))pick(e.target);},true);
  doc.addEventListener('beforeinput',e=>e.preventDefault(),true);
  doc.addEventListener('pointerdown',e=>{if(e.target.closest('input,textarea,select,label,summary,a,button'))e.preventDefault();},true);
  doc.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();back();}else if(['Enter',' '].includes(e.key)&&!e.target.closest('.element-numbers')){e.preventDefault();pick(e.target);}},true);
  doc.addEventListener('cancel',e=>{e.preventDefault();back();},true);
  doc.addEventListener('submit',e=>e.preventDefault(),true);
}
function back(){if(!session)return false;if(selected)closePanel();else finish();return true;}
window.pigeonReviewBack=back;
window.startPigeonReview=begin;
freeze.addEventListener('cancel',e=>{e.preventDefault();back();});
$('.switch').onclick=()=>session?finish():begin();
$('.done').onclick=()=>{closePanel();$('.switch').focus();};
$('textarea').oninput=e=>edit(item=>{item.comment=e.target.value;});
for(const b of ui.querySelectorAll('[data-channel]'))b.onclick=()=>{
  channel=b.dataset.channel;
  for(const x of ui.querySelectorAll('[data-channel]'))x.setAttribute('aria-pressed',String(x===b));
  colourState();
};
$('input[type=color]').oninput=e=>setColour(e.target.value);
$('.hex').oninput=e=>setColour(e.target.value);
$('.reset').onclick=()=>{updateLinkedColour(null);edit(item=>{delete item.colours[channel];});colourState();};
for(const hex of palette){const b=document.createElement('button');b.style.background=hex;b.setAttribute('aria-label','Use '+hex);b.onclick=()=>setColour(hex);$('.palette').append(b);}
$('.export').onclick=()=>{
  save(true);
  const prefs={};
  const all=new Map(unsaved);
  try{
    for(const entry of records())if(!all.has(keyFor(entry)))all.set(keyFor(entry),entry);
    for(const k of Object.keys(localStorage).filter(k=>['pigeon.home.colours.v2','pigeon.phone.home.design.v1','pigeon-library-category-layout'].includes(k)||k.startsWith('pigeon-style-')||k.startsWith('pigeon.linked-navigation.v1.'))){
      prefs[k]=json(k,localStorage.getItem(k));
    }
  }catch{}
  all.set(keyFor(session.meta),session.entry);
  const views=[...all.values()];
  const data=JSON.stringify({format:'pigeon-post.element-review',version:1,appVersion:'0.1.29',exportedAt:new Date().toISOString(),preferences:prefs,views},null,2);
  if(window.Pigeon?.saveReview){Pigeon.saveReview(data);return;}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download='pigeon-post-design-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);
};
sync(true);
