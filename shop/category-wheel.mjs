import {collectionName} from '../domain.mjs';
import {guestSelection} from './guest-selection.mjs';

const captions={Notes:'Your words on a little slip of paper.',Photos:'Your photo in a frame.',Flowers:'A bouquet for their screen.',Postcards:'A photo and a few words.',Stickers:'Let a pigeon do the talking.',Reminders:'Send a little nudge for later.','Love notes':'Something sweet, already written.'};
const categories=Object.keys(guestSelection);

export function mountCategoryWheel(root,{initialCategory='Photos',onBack,onBrowse}){
  let position=Math.max(0,categories.indexOf(initialCategory));
  root.innerHTML='<button type="button" class="wheel-back">‹ Back</button><section class="wheel"><h2>Pick your post</h2><p>Swipe to browse, then tap the big circle.</p><div class="wheel-paper"><small></small><h3 aria-live="polite"></h3><div class="wheel-orbs"><button type="button"></button><button type="button"></button><button type="button"></button></div><p class="caption"></p><button type="button" class="browse"></button></div></section>';
  root.querySelector('.wheel-back').onclick=onBack;
  const stage=root.querySelector('.wheel-paper'),orbs=[...stage.querySelectorAll('.wheel-orbs button')];
  const offset=n=>(position+n+categories.length)%categories.length;
  function move(n){position=offset(n);paint();}
  const browse=()=>onBrowse(categories[position]);
  function paint(){
    const category=categories[position],label=collectionName(category);
    stage.querySelector('small').textContent=(position+1)+' / '+categories.length;
    stage.querySelector('h3').textContent=label;
    stage.querySelector('.caption').textContent=captions[category];
    stage.querySelector('.browse').textContent='Browse '+label.toLowerCase();
    orbs.forEach((button,i)=>{
      const key=categories[offset(i-1)],id=String(guestSelection[key][0][0]).padStart(3,'0');
      const img=new Image();img.alt='';img.draggable=false;
      img.src=key==='Photos'||key==='Postcards'?'assets/guest/wheel-'+id+'.webp':'assets/guest/'+id+'.svg';
      button.setAttribute('aria-label',(i===1?'Browse ':'Show ')+collectionName(key).toLowerCase());
      button.replaceChildren(img);
    });
  }
  let start=null,suppressUntil=0;
  stage.onpointerdown=e=>{start=[e.clientX,e.clientY];};
  stage.onpointercancel=()=>{start=null;};
  stage.onpointerup=e=>{
    if(!start)return;
    const dx=e.clientX-start[0],dy=e.clientY-start[1];start=null;
    if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy)){suppressUntil=Date.now()+350;move(dx<0?1:-1);}
  };
  stage.addEventListener('click',e=>{if(Date.now()<suppressUntil)e.stopImmediatePropagation();},true);
  orbs.forEach((button,i)=>button.onclick=()=>i===1?browse():move(i-1));
  stage.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}};
  stage.querySelector('.browse').onclick=browse;paint();
}
