import {readLook} from './parcel-round.mjs';
import {appearance} from './appearance.mjs';
import {extraCSS} from './templates.mjs';
const defs=new Map(),sheet=document.createElement('style');document.head.append(sheet);let editing=true,selected='',stamp='';
const candidates='button,a,input,select,textarea,summary,label,h1,h2,h3,p,img,nav,header,section,fieldset,article,details,main,div[class],small,strong';
const emit=(type,key)=>parent.postMessage({app:'pigeon-studio',type,key},location.origin);
const kebab=k=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
function locate(n){
  const parts=[];
  while(n&&n!==document.body){
    if(n.id){parts.unshift('#'+CSS.escape(n.id));break;}
    const attrs=[...n.attributes].filter(a=>a.name.startsWith('data-')&&!['data-work-id','data-layout','data-open','data-design-selected','data-review-look'].includes(a.name));
    let part=n.localName;
    if(attrs.length)part+=attrs.map(a=>'['+a.name+'='+JSON.stringify(a.value)+']').join('');
    else if(n.classList.length)part+='.'+CSS.escape(n.classList[0]);
    const siblings=[...(n.parentElement?.children||[])].filter(x=>x.matches(part));
    if(siblings.length>1)part+=':nth-child('+([...n.parentElement.children].indexOf(n)+1)+')';
    parts.unshift(part);n=n.parentElement;
  }return parts.join(' > ');
}
let reviewStyles={};
const originals=new WeakMap();
function reviewNode(node,id){
  const value=reviewStyles[id]?.reviewLook, look=readLook(value);
  if(!look&&!node.hasAttribute('data-review-look'))return;
  if(look)node.dataset.reviewLook=value;else delete node.dataset.reviewLook;
  if(node.matches('.decline-pigeon')){
    if(!originals.has(node))originals.set(node,node.getAttribute('src'));
    const src=look?.entry[1]??originals.get(node);
    if(node.getAttribute('src')!==src)node.setAttribute('src',src);
    node.alt=look?look.entry[0]:'A tearful pigeon';
  }
  if(node.matches('.postal-header > strong')){
    if(!originals.has(node))originals.set(node,node.textContent);
    const title=look?'You’ve Got\nMail!':originals.get(node);
    if(node.textContent!==title)node.textContent=title;
  }
  if(node.matches('#steps > h2')){
    if(!originals.has(node))originals.set(node,node.textContent);
    const title=look?.entry[1]??originals.get(node);
    if(node.textContent!==title)node.textContent=title;
  }
  if(node.matches('.sender-label')){
    const input=node.querySelector('input');
    if(!originals.has(input))originals.set(input,input.placeholder);
    input.placeholder=look?'Your name':originals.get(input);
  }
  if(node.matches('.courier-stand')){
    let copy=node.querySelector('.counter-copy');
    if(!look){copy?.remove();return;}
    if(!copy){
      copy=document.createElement('div');copy.className='counter-copy';
      copy.append(document.createElement('b'),document.createElement('small'));node.append(copy);
    }
    for(const [i,el] of [...copy.children].entries())if(el.textContent!==look.entry[i+1])el.textContent=look.entry[i+1];
  }
}
function scan(){
  const root=[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;defs.clear();
  for(const n of root.querySelectorAll(candidates)){
    if(!n.getClientRects().length||n.closest('[aria-hidden=true]')||n.matches('input[type=hidden]'))continue;
    const path=locate(n);let hash=2166136261;for(const c of path)hash=Math.imul(hash^c.charCodeAt(0),16777619);
    const id='view-'+(hash>>>0).toString(36);n.dataset.workId=id;reviewNode(n,id);
    const label=(n.getAttribute('aria-label')||n.alt||(['BUTTON','A','H1','H2','H3','SUMMARY','LABEL','P','SMALL','STRONG'].includes(n.tagName)?n.textContent.trim():'')||n.classList[0]||n.id||n.tagName.toLowerCase()).replace(/\s+/g,' ').slice(0,52);
    defs.set(id,{n,label,path,type:n.matches('button,a,summary')?'button':n.matches('h1,h2,h3')?'heading':n.children.length>1?'group':'element'});
  }
  const signature=[...defs.keys()].join();if(signature!==stamp){stamp=signature;emit('ready');}
}
let raf;new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(scan)}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden']});
const propMap={radius:'borderRadius',font:'fontFamily',align:'textAlign'};
function configure(config){
  reviewStyles=config.layout.styles;
  for(const [id,{n}] of defs)reviewNode(n,id);
  editing=config.editing;selected=config.selected;let css='';
  for(const el of document.querySelectorAll('select[data-style-key]')){
    const v=config.layout.variants?.[el.dataset.styleKey]??0;
    if(el.value!==String(v)&&el.options[v]){el.value=String(v);el.dispatchEvent(new Event('change'));}
  }
  for(const [id,s] of Object.entries(config.layout.styles)){
    if(!/^view-[a-z0-9]+$/.test(id))continue;const d={...extraCSS(s)};
    for(const k of ['width','height','gap','margin','padding','radius','fontSize','borderWidth'])if(k in s)d[propMap[k]||k]=s[k]+'px';
    for(const k of ['color','background','borderColor','font','align'])if(k in s)d[propMap[k]||k]=s[k];
    if(s.width||s.height)d.boxSizing='border-box';if(s.height)d.minHeight=0;if(s.borderWidth!==undefined)d.borderStyle='solid';if('opacity'in s)d.opacity=s.opacity/100;
    css+='[data-work-id="'+id+'"]{'+Object.entries(d).map(([k,v])=>kebab(k)+':'+v+'!important').join(';')+'}';
  }
  if(editing&&/^view-[a-z0-9]+$/.test(selected))css+='[data-work-id="'+selected+'"]{outline:2px dashed #0c786e!important;outline-offset:-2px}';
  if(config.textScale&&config.textScale!==1){
    for(const [id,{n}] of defs){if(!n.childElementCount||n.matches('button,summary,label,h1,h2,h3,p,select')){const base=n.dataset.workFont||(n.dataset.workFont=parseFloat(getComputedStyle(n).fontSize));css+='[data-work-id="'+id+'"]{font-size:'+((config.layout.styles[id]?.fontSize||Number(base))*config.textScale)+'px!important}';}}
  }
  if(css!==sheet.textContent)sheet.textContent=css;
}
const colour=s=>{const a=s.match(/\d+/g);return a?'#'+a.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''):'#ffffff'};
function inspect(id){const n=defs.get(id)?.n;if(!n)return null;const c=getComputedStyle(n),r=n.getBoundingClientRect();return {width:r.width,height:r.height,gap:parseFloat(c.gap)||0,padding:parseFloat(c.paddingTop)||0,margin:parseFloat(c.marginTop)||0,fontSize:parseFloat(c.fontSize),radius:parseFloat(c.borderTopLeftRadius)||0,borderWidth:parseFloat(c.borderTopWidth),opacity:100*c.opacity,color:colour(c.color),borderColor:colour(c.borderColor),background:colour(c.backgroundColor),align:c.textAlign,font:c.fontFamily.split(',')[0].replace(/["']/g,'')}}
for(const type of ['pointerdown','click','keydown'])document.addEventListener(type,e=>{
  if(!editing||e.button===2||(type==='keydown'&&![' ','Enter'].includes(e.key)))return;
  const hit=e.target.closest('button[data-work-id],a[data-work-id],summary[data-work-id],select[data-work-id],label[data-work-id]')||e.target.closest('[data-work-id]');if(!hit)return;e.preventDefault();e.stopImmediatePropagation();
  if(type==='pointerdown'||type==='keydown')emit('select',hit.dataset.workId);
},true);
window.designSurface={idFor:selector=>document.querySelector(selector)?.dataset.workId,variants:()=>[...document.querySelectorAll('select[data-style-key]')].map(el=>({id:el.dataset.styleKey,title:el.parentElement.querySelector('span')?.textContent||'Layout',options:[...el.options].map(o=>o.textContent)})),inspect,appearance:id=>appearance(defs.get(id)?.n),configure,toolbarReport:()=>'',inventory:()=>Object.fromEntries([...defs].map(([k,v])=>[k,[v.label,v.path,v.type]]))};scan();emit('ready');
