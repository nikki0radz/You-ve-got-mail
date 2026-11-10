import {shopCategoryName} from './shared-designs.mjs';
import {wheelChoices,mountCatalogueThumbnail} from './catalogue.mjs';

// Detached cached pages and background tabs can lose their horizontal scroll offset.
export function restoreCategoryWheel(root){root?.querySelector('.category-reel')?.restoreCategoryWheel?.();}
function restoreVisibleWheels(){if(!document.hidden)document.querySelectorAll('.category-reel').forEach(rail=>rail.restoreCategoryWheel?.());}
window.addEventListener('resize',restoreVisibleWheels);
window.addEventListener('pageshow',restoreVisibleWheels);
document.addEventListener('visibilitychange',restoreVisibleWheels);

export function mountCategoryWheel(root,{initialCategory='Photos',onBack,onBrowse,designs,onSelect}){
  const choices=wheelChoices(designs),categories=choices.map(item=>item.category);
  const first=Math.max(0,categories.indexOf(initialCategory));
  root.innerHTML='<button type="button" class="wheel-back pocket-back"><span class="back-arrow" aria-hidden="true"></span> Back</button><section class="wheel"><p>Swipe to browse, then tap the big circle.</p><div class="wheel-paper"><small></small><h3 aria-live="polite"></h3><div class="wheel-orbs category-reel" aria-label="Choose a category"></div><p class="wheel-empty" hidden></p></div></section>';
  root.querySelector('.wheel-back').onclick=onBack;
  const rail=root.querySelector('.category-reel'),slots=[categories.at(-1),...categories,categories[0]];
  if(root.id==='home-wheel'){
    const divider=document.createElement('div');divider.setAttribute('role','separator');divider.setAttribute('aria-label','Home divider');
    divider.className='home-divider';divider.dataset.baseLook=divider.dataset.reviewLook='separator-3';
    root.querySelector('.wheel').prepend(divider);
    rail.dataset.baseLook=rail.dataset.reviewLook='wheelrim-1';
  }
  if(!categories.length){
    root.querySelector('.wheel > p').hidden=true;rail.hidden=true;
    const empty=root.querySelector('.wheel-empty');empty.hidden=false;empty.textContent='No artwork is available yet.';return;
  }
  const byCategory=new Map(choices.map(item=>[item.category,item]));
  const cards=slots.map((key,slot)=>{
    const button=document.createElement('button'),face=document.createElement('span');
    button.type='button';button.dataset.category=key;mountCatalogueThumbnail(face,byCategory.get(key));button.append(face);rail.append(button);
    button.onclick=()=>{if(performance.now()<suppressUntil)return;if(Math.abs(position()-slot)<.05)onBrowse(key);else move(slot);};
    return button;
  });
  let selected=first+1,timer,drag=null,suppressUntil=0,restoring=false;
  let painted=-1;
  // Computed layout width retains subpixels and ignores preview/animation transforms.
  const step=()=>parseFloat(getComputedStyle(cards[0]).width)+(parseFloat(getComputedStyle(rail).columnGap)||0);
  const position=()=>step()?rail.scrollLeft/step():first+1;
  function move(slot,instant=false){
    rail.scrollTo({left:slot*step(),behavior:instant||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function paint(){
    const pos=position(),nearest=Math.max(0,Math.min(slots.length-1,Math.round(pos)));
    cards.forEach((card,i)=>{
      const distance=Math.abs(pos-i),d=distance<.01?0:Math.min(1,distance);
      card.style.setProperty('--orb-scale',String(.98-.36*d));card.style.setProperty('--orb-alpha',String(1-.55*d));
      card.style.zIndex=String(Math.round(100*(1-d)));
    });
    selected=nearest;if(nearest===painted)return;
    painted=nearest;const key=slots[selected],label=shopCategoryName(key);
    cards.forEach((card,i)=>{card.tabIndex=i===selected?0:-1;card.setAttribute('aria-current',String(i===selected));card.setAttribute('aria-label',(i===selected?'Browse ':'Show ')+shopCategoryName(slots[i]).toLowerCase());});
    root.querySelector('.wheel-paper small').textContent=(categories.indexOf(key)+1)+' / '+categories.length;
    root.querySelector('.wheel-paper h3').textContent=label;onSelect?.(key);
  }
  rail.onscroll=()=>{if(restoring||document.hidden||!rail.isConnected||!rail.clientWidth)return;paint();clearTimeout(timer);timer=setTimeout(()=>{
    if(drag||!rail.isConnected)return;
    if(selected===0)move(categories.length,true);else if(selected===slots.length-1)move(1,true);
  },180);};
  rail.onkeydown=e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const i=categories.indexOf(slots[selected]);
    const target=e.key==='Home'?0:e.key==='End'?categories.length-1:(i+(e.key==='ArrowLeft'?-1:1)+categories.length)%categories.length;
    move(target+1,true);paint();cards[target+1].focus({preventScroll:true});
  };
  rail.onpointerdown=e=>{if(e.pointerType==='mouse'&&e.button===0)drag={id:e.pointerId,x:e.clientX,start:rail.scrollLeft,moved:false};};
  rail.onpointermove=e=>{
    if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;
    if(!drag.moved&&Math.abs(dx)<5)return;
    if(!drag.moved){rail.setPointerCapture(e.pointerId);rail.style.scrollSnapType='none';drag.moved=true;}
    rail.scrollLeft=drag.start-dx;
  };
  function endDrag(){if(!drag)return;if(drag.moved){const slot=Math.round(position());suppressUntil=performance.now()+350;rail.style.scrollSnapType='';move(slot);}drag=null;}
  rail.onpointerup=rail.onpointercancel=rail.onlostpointercapture=endDrag;
  rail.onpointerleave=()=>{if(drag&&!drag.moved)drag=null;};
  rail.restoreCategoryWheel=()=>{
    clearTimeout(timer);drag=null;rail.style.scrollSnapType='';
    if(!rail.isConnected||!rail.clientWidth)return;
    restoring=true;
    // Keep the chosen category, not an obsolete pixel offset from another layout.
    const target=selected===0?categories.length:selected===slots.length-1?1:selected;
    move(target,true);paint();
    requestAnimationFrame(()=>{if(rail.isConnected&&rail.clientWidth){move(target,true);paint();}restoring=false;});
  };
  rail.restoreCategoryWheel();
}
