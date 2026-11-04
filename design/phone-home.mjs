import {looks} from './parcel-round.mjs';

const key='pigeon.phone.home.design.v1';
const groups={header:{title:'Header layout',selector:'.courier-stand'},sign:{title:'Open / closed sign',selector:'.mail-sign'},carousel:{title:'Carousel',selector:'#home-wheel .wheel-paper'}};
const colours=['#f8f1dd','#e5efe7','#c9ddd1','#a1c6bc','#597c66','#365a40','#283f32','#ead8bf'];
let closeStudio=()=>false;
export function closePhoneStudio(){return closeStudio()}
export function openPhoneStudio(){
  if(document.getElementById('phone-studio'))return;
  let draft={header:1,sign:1,carousel:1,colours:{},align:{}};
  try{draft={...draft,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{}
  const layer=document.createElement('section');layer.id='phone-studio';
  layer.innerHTML='<header><button data-close>← Back</button><strong>Design Home</strong><button data-export>Export</button></header><p>Tap an item for colours and alignment. Hold it to see designs.</p><iframe title="Home design preview" src="design/page.html?page=home"></iframe><div class="phone-design-colours" aria-label="Colours"></div><div class="phone-design-controls" hidden></div><div class="phone-design-choices" hidden></div>';
  document.body.append(layer);
  const frame=layer.querySelector('iframe'),controls=layer.querySelector('.phone-design-controls'),palette=layer.querySelector('.phone-design-colours'),choices=layer.querySelector('.phone-design-choices');
  let target='header',timer=null,start=null,held=false;
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify(draft))}catch{}};
  function repaint(){
    const doc=frame.contentDocument;if(!doc?.querySelector('.courier-stand'))return;
    const stand=doc.querySelector('.courier-stand'),sign=doc.querySelector('.mail-sign'),wheel=doc.querySelector('#home-wheel .wheel-paper');
    stand.dataset.reviewLook='header-'+draft.header;
    let copy=stand.querySelector('.counter-copy');
    if(!copy){copy=doc.createElement('div');copy.className='counter-copy';copy.innerHTML='<b></b><small></small>';stand.append(copy)}
    copy.firstElementChild.textContent=looks.header[draft.header-1][1];copy.lastElementChild.textContent=looks.header[draft.header-1][2];
    sign.dataset.phoneSign=draft.sign;wheel.dataset.phoneWheel=draft.carousel;
    for(const [id,g] of Object.entries(groups)){
      const node=doc.querySelector(g.selector);if(!node)continue;
      node.style.textAlign=draft.align[id]||'';
      node.style.backgroundColor=draft.colours[id]||'';
    }
    let style=doc.getElementById('phone-design-style');
    if(!style){
      style=doc.createElement('style');style.id='phone-design-style';
      style.textContent=`
        .header-board .courier-stand .mail-sign[data-phone-sign]{border-radius:var(--phone-radius,14px);border-style:var(--phone-border,solid);box-shadow:var(--phone-shadow,0 3px 0 var(--edge));transform:var(--phone-rotate,none)}
        .mail-sign[data-phone-sign="2"]{--phone-radius:3px;--phone-border:double}
        .mail-sign[data-phone-sign="3"]{--phone-radius:40px;--phone-shadow:0 0 0 4px #dfd1af}
        .mail-sign[data-phone-sign="4"]{--phone-radius:4px 20px 4px 20px;--phone-rotate:rotate(-3deg)}
        .mail-sign[data-phone-sign="5"]{--phone-radius:50%;--phone-border:dashed}
        .mail-sign[data-phone-sign="6"]{--phone-radius:4px;--phone-shadow:5px 5px 0 #9a8b70}
        .mail-sign[data-phone-sign="7"]{--phone-radius:0;--phone-border:dotted}
        .mail-sign[data-phone-sign="8"]{--phone-radius:24px 4px;--phone-shadow:0 4px 0 #a39472}
        .mail-sign[data-phone-sign="9"]{--phone-radius:8px;--phone-border:double;--phone-rotate:rotate(3deg)}
        .mail-sign[data-phone-sign="10"]{--phone-radius:30px;--phone-border:dashed}
        #home-wheel .category-reel{mask-image:linear-gradient(to right,transparent,#000 var(--fade),#000 calc(100% - var(--fade)),transparent);-webkit-mask-image:linear-gradient(to right,transparent,#000 var(--fade),#000 calc(100% - var(--fade)),transparent)}
        #home-wheel .category-reel button:not([aria-current=true])>span{opacity:var(--side-opacity)!important}
      `;doc.head.append(style);
    }
    const rail=wheel.querySelector('.category-reel');
    rail.style.setProperty('--fade',(2+draft.carousel*1.4)+'%');rail.style.setProperty('--side-opacity',String(.39+draft.carousel*.055));
  }
  function pick(id){
    target=id;choices.hidden=true;controls.hidden=false;
    controls.replaceChildren();
    const title=document.createElement('strong');title.textContent=groups[id].title;controls.append(title);
    for(const [label,value] of [['Left','left'],['Centre','center'],['Right','right']]){
      const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-pressed',String(draft.align[id]===value));button.onclick=()=>{draft.align[id]=value;persist();repaint();pick(id)};controls.append(button);
    }
    palette.hidden=false;
  }
  function variants(id){
    pick(id);choices.hidden=false;choices.replaceChildren();
    const hint=document.createElement('strong');hint.textContent='Swipe to choose · '+groups[id].title;choices.append(hint);
    const row=document.createElement('div');row.className='phone-design-row';
    for(let n=1;n<=10;n++){
      const b=document.createElement('button');b.textContent=String(n);b.setAttribute('aria-label',groups[id].title+' option '+n);b.setAttribute('aria-pressed',String(draft[id]===n));
      b.onclick=()=>{draft[id]=n;persist();repaint();variants(id)};row.append(b);
    }choices.append(row);
  }
  for(const colour of colours){
    const button=document.createElement('button');button.style.background=colour;button.title=colour;button.setAttribute('aria-label','Colour '+colour);
    button.onclick=()=>{draft.colours[target]=colour;persist();repaint()};palette.append(button);
  }
  frame.onload=()=>{
    const doc=frame.contentDocument,listen=()=>{if(!doc.querySelector('.courier-stand')||!frame.contentWindow.designSurface)return setTimeout(listen,100);frame.contentWindow.designSurface.configure({editing:false,selected:'',layout:{styles:{}},textScale:1});repaint();};
    listen();
    doc.addEventListener('pointerdown',e=>{
      const found=e.target.closest('.mail-sign,.courier-stand,#home-wheel .wheel-paper');if(!found)return;
      const id=found.matches('.mail-sign')?'sign':found.matches('.courier-stand')?'header':'carousel';start={id,x:e.clientX,y:e.clientY};held=false;
      timer=setTimeout(()=>{held=true;variants(id)},500);
    },true);
    doc.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>12){clearTimeout(timer);start=null}},true);
    doc.addEventListener('pointerup',()=>{clearTimeout(timer);if(start&&!held)pick(start.id);start=null},true);
    doc.addEventListener('click',e=>{if(e.target.closest('.mail-sign,.courier-stand,#home-wheel .wheel-paper')){e.preventDefault();e.stopImmediatePropagation()}},true);
    doc.addEventListener('contextmenu',e=>e.preventDefault(),true);
  };
  layer.querySelector('[data-export]').onclick=()=>{
    const payload=JSON.stringify({format:'pigeon-post.phone-home-design',version:1,screen:'home',appVersion:'0.1.10',exportedAt:new Date().toISOString(),draft},null,2);
    if(window.Pigeon?.shareDesign)Pigeon.shareDesign(payload);
    else navigator.clipboard?.writeText(payload);
  };
  closeStudio=()=>{layer.remove();closeStudio=()=>false;return true};
  layer.querySelector('[data-close]').onclick=closeStudio;
}
