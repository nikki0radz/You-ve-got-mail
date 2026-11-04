// Loop the native scroll-snap strip with one duplicate frame at each end.
export function mountFrameReel(root, items, first, onUse) {
  const rail=root.querySelector('.frame-rail'), thumbs=root.querySelector('.frame-thumbs');
  const use=root.querySelector('.frame-use'), name=root.querySelector('.frame-name'), count=root.querySelector('.frame-count');
  let index=first, timer;
  function move(slot,instant=false) {
    const step=rail.children[1].offsetLeft-rail.children[0].offsetLeft;
    rail.scrollTo({left:slot*step,behavior:instant||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function add(parent,item,slot) {
    const button=document.createElement('button'),img=new Image();
    button.type='button';button.setAttribute('aria-label','Show '+item.name);
    img.src=item.master.replace(/(\d+)\.svg$/,'wheel-$1.webp');img.alt='';img.draggable=false;
    button.append(img);parent.append(button);button.onclick=()=>move(slot);
  }
  [items.at(-1),...items,items[0]].forEach((item,i)=>add(rail,item,i));
  items.forEach((item,i)=>add(thumbs,item,i+1));
  function position(){const step=rail.children[1].getBoundingClientRect().left-rail.children[0].getBoundingClientRect().left;return step?rail.scrollLeft/step:index+1;}
  function paint() {
    const pos=position();
    index=(Math.round(pos)-1+items.length)%items.length;
    [...rail.children].forEach((button,i)=>{
      const d=Math.min(1,Math.abs(pos-i));
      button.style.setProperty('--size',String(.98-.36*d));button.style.setProperty('--alpha',String(1-.52*d));
      button.style.zIndex=String(Math.round(100*(1-d)));
    });
    [...thumbs.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    name.textContent=items[index].name;count.textContent=(index+1)+' / '+items.length;use.textContent='Use '+items[index].name+'　›';
  }
  rail.onscroll=()=>{paint();clearTimeout(timer);timer=setTimeout(()=>{
    const slot=Math.round(position());if(slot===0)move(items.length,true);else if(slot===items.length+1)move(1,true);
  },160);};
  rail.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(index+1+(e.key==='ArrowLeft'?-1:1));}};
  use.onclick=()=>onUse(items[index]);
  const resize=new ResizeObserver(()=>{move(index+1,true);paint();});
  resize.observe(rail);move(index+1,true);paint();
  return ()=>{resize.disconnect();clearTimeout(timer);};
}
