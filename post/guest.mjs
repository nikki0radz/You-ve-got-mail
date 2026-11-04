import {collectionName} from '../domain.mjs';
import {openShop} from '../shop/shop.mjs';
import {guestSelection} from '../shop/guest-selection.mjs';
const preview=!location.hash && new URLSearchParams(location.search).get('preview')==='1';
const base='https://pigeon-post-delivery.nikki0radz.chatgpt.site/api/';
const token=location.hash.slice(1);
const steps=document.getElementById('steps'),status=document.getElementById('status');
const kinds={Photos:'a framed photo',Stickers:'a sticker',Reminders:'a reminder','Love notes':'a love note',Flowers:'flowers',Postcards:'a postcard',Notes:'a note'};
let draft;
async function api(path,key,body){
  const resp=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await resp.json();if(!resp.ok){const error=new Error(data.error||'Could not reach the post office.');error.status=resp.status;throw error;}return data;
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
const captions={Notes:'Your words on a little slip of paper.',Photos:'Your photo in a frame.',Flowers:'A bouquet for her screen.',Postcards:'A photo and a few words.',Stickers:'Let a pigeon do the talking.',Reminders:'Send a little nudge for later.','Love notes':'Something sweet, already written.'};
let position=categories.indexOf('Photos');
function choose(){
  steps.innerHTML='<button class="wheel-back">‹ Back</button><section class="wheel"><h2>Pick your post</h2><p>Swipe to browse, then tap the big circle.</p><div class="wheel-paper"><small></small><h3 aria-live="polite"></h3><div class="wheel-orbs"><button></button><button></button><button></button></div><p class="caption"></p><button class="browse"></button></div></section>';
  status.textContent='';
  steps.querySelector('.wheel-back').onclick=invitation;
  const stage=steps.querySelector('.wheel-paper'),orbs=[...stage.querySelectorAll('.wheel-orbs button')];
  function offset(n){return (position+n+categories.length)%categories.length;}
  function move(n){position=offset(n);paint();}
  function browse(){openShop(async(image,name,group,reopen)=>{draft={sender:draft?.sender||'',time:draft?.time||'',image:await scaled(image),kind:kinds[group],reopen};review();},categories[position],true);}
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
let preparedKey='', pollTimer;
const storageKey='pigeon-receipt:'+token;
function rememberKey(){
  if(!preparedKey){
    try{preparedKey=localStorage.getItem(storageKey)||'';}catch{}
    if(!/^[0-9a-f]{64}$/.test(preparedKey)){
      preparedKey=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
      try{localStorage.setItem(storageKey,preparedKey);}catch{}
    }
  }return preparedKey;
}
function loading(){
  steps.innerHTML='<section class="flight"><img src="assets/home/mascot.webp" alt=""><h2>One moment. Tiny satchel.</h2><p>Your pigeon is getting the parcel ready for its flight to Nicole’s phone.</p></section>';
  status.textContent=preview?'Preview flight · No parcel will be sent.':'Preparing your delivery…';
}
function openReceipt(key){
  history.replaceState(null,'','#reply-'+key);
  showReceipt(key);
}
function review(){
  steps.innerHTML='<h2>Ready for take-off?</h2><div class="final-proof"><img alt="Your finished parcel"></div><label>Your name<input id="sender" maxlength="64" autocomplete="given-name" placeholder="Name for Nicole’s notification"></label><label>Delivery time (leave blank for now)<input id="when" type="datetime-local"></label><button class="quiet" id="back">‹ Edit parcel</button><button class="accept" id="send"></button>';
  const sender=steps.querySelector('#sender'),whenField=steps.querySelector('#when'),send=steps.querySelector('#send');
  sender.value=draft.sender||'';whenField.value=draft.time||'';send.textContent=preview?'Try the pigeon’s flight':'Hand it to the pigeon';
  status.textContent=preview?'Preview only. No mail will be sent.':'Delivery times use your local time.';
  steps.querySelector('img').src=draft.image;steps.querySelector('#back').onclick=()=>{draft.sender=sender.value;draft.time=whenField.value;draft.reopen();};
  send.onclick=async()=>{
    const name=sender.value.trim(),value=whenField.value,when=value?new Date(value).getTime():Date.now();
    if(!preview&&!name){status.textContent='Add your name first.';sender.focus();return;}
    if(value&&(!Number.isFinite(when)||when<=Date.now()||when>Date.now()+30*86400000)){status.textContent='Choose a future time within 30 days.';return;}
    draft.sender=name;draft.time=value;loading();
    const wait=new Promise(resolve=>setTimeout(resolve,5000));
    if(preview){await wait;showReceipt(null);return;}
    const key=rememberKey();
    try{
      const {receipt}=await api('send',token,{image:draft.image,kind:draft.kind,sender:name,when,receiptSecret:key});
      // Save the real receipt URL immediately, even if the page closes during the animation.
      history.replaceState(null,'','#reply-'+receipt);
      await wait;showReceipt(receipt);
    }catch(err){
      await wait;
      try{await api('receipt',key);openReceipt(key);return;}catch{}
      review();
      status.textContent=err.status&&err.status<500?err.message:'We couldn’t check whether the post office got your parcel. Reconnect and try again. Retrying won’t send a second copy.';
    }
  };
}
function showReceipt(key){
  clearTimeout(pollTimer);let checking=false,confirmed=false;
  steps.innerHTML='<article class="delivery-receipt"><img src="assets/home/mascot.webp" alt=""><div class="ticks" aria-hidden="true"></div><h2 data-heading></h2><p data-detail></p><p class="reply" aria-live="polite"></p><button id="check">Check for a reply</button><p class="smallprint">This link is good for one delivery. To send another, ask Nicole for a fresh link or <a download="Youve-Got-Mail-0.1.2.apk" href="https://pigeon-post-delivery.nikki0radz.chatgpt.site/downloads/Youve-Got-Mail-0.1.2.apk">download the Android test app</a>.</p><p class="smallprint">You’ve Got Mail is still in development. Thanks for taking our pigeon for a test flight.</p></article>';
  const heading=steps.querySelector('[data-heading]'),detail=steps.querySelector('[data-detail]'),ticks=steps.querySelector('.ticks'),reply=steps.querySelector('.reply'),check=steps.querySelector('#check');
  function display(ack){
    confirmed=ack;ticks.textContent=ack?'✓✓':'✓';
    heading.textContent=ack?'Special delivery. It’s on her phone!':'In the pigeon’s postbag.';
    detail.textContent=ack?'Nicole’s phone has received your parcel. It can pop up when her settings and delivery time allow. She can reply if she likes. Any reply will appear here.':'The post office has your parcel. We’re waiting for Nicole’s phone to collect it. You can come back to this receipt to check.';
  }
  if(!key){heading.textContent='Flight preview complete';detail.textContent='No parcel was sent. On a real receipt, one tick means queued and two mean Nicole’s phone has received it.';check.textContent='Back to the preview';check.onclick=choose;status.textContent='';return;}
  heading.textContent='Checking the pigeon’s route…';status.textContent='';
  async function refresh(manual=false){
    if(checking||!check.isConnected)return;checking=true;check.disabled=true;clearTimeout(pollTimer);
    let expired=false,hasReply=false;
    try{
      const result=await api('receipt',key);
      if(!check.isConnected)return;
      display(result.status==='acknowledged');
      hasReply=Boolean(result.reply);reply.textContent=hasReply?'Nicole replied: '+result.reply:confirmed?'No reply yet. Check back here whenever you like.':'';
      status.textContent=manual?'Receipt checked just now.':'';
    }catch(e){
      expired=e.status===404;
      if(expired){ticks.textContent='';heading.textContent='Receipt unavailable';detail.textContent='This receipt may have expired. Ask Nicole for a fresh invitation.';}
      status.textContent=expired?'':'Couldn’t refresh the receipt. Try again when you’re connected.';
    }finally{
      checking=false;check.disabled=expired;
      if(!expired&&!hasReply&&check.isConnected)pollTimer=setTimeout(()=>{if(!document.hidden)refresh();else pollTimer=setTimeout(()=>refresh(),30000);},confirmed?30000:7000);
    }
  }
  check.onclick=()=>refresh(true);refresh();
}
async function start(){
  if(preview){invitation();return;}
  if(/^reply-[a-f0-9]{64}$/.test(token)){showReceipt(token.slice(6));return;}
  if(!/^[a-f0-9]{64}$/.test(token)){status.textContent='Open the full invitation link your friend shared with you.';return;}
  try{
    await api('link',token);invitation();
  }catch(e){
    if(e.status===410){
      let remembered;try{remembered=localStorage.getItem(storageKey);}catch{}
      if(remembered){try{await api('receipt',remembered);openReceipt(remembered);return;}catch{}}
    }
    status.textContent=e.message;
  }
}
start();
