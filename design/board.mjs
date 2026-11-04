import {pages} from './pages.mjs';
import {rounds} from './rounds.mjs';
import {phoneProfile,phoneSize,frameURL} from './phone.mjs';
const $=id=>document.getElementById(id),size=phoneSize(phoneProfile()),scale=Math.min(160/size.width,330/size.height);
$('device').textContent=(size.measured?'My phone':'Reference phone')+' · '+size.width+' × '+size.height;
const live=new Map();
const watch=new IntersectionObserver(entries=>{for(const e of entries){
  const box=e.target,id=box.dataset.screen;
  if(!box.isConnected)continue;
  if(!e.isIntersecting){live.get(id)?.remove();live.delete(id);continue;}
  if(live.has(id))continue;
  const f=document.createElement('iframe');f.title=pages[id][0]+' miniature';f.tabIndex=-1;f.setAttribute('aria-hidden','true');
  Object.assign(f.style,{width:size.width+'px',height:size.height+'px',top:Math.max(0,(size.insets?.top||0)*scale)+'px',transform:'scale('+scale+')'});
  f.src=frameURL(id);live.set(id,f);box.append(f);
}},{rootMargin:'30px'});
function draw(){
  watch.disconnect();live.clear();const cards=$('cards');cards.replaceChildren();
  const filter=$('filter').value,query=$('find').value.trim().toLowerCase();
  for(const [id,[name,group]] of Object.entries(pages)){
    const picker=/picker|gallery|wheel|choose pigeon|fit photo|colour|calendar/i.test(name);
    if(!name.toLowerCase().includes(query)||(filter==='Pickers'?!picker:filter==='Review options'?!rounds[id]:filter!=='All screens'&&filter!==group))continue;
    const a=document.createElement('a');a.href='index.html?page='+encodeURIComponent(id);a.className='card';
    const small=document.createElement('small');small.textContent=rounds[id]?group+' · '+rounds[id].options.length+' options':group;
    const title=document.createElement('strong');title.textContent=name;
    const box=document.createElement('div');box.className='mini';box.dataset.screen=id;
    box.style.width=size.width*scale+'px';box.style.height=(size.height+(size.insets?.top||0)+(size.insets?.bottom||0))*scale+'px';
    a.append(small,title,box);cards.append(a);watch.observe(box);
  }
  $('count').textContent=cards.children.length+' screens';if(!cards.children.length)cards.textContent='No matching screens.';
}
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.data?.app!=='pigeon-studio'||e.data.type!=='ready')return;
  for(const [id,f] of live){if(f.contentWindow!==e.source)continue;
    let draft=null;try{draft=JSON.parse(localStorage.getItem('pigeon.design.workroom.cache.v1'+(id==='postcard-composer'?'':'.'+id)))}catch{}
    f.contentWindow.designSurface?.configure({layout:draft?.working||{styles:{},copies:[]},editing:false,selected:'',textScale:(size.textZoom||100)/100});break;
  }
});
$('find').oninput=$('filter').onchange=draw;draw();
