import {scaled} from '../shop/transport-image.mjs';
import {mountCategoryWheel} from '../shop/category-wheel.mjs';
import {openShop} from '../shop/shop.mjs';
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
function invitation(){
  steps.innerHTML='<section class="invitation"><img class="courier" src="assets/home/mascot.webp?v=satchel" alt="Pigeon with a messenger bag on a green letterbox"><p class="eyebrow">A PIGEON FROM NICOLE</p><h1>Got a minute for<br>Nicole?</h1><p id="brief">She sent you a one-time link. Pick a little something and this pigeon will drop it onto her phone.</p><button class="accept" id="accept">Alright, pigeon. I’m in.</button><button class="quiet" id="decline">Tell her I’m out.</button></section>';
  status.textContent='';
  steps.querySelector('#accept').onclick=choose;
  steps.querySelector('#decline').onclick=()=>{
    steps.innerHTML='<h2>The pigeon will be discreet.</h2><p>You can close this page and return later. Your invitation is still unused.</p><button id="back">Back to invitation</button>';
    steps.querySelector('#back').onclick=invitation;
  };
}
let lastCategory='Photos';
function choose(){
  status.textContent='';
  mountCategoryWheel(steps,{initialCategory:lastCategory,onBack:invitation,onBrowse:category=>{
    lastCategory=category;
    openShop(async(image,name,group,reopen)=>{
      draft={sender:draft?.sender||'',time:draft?.time||'',later:draft?.later??false,image:await scaled(image),kind:kinds[group],reopen};
      review();
    },category,true);
  }});
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
  steps.innerHTML='<section class="flight dispatch-envelope"><small>PIGEON POST · DISPATCH DESK</small><div class="dispatch-seal"><img src="assets/home/mascot.webp" alt="Pigeon with its satchel"></div><h2>Preparing your delivery</h2><p></p><div class="airmail-route" aria-hidden="true"><span>POST OFFICE</span><i></i><span>NICOLE</span></div></section>';
  steps.querySelector('.flight p').textContent=draft.later?'Tucking your parcel away for its scheduled delivery.':'One little parcel, addressed to Nicole.';
  status.textContent=preview?'Preview only · No mail will be sent.':'';

}
function openReceipt(key){
  history.replaceState(null,'','#reply-'+key);
  showReceipt(key);
}
function review(){
  steps.innerHTML='<h2>Your delivery to Nicole</h2><div class="final-proof"><img alt="Your finished parcel"></div><label class="sender-label">What’s your name?<input id="sender" maxlength="64" autocomplete="given-name" placeholder="Name for Nicole’s notification"></label><fieldset class="dispatch-timing"><legend>When should it arrive?</legend><div class="dispatch-dock"><button type="button" id="now">Send now</button><button type="button" id="later">Schedule for later</button></div></fieldset><label id="when-label" hidden>Date and time<input id="when" type="datetime-local"><small></small></label><div class="dispatch-dock dispatch-actions"><button id="send"></button></div><button class="edit-parcel" id="back"><span aria-hidden="true">✎</span> Edit parcel</button>';
  const sender=steps.querySelector('#sender'),whenField=steps.querySelector('#when'),send=steps.querySelector('#send');
  sender.value=draft.sender||'';whenField.value=draft.time||'';const now=steps.querySelector('#now'),later=steps.querySelector('#later'),dateLabel=steps.querySelector('#when-label');
  dateLabel.querySelector('small').textContent='Your local time · '+Intl.DateTimeFormat().resolvedOptions().timeZone+' · within 30 days';
  function mode(scheduled){
    draft.later=scheduled;dateLabel.hidden=!scheduled;whenField.required=scheduled;
    now.setAttribute('aria-pressed',String(!scheduled));later.setAttribute('aria-pressed',String(scheduled));
    send.textContent=scheduled?(preview?'Preview schedule':'Schedule delivery'):(preview?'Preview delivery':'Send to Nicole');
    status.textContent=preview?'Preview only. No mail will be sent.':'';
  }
  now.onclick=()=>mode(false);later.onclick=()=>mode(true);mode(draft.later??Boolean(draft.time));
  steps.querySelector('img').src=draft.image;steps.querySelector('#back').onclick=()=>{draft.sender=sender.value;draft.time=whenField.value;draft.reopen();};
  send.onclick=async()=>{
    const name=sender.value.trim(),value=draft.later?whenField.value:'',when=value?new Date(value).getTime():Date.now();
    if(!preview&&!name){status.textContent='Add your name first.';sender.focus();return;}
    if(draft.later&&!value){status.textContent='Choose a delivery date and time.';whenField.focus();return;}
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
  const paths={
    waiting:'<path d="M5 4h14v16H5z M8 8l4 3 4-3"/>',
    scheduled:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    locked_notification:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    screen:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M9 6h6v9H9z M11 18h2"/>',
    notification:'<path d="M4 17h16l-2-3V9a6 6 0 00-12 0v5z M10 20h4"/>',
    inbox:'<path d="M3 14l3-9h12l3 9v5H3z M3 14h5l2 2h4l2-2h5"/>',
    rejected:'<circle cx="12" cy="12" r="9"/><path d="M8 8l8 8"/>'
  };
  steps.innerHTML='<article class="delivery-receipt"><small class="receipt-label">DELIVERY STATUS</small><div class="receipt-sign" aria-hidden="true"></div><h2 data-heading></h2><p data-detail></p><p class="reply" aria-live="polite"></p><button id="check">Refresh status</button><div class="receipt-faq"><details><summary>Where did my parcel go?</summary><p data-where></p></details><details><summary>How do I see a reply?</summary><p>If Nicole replies, it appears here. Reopen this link any time.</p></details><details><summary>Can I send another?</summary><p>Ask Nicole for a fresh link or <a href="https://pigeon-post-delivery.nikki0radz.chatgpt.site/downloads/Youve-Got-Mail-0.1.6.apk">download the Android test app</a>. Thanks for testing Pigeon Post.</p></details></div></article>';
  const heading=steps.querySelector('[data-heading]'),detail=steps.querySelector('[data-detail]'),sign=steps.querySelector('.receipt-sign'),where=steps.querySelector('[data-where]'),reply=steps.querySelector('.reply'),check=steps.querySelector('#check');
  function display(result){
    confirmed=result.status==='acknowledged';
    const scheduled=Number(result.when)>Date.now(),time=scheduled?new Date(result.when).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'';
    const states={
      waiting:['Waiting for Nicole’s phone',scheduled?'Requested delivery: '+time+'.':'Your parcel is at the post office.','The phone hasn’t collected it yet. It may be off, offline or between mailbox checks.'],
      scheduled:['Scheduled for later',time,'Nicole’s phone has saved the parcel for the time you chose.'],
      accepted:['Received by the app','Nicole’s app has saved your parcel.','The app has confirmed receipt. It hasn’t reported where the parcel appeared.'],
      locked_notification:['Phone was locked','A notification was posted for Nicole.','Android received the notification while the phone was locked. Nicole’s settings control what appears on the lock screen.'],
      screen:['Shown on screen','The parcel opened on Nicole’s unlocked screen.','The app displayed the pop-up. Only Nicole can tell you whether she saw it.'],
      notification:['Sent to notifications','Nicole can tap the notification to open it.','Android received a regular notification. The parcel is also in the app inbox.'],
      inbox:['In the app inbox','Nicole can open the parcel in You’ve Got Mail.','The app saved the parcel without posting a notification or displaying a pop-up.'],
      rejected:['Pop-up declined','The parcel stayed in Nicole’s inbox.','The incoming warning was dismissed before the parcel appeared.']
    };
    const state=Object.hasOwn(paths,result.outcome)?result.outcome:!confirmed?'waiting':scheduled?'scheduled':'accepted';
    const [title,summary,answer]=states[state];heading.textContent=title;detail.textContent=summary;where.textContent=answer;
    sign.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[state]||paths.inbox)+'</svg>';
  }
  if(!key){display({});heading.textContent='Delivery preview';detail.textContent=draft?.later&&draft.time?'Scheduled preview · '+new Date(draft.time).toLocaleString():'Immediate delivery preview';where.textContent='This preview stays in your browser. Use a one-time link to deliver a parcel.';check.textContent='Back to designs';check.onclick=choose;status.textContent='';return;}
  heading.textContent='Checking delivery…';status.textContent='';
  async function refresh(manual=false){
    if(checking||!check.isConnected)return;checking=true;check.disabled=true;clearTimeout(pollTimer);
    let expired=false,hasReply=false;
    try{
      const result=await api('receipt',key);
      if(!check.isConnected)return;
      display(result);
      hasReply=Boolean(result.reply||result.replyImage);reply.textContent=result.reply?'Nicole replied: '+result.reply:'';
      if(typeof result.replyImage==='string'&&result.replyImage.startsWith('data:image/png;base64,')){
        const image=new Image();image.src=result.replyImage;image.alt='Sticker reply from Nicole';image.style.cssText='width:100%;max-width:220px;height:auto;max-height:320px;object-fit:contain';reply.append(image);
      }
      status.textContent=manual?'Receipt checked just now.':'';
    }catch(e){
      expired=e.status===404;
      if(expired){sign.replaceChildren();heading.textContent='Receipt unavailable';detail.textContent='This receipt may have expired. Ask Nicole for a fresh invitation.';}
      status.textContent=expired?'':'Couldn’t refresh the receipt. Try again when you’re connected.';
    }finally{
      checking=false;check.disabled=expired;
      if(!expired&&check.isConnected)pollTimer=setTimeout(()=>{if(!document.hidden)refresh();else pollTimer=setTimeout(()=>refresh(),30000);},confirmed?30000:7000);
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
