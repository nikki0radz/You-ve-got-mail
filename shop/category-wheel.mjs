import {collectionName} from '../domain.mjs';
import {guestSelection,guestMaster} from './guest-selection.mjs?v=complete-stickers';

const captions={Notes:'Your words on a little slip of paper.',Photos:'Your photo in a frame.',Flowers:'A bouquet for their screen.',Postcards:'A photo and a few words.',Stickers:'Let a pigeon do the talking.',Reminders:'Send a little nudge for later.','Love notes':'Something sweet, already written.'};
const categories=Object.keys(guestSelection);

export function mountCategoryWheel(root,{initialCategory='Photos',onBack,onBrowse}){
  const first=Math.max(0,categories.indexOf(initialCategory));
  root.innerHTML='<button type="button" class="wheel-back pocket-back"><span class="back-arrow" aria-hidden="true"></span> Back</button><section class="wheel"><p>Swipe to browse, then tap the big circle.</p><div class="wheel-paper"><small></small><h3 aria-live="polite"></h3><div class="wheel-orbs category-reel" aria-label="Choose a category"></div><p class="caption"></p></div></section>';
  root.querySelector('.wheel-back').onclick=onBack;
  const rail=root.querySelector('.category-reel'),slots=[categories.at(-1),...categories,categories[0]];
  const cards=slots.map((key,slot)=>{
    const button=document.createElement('button'),face=document.createElement('span'),img=new Image();
    button.type='button';img.alt='';img.draggable=false;
    const id=String(guestSelection[key][0][0]).padStart(3,'0');
    img.src=key==='Photos'||key==='Postcards'?'assets/guest/wheel-'+id+'.webp':guestMaster(guestSelection[key][0][0]);
    face.append(img);button.append(face);rail.append(button);
    button.onclick=()=>{if(performance.now()<suppressUntil)return;if(Math.abs(position()-slot)<.05)onBrowse(key);else move(slot);};
    return button;
  });
  let selected=-1,timer,drag=null,suppressUntil=0;
  const step=()=>cards[1].getBoundingClientRect().left-cards[0].getBoundingClientRect().left;
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
    if(nearest===selected)return;
    selected=nearest;const key=slots[selected],label=collectionName(key);
    cards.forEach((card,i)=>{card.tabIndex=i===selected?0:-1;card.setAttribute('aria-current',String(i===selected));card.setAttribute('aria-label',(i===selected?'Browse ':'Show ')+collectionName(slots[i]).toLowerCase());});
    root.querySelector('.wheel-paper small').textContent=(categories.indexOf(key)+1)+' / '+categories.length;
    root.querySelector('.wheel-paper h3').textContent=label;root.querySelector('.caption').textContent=captions[key];
  }
  rail.onscroll=()=>{paint();clearTimeout(timer);timer=setTimeout(()=>{
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
  move(first+1,true);paint();
}
