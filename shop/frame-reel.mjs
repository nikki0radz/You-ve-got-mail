// Native scroll snap provides touch and trackpad browsing. Duplicate end cards
// let a swipe continue from the last design to the first one and vice versa.
export function mountFrameReel(root,items,first,preview,onSelect,onUse) {
  const rail=root.querySelector('.frame-rail'),thumbs=root.querySelector('.frame-thumbs');
  const use=root.querySelector('.frame-use'),name=root.querySelector('.frame-name'),count=root.querySelector('.frame-count');
  const cards=[],icons=[];
  const last=items.length-1;
  const slots=[last,...items.keys(),0];
  let selected=-1,painted=[],timer,frame=0,step=0;

  function move(slot){
    rail.scrollTo({left:slot*step,behavior:'instant'});
    paint();
  }
  function add(parent,i,slot){
    const button=document.createElement('button');
    button.type='button';button.tabIndex=-1;
    if(parent===thumbs)button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label','Show '+items[i].name);
    button.innerHTML=preview(items[i]);
    button.onclick=()=>move(slot);
    parent.append(button);
    return button;
  }
  for(const [slot,i] of slots.entries())cards.push(add(rail,i,slot));
  for(const i of items.keys())icons.push(add(thumbs,i,i+1));
  cards[0].setAttribute('aria-hidden','true');
  cards.at(-1).setAttribute('aria-hidden','true');

  function revealIcon(){
    const thumb=icons[selected].getBoundingClientRect(),box=thumbs.getBoundingClientRect();
    if(thumb.left<box.left+2)thumbs.scrollLeft+=thumb.left-box.left-2;
    else if(thumb.right>box.right-2)thumbs.scrollLeft+=thumb.right-box.right+2;
  }
  function paint(){
    frame=0;
    if(!step)return;
    const pos=Math.max(0,Math.min(slots.length-1,rail.scrollLeft/step));
    const nearest=Math.round(pos),i=slots[nearest];
    const visible=[nearest-1,nearest,nearest+1].filter(n=>n>=0&&n<cards.length);
    for(const n of painted)if(!visible.includes(n))cards[n].removeAttribute('style');
    for(const n of visible){
      const distance=Math.min(1,Math.abs(pos-n));
      cards[n].style.setProperty('--size',String(.98-.36*distance));
      cards[n].style.setProperty('--alpha',String(1-.52*distance));
      cards[n].style.zIndex=String(Math.round(100*(1-distance)));
    }
    painted=visible;
    if(i===selected)return;
    if(selected>=0){icons[selected].setAttribute('aria-pressed','false');icons[selected].tabIndex=-1;}
    selected=i;
    icons[i].setAttribute('aria-pressed','true');icons[i].tabIndex=0;
    name.textContent=items[i].name;count.textContent=(i+1)+' / '+items.length;use.textContent='Use '+items[i].name+'　›';
    revealIcon();onSelect(items[i]);
  }
  rail.onscroll=()=>{
    if(!frame)frame=requestAnimationFrame(paint);
    clearTimeout(timer);
    timer=setTimeout(()=>{
      if(!step)return;
      const slot=Math.round(rail.scrollLeft/step);
      if(slot===0)move(items.length);
      else if(slot===items.length+1)move(1);
    },160);
  };
  function arrows(e){
    let i;
    if(e.key==='Home')i=0;
    else if(e.key==='End')i=last;
    else if(e.key==='ArrowLeft')i=(selected+last)%items.length;
    else if(e.key==='ArrowRight')i=(selected+1)%items.length;
    else return;
    e.preventDefault();move(i+1);
    if(e.currentTarget===thumbs)icons[i].focus({preventScroll:true});
  }
  rail.tabIndex=0;rail.onkeydown=thumbs.onkeydown=arrows;
  use.onclick=()=>{paint();onUse(items[selected]);};
  function measure(){
    step=cards[1].getBoundingClientRect().left-cards[0].getBoundingClientRect().left;
    move((selected<0?first:selected)+1);if(selected>=0)revealIcon();
  }
  const resize=new ResizeObserver(measure);
  resize.observe(rail);measure();
  return ()=>{resize.disconnect();clearTimeout(timer);cancelAnimationFrame(frame);};
}
