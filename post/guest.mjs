import {collectionName} from '../domain.mjs';
import {openShop} from '../shop/shop.mjs';
import {guestSelection} from '../shop/guest-selection.mjs';
const preview=!location.hash && new URLSearchParams(location.search).get('preview')==='1';
const base='https://pigeon-post-delivery.nikki0radz.chatgpt.site/api/';
const token=location.hash.slice(1);
const steps=document.getElementById('steps'),status=document.getElementById('status');
const kinds={Photos:'a framed photo',Stickers:'a sticker','Love notes':'a love note',Flowers:'flowers',Postcards:'a postcard',Notes:'a note'};
let draft;
async function api(path,key,body){
  const resp=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await resp.json();if(!resp.ok)throw new Error(data.error||'Could not reach the post office.');return data;
}
async function scaled(data){
  if(data.length<=1800000)return data;
  const img=new Image();img.src=data;await img.decode();
  // Preserve the portrait dimensions first. Reduce photo colour precision before resizing.
  const quant=document.createElement('canvas');quant.width=img.width;quant.height=img.height;
  const ctx=quant.getContext('2d');ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData(0,0,quant.width,quant.height);
  for(const bits of [3,4]){
    const mask=255<<bits;
    for(let i=0;i<pixels.data.length;i+=4){
      if(!pixels.data[i+3])continue;
      for(let k=i;k<i+3;k++)pixels.data[k]=Math.round((pixels.data[k]&mask)*255/(255&mask));
    }
    ctx.putImageData(pixels,0,0);const candidate=quant.toDataURL('image/png');if(candidate.length<=1800000)return candidate;
  }
  let width=img.width;
  while(data.length>1800000&&width>150){
    width=Math.round(width*.8);const c=document.createElement('canvas');c.width=width;c.height=Math.round(img.height*width/img.width);c.getContext('2d').drawImage(img,0,0,c.width,c.height);data=c.toDataURL('image/png');
  }
  return data;
}
function invitation(){
  steps.innerHTML='<section class="invitation"><img class="courier" src="assets/home/mascot.webp?v=satchel" alt="Pigeon with a messenger bag on a green letterbox"><p class="eyebrow">A PIGEON FROM NICOLE</p><h1>Got a minute for<br>Nicole?</h1><p id="brief">She sent you a one-time link. Pick a little something and this pigeon will drop it onto her phone.</p><button class="accept" id="accept">Alright, pigeon. I’m in.</button><button class="quiet" id="decline">Tell her I’m out.</button></section>';
  status.textContent='';
  steps.querySelector('#accept').onclick=choose;
  steps.querySelector('#decline').onclick=()=>{
    steps.innerHTML='<h2>The pigeon will be discreet.</h2><p>You can close this page and return later. Your invitation is still unused.</p><button id="back">Back to invitation</button>';
    steps.querySelector('#back').onclick=invitation;
  };
}
const categories=Object.keys(guestSelection);
const captions={Notes:'Your words on a little slip of paper.',Photos:'Your photo in a frame.',Flowers:'A bouquet for her screen.',Postcards:'A photo and a few words.',Stickers:'Let a pigeon do the talking.','Love notes':'Something sweet, already written.'};
let position=categories.indexOf('Photos');
function choose(){
  steps.innerHTML='<button class="wheel-back">‹ Back</button><section class="wheel"><h2>Pick your post</h2><p>Swipe to browse, then tap the big circle.</p><div class="wheel-paper"><small></small><h3 aria-live="polite"></h3><div class="wheel-orbs"><button></button><button></button><button></button></div><p class="caption"></p><button class="browse"></button></div></section>';
  status.textContent='';
  steps.querySelector('.wheel-back').onclick=invitation;
  const stage=steps.querySelector('.wheel-paper'),orbs=[...stage.querySelectorAll('.wheel-orbs button')];
  function offset(n){return (position+n+categories.length)%categories.length;}
  function move(n){position=offset(n);paint();}
  function browse(){openShop(async(image,name,group)=>{draft={image:await scaled(image),kind:kinds[group]};review();},categories[position],true);}
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
  stage.onpointerup=e=>{if(!start)return;const dx=e.clientX-start[0],dy=e.clientY-start[1];start=null;if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy)){suppressUntil=Date.now()+350;move(dx<0?1:-1);}};
  stage.addEventListener('click',e=>{if(Date.now()<suppressUntil)e.stopImmediatePropagation();},true);
  orbs.forEach((button,i)=>button.onclick=()=>i===1?browse():move(i-1));
  stage.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}};
  stage.querySelector('.browse').onclick=browse;paint();
}
function review(){
  status.textContent='Your phone’s local time is used for scheduling.';
  steps.innerHTML='<img class="proof" alt="Your parcel"><label>Your name<input id="sender" maxlength="64" autocomplete="given-name" placeholder="What should the notification say?"></label><label>Delivery time (leave blank for now)<input id="when" type="datetime-local"></label><button id="back">Choose again</button><button id="send">Send parcel</button>';
  steps.querySelector('img').src=draft.image;steps.querySelector('#back').onclick=choose;
  if(preview){const send=steps.querySelector('#send');send.disabled=true;send.textContent='Preview only';status.textContent='Sending is available with a one-time invitation.';return;}
  steps.querySelector('#send').onclick=async e=>{
    const sender=steps.querySelector('#sender').value.trim(),value=steps.querySelector('#when').value,when=value?new Date(value).getTime():Date.now();
    if(!sender){status.textContent='Add your name first.';return;}
    if(value&&(!Number.isFinite(when)||when<=Date.now()||when>Date.now()+30*86400000)){status.textContent='Choose a future time within 30 days.';return;}
    e.target.disabled=true;steps.querySelector('#back').disabled=true;status.textContent='Sending…';
    try{const {receipt}=await api('send',token,{...draft,sender,when});history.replaceState(null,'','#reply-'+receipt);showReceipt(receipt);}
    catch(err){status.textContent=err.message;e.target.disabled=false;steps.querySelector('#back').disabled=false;}
  };
}
function showReceipt(key){
  steps.innerHTML='<h2>Your parcel was sent.</h2><p>Keep this page to check for a reply.</p><button>Check for reply</button>';
  const check=async()=>{try{const r=await api('receipt',key);status.textContent=r.reply?'Reply: '+r.reply:'No reply yet.';}catch(err){status.textContent=err.message;}};
  steps.querySelector('button').onclick=check;check();
}
if(preview)invitation();
else if(/^reply-[a-f0-9]{64}$/.test(token))showReceipt(token.slice(6));
else if(/^[a-f0-9]{64}$/.test(token)){try{await api('link',token);invitation();}catch(e){status.textContent=e.message;}}
else status.textContent='Open the full invitation link your friend shared with you.';
