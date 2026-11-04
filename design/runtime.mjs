import {appearance} from './appearance.mjs';
import {extraCSS} from './templates.mjs';
import {elements,cleanLayout,empty,screen} from './model.mjs';
import {W,H} from '../shop/studio-scene.mjs';
const dialog=document.querySelector('#parcel-shop'),sheet=document.createElement('style');
document.head.append(sheet);
let layout=empty(),editing=false,selected='row',grid=0,textScale=1,frame=0,drag=null;
const phone=window.PigeonDesign;
const notify=(type,details={})=>{if(parent!==window)parent.postMessage({app:'pigeon-studio',type,...details},location.origin)};
function selector(key){return elements[key]?.[1]||('[data-design-copy="'+key+'"]')}
function target(key){return dialog.querySelector(selector(key))}
function apply(){
  let css='';
  for(const key of ['pocket',...Object.keys(layout.styles).filter(k=>k!=='pocket')]){
    const s=layout.styles[key];if(!s)continue;
    const d=extraCSS(s);
    for(const k of ['width','height','padding','margin','gap','fontSize','borderWidth'])if(k in s)d[k]=s[k]+'px';
    if(s.width&&['note','second'].includes(key))d.flex='0 0 auto';
    if(s.width||s.height)d.boxSizing='border-box';if(s.height)d.minHeight='0';
    if('radius'in s)d.borderRadius=s.radius+'px';
    if('borderWidth'in s)d.borderStyle='solid';
    if('opacity'in s)d.opacity=s.opacity/100;
    if(s.align){d.textAlign=s.align;if(key==='row')d.justifyContent={left:'flex-start',center:'center',right:'flex-end'}[s.align];}
    if(s.font)d.fontFamily=s.font;
    for(const k of ['background','color','borderColor'])if(s[k])d[k]=s[k];
    if('x'in s)d.left=s.x+'%';if('y'in s)d.top=s.y+'%';
    const sel='#parcel-shop.guest-studio :where('+selector(key)+')',decl=Object.entries(d).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v+'!important').join(';');
    css+=sel+'{'+decl+'}\n';
    if(key==='row'){
      if(s.order)css+=sel+' [data-tool=second]{order:'+(s.order==='sticker-first'?-1:1)+'!important}';
      if(s.equal)css+=sel+' button{flex:'+(s.equal==='equal'?'1 1 0%':'0 1 auto')+'!important}';
    }
  }
  sheet.textContent=css;
  draw();
}
function draw(){
  const stage=dialog.querySelector('.sample-phone');if(!stage)return;
  const copies=new Map([...stage.querySelectorAll('[data-design-copy]')].map(el=>[el.dataset.designCopy,el]));
  for(const cp of layout.copies){
    if(copies.delete(cp.id))continue;
    const el=document.createElement('img');el.alt='Design sticker';el.draggable=false;el.dataset.designCopy=cp.id;
    el.src='assets/guest/'+cp.asset+'.svg';el.style.cssText='position:absolute;left:58%;top:60%;width:24%;height:auto;z-index:2;touch-action:none';
    stage.insertBefore(el,stage.querySelector('[data-layer=note]'));
  }
  for(const el of copies.values())el.remove();
  dialog.querySelectorAll('[data-design-selected]').forEach(el=>el.removeAttribute('data-design-selected'));
  if(editing)target(selected)?.setAttribute('data-design-selected','');
}
function geometry(el,stage){
  const a=el.getBoundingClientRect(),b=stage.getBoundingClientRect(),w=a.width/b.width*W;
  return {x:(a.left-b.left)/b.width*W,y:(a.top-b.top)/b.height*H,width:w,ratio:(a.height/b.height*H)/w,opacity:Number(getComputedStyle(el).opacity)};
}
dialog.designGeometry=()=>{
  const stage=target('art')?.parentElement;if(!stage)return null;
  const g={copies:[]};for(const key of ['art','extra','banner'])if(target(key))g[{art:'art',extra:'second',banner:'note'}[key]]=geometry(target(key),stage);
  for(const image of stage.querySelectorAll('[data-design-copy]'))g.copies.push({...geometry(image,stage),image});
  return g;
};
function keyFor(el){
  const copy=el.closest('[data-design-copy]');if(copy)return copy.dataset.designCopy;
  for(const k of [...Object.keys(elements).filter(k=>!['row','pocket','palette','banners'].includes(k)),'row','palette','banners'])if(el.closest(selector(k)))return k;
}
function inspect(key){
  const el=target(key);if(!el)return null;
  const c=getComputedStyle(el),rect=el.getBoundingClientRect();
  const rgba=s=>{const rgb=s.match(/\d+/g);return rgb?'#'+rgb.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''):'#ffffff';};
  const s={align:c.textAlign,font:c.fontFamily.split(',')[0].replace(/[\"']/g,''),width:Math.round(rect.width),height:Math.round(rect.height),gap:parseFloat(c.gap)||0,padding:parseFloat(c.paddingTop)||0,margin:parseFloat(c.marginTop)||0,fontSize:parseFloat(c.fontSize),borderWidth:parseFloat(c.borderTopWidth),radius:parseFloat(c.borderTopLeftRadius),opacity:Math.round(c.opacity*100),color:rgba(c.color),background:rgba(c.backgroundColor),borderColor:rgba(c.borderTopColor)};
  if(el.closest('.sample-phone')){const g=geometry(el,el.closest('.sample-phone'));s.x=g.x/W*100;s.y=g.y/H*100;}
  return s;
}
function isLayer(k){return ['art','banner','extra'].includes(k)||k?.startsWith('copy-')}
dialog.addEventListener('pointerdown',e=>{
  if(!editing)return;
  const key=keyFor(e.target);if(!key)return;
  e.preventDefault();e.stopImmediatePropagation();selected=key;draw();notify('select',{key});
  if(isLayer(key)){const stage=dialog.querySelector('.sample-phone').getBoundingClientRect(),s=inspect(key);drag={key,id:e.pointerId,startX:e.clientX,startY:e.clientY,x:s.x,y:s.y,stage};dialog.setPointerCapture(e.pointerId);}
},true);
dialog.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const {key,startX,startY,x,y,stage}=drag;
  const value=(v,d,size)=>Math.max(0,Math.min(95,grid?Math.round((v*size/100+d)/grid)*grid/size*100:v+100*d/size));
  if(Math.hypot(e.clientX-startX,e.clientY-startY)<2)return;
  notify('move',{key,x:value(x,e.clientX-startX,stage.width),y:value(y,e.clientY-startY,stage.height)});
},true);
for(const event of ['pointerup','pointercancel'])dialog.addEventListener(event,()=>drag=null,true);
document.addEventListener('click',e=>{if(editing&&dialog.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}},true);
const decoration=document.createElement('style');decoration.textContent='[data-design-selected]{outline:2px dashed #0c786e!important;outline-offset:-2px}';document.head.append(decoration);
let lastToolbar=null;
function changed(){
  cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
    draw();
    if(phone)phoneControls();
    const row=target("row");if(row!==lastToolbar){lastToolbar=row;notify("ready");}
    // Desktop Chromium has no WebView textZoom. Scale each element from its unscaled size.
    if(!phone&&textScale!==1){
      const nodes=[...dialog.querySelectorAll('button,h2,small,label,select,p,summary')];
      for(const n of nodes)n.style.removeProperty('font-size');
      const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize)*textScale);
      nodes.forEach((n,i)=>n.style.setProperty('font-size',sizes[i]+'px','important'));
    }
  });
}
new MutationObserver(changed).observe(dialog,{childList:true,subtree:true});
window.designSurface={
  inspect,appearance:key=>appearance(target(key)),toolbarReport(){
    const row=target('row'),a=target('note'),b=target('second');if(!row||!a||!b)return '';
    if(Math.abs(a.getBoundingClientRect().top-b.getBoundingClientRect().top)>2)return 'Buttons wrap';
    if([a,b].some(el=>el.scrollWidth>el.clientWidth+1)||row.scrollWidth>row.clientWidth+1)return 'Toolbar clips';
    return 'Buttons fit';
  }, addedSticker:()=>Number(target('extra')?.querySelector('img')?.getAttribute('src')?.match(/[0-9]+/)?.[0]), configure(config){layout=cleanLayout(config.layout);editing=!!config.editing;selected=config.selected||'row';grid=config.grid||0;
    if(textScale!==config.textScale){textScale=config.textScale||1;dialog.querySelectorAll('[style*="font-size"]').forEach(n=>{if(!n.matches('textarea'))n.style.removeProperty('font-size')});}
    apply();changed();
  }
};
function phoneControls(){
  const host=dialog.open?dialog:document.body;
  if(host.querySelector(':scope > .phone-design-controls'))return;
  const controls=document.createElement('footer');controls.className='phone-design-controls';
  controls.style.cssText='text-align:center;margin:15px auto;color:#294938;font:13px system-ui';
  const status=document.createElement('p');controls.append(status);status.textContent=phoneStatus;
  for(const [label,fn] of [['Refresh draft',()=>phone.refresh()],['Close Design Mode',()=>phone.close()]]){
    const b=document.createElement('button');b.textContent=label;b.onclick=fn;controls.append(b);
  }
  host.append(controls);
}
let phoneStatus='';
function loadPhone(){
  const state=JSON.parse(phone.state());const draft=state.draft;
  layout=cleanLayout(draft?.screen===screen?draft.layout:null);
  phoneStatus=state.error|| (draft?'Draft · '+draft.name+' · '+draft.id.slice(0,8):'No saved draft yet.');
  document.querySelectorAll('.phone-design-controls p').forEach(n=>n.textContent=phoneStatus);
  apply();phoneControls();
}
if(phone){loadPhone();window.addEventListener('pigeon-design-update',loadPhone);}
await import('../post/guest.mjs');
notify('ready');changed();
