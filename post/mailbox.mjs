import {unreadCount} from './unread.mjs';
import {dispatchControls} from './dispatch-controls.mjs';
import {profilePhoto} from './home.mjs';
import {createProfilePublisher} from './profile-publisher.mjs';
import {fitPreview} from '../shop/preview-image.mjs';
import {escapeHtml as esc} from '../domain.mjs';
import {openReplyShop,openShop} from '../shop/shop.mjs';
import {scaled} from '../shop/transport-image.mjs';
import {phoneCache} from './phone-cache.mjs';
import {friendsDirectory,pendingFriendRequests,respondToPractice} from './friend-requests.mjs';
import {watchImage} from '../shop/ui-tasks.mjs';
import {watchReceipt} from './receipt-watch.mjs';
import {resolveReplyContent} from './reply-content.mjs';
import {mailLoading} from './mail-loading.mjs';
import {enlargeMailArtwork} from './mail-art-viewer.mjs';
import {mailModes,deliverySummary,deliveryTimeline,friendFacts,statusTime} from './mail-status.mjs';

let mailboxImages;
const pending=new Map();let sequence=0,folder='inbox',person='';
function read(){
  const rows=phoneCache.rows();
  const sentIds=new Set(rows.filter(row=>row.sent).map(row=>row.id));
  const selfSends=rows.filter(row=>!row.sent && row.remote===false && !row.isReply &&
    (row.senderCode==='self' || (!row.senderCode && row.sender==='Myself')) && !sentIds.has(row.id));
  return rows.concat(selfSends.map(row=>({...row,sent:true,selfSent:true})))
    .sort((a,b)=>(b.created||b.when)-(a.created||a.when));
}
const artworkId=row=>row.sent&&!row.selfSent?'sent-'+row.id:row.id;
const directory=friendsDirectory;
const date=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const modes={open:'Open to mail',inbox:'Inbox only',closed:'Closed to mail'};
function tracking(){try{return Boolean(JSON.parse(window.Pigeon?.deliveryPrefs?.()||'{}').receiptTracking);}catch{return false;}}
function receiptMarkup(receipt={},when=0,reply=false){
 const summary=deliverySummary(receipt,when,reply);
 return '<section class="delivery-status" aria-label="'+(reply?'Reply status':'Delivery status')+'"><strong class="'+(summary.seen?'mail-seen':'')+'">'+esc(summary.label)+'</strong><ol>'+deliveryTimeline(receipt,when,reply).map(e=>'<li><span>'+esc(e.label)+'</span><time>'+esc(e.time)+'</time></li>').join('')+'</ol><small>'+(summary.seen?'Opened on their screen, through a pop-up or by opening the mail.':summary.stage==='delivered'?'Received on their phone. A notification alone does not count as seen.':summary.stage==='scheduled'?'The parcel is scheduled for this time.':'Sent to the post office; waiting for their phone to confirm receipt.')+'</small></section>';
}
function followReceipt(panel,id,when,onUpdate){
 const d=el();
 const watcher=watchReceipt({read:()=>post('receipt',{id}),active:()=>panel.isConnected&&d.open,visible:()=>!document.hidden,
  draw:receipt=>{panel.innerHTML=receiptMarkup(receipt,when);onUpdate?.(receipt);},
  onError:()=>{let note=panel.querySelector('[data-status-error]');if(!note){note=document.createElement('small');note.dataset.statusError='';panel.append(note);}note.textContent='Could not refresh status. Retrying when connected.';},
  subscribe:callback=>{document.addEventListener('visibilitychange',callback);return()=>document.removeEventListener('visibilitychange',callback);}
 });
 d.addEventListener('close',watcher.stop,{once:true});return watcher;
}
function rowStatus(m){
 if(m.status==='cancelled')return 'Cancelled';
 if(m.status==='scheduled')return 'Scheduled · '+date(m.when);
 if(m.sent&&!m.selfSent)return deliverySummary(m.delivery||{},m.when).label;
 if(m.reply||m.pictureReply)return deliverySummary(m.replyDelivery||{},0,true).label;
 return m.seenAt?'Opened by you · '+statusTime(m.seenAt):'';
}
function confirmOpening(m,content=el()){
 if(!tracking()||!m.remote||m.sent||m.status==='scheduled')return;
 const d=el(),marker=Symbol();content.openingMarker=marker;
 const controller=new AbortController();let reported=false;
 const report=()=>requestAnimationFrame(()=>{if(!reported&&d.open&&content.isConnected&&content.openingMarker===marker&&!document.hidden){reported=true;controller.abort();post('seen',{id:m.id}).catch(()=>{});}});
 const image=content.querySelector('.mail-proof');
 const ready=()=>{if(!image||(image.complete&&image.naturalWidth))report();};
 d.addEventListener('close',()=>controller.abort(),{once:true,signal:controller.signal});
 document.addEventListener('visibilitychange',ready,{signal:controller.signal});
 if(image&&!image.complete){image.addEventListener('load',report,{once:true,signal:controller.signal});}else ready();
}
const profilePublisher=createProfilePublisher({supported:tracking,encode:async source=>{
 const image=new Image();image.src=source;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 canvas.getContext('2d').drawImage(image,0,0,128,128);return canvas.toDataURL('image/webp',.85);
},publish:photo=>post('profile',{photo}),changed:()=>window.dispatchEvent(new Event('profile-picture-sync'))});
export const friendProfileShareState=()=>profilePublisher.status();
export function publishFriendProfile(profile){return profilePublisher.update(profilePhoto(profile));}
export const retryFriendProfile=()=>profilePublisher.retry();
const bird='<img class="reply-bird" src="assets/home/mascot.webp" alt="Pigeon post courier">';
const button=(key,label)=>'<button class="mb-button" type="button" data-mb="'+key+'">'+label+'</button>';
const parcelKind=kind=>/^a pigeon$/i.test(kind||'')?'a sticker':kind;
const thumb=id=>document.documentElement.dataset.workroom?'assets/guest/105.svg':'https://appassets.androidplatform.net/mail-art/'+encodeURIComponent(id)+'.png';
function post(op,args={}){
  return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});Pigeon.post(id,op,JSON.stringify(args));});
}
window.postOfficeResult=(id,raw)=>{const promise=pending.get(id);if(!promise)return;pending.delete(id);try{const r=JSON.parse(raw);if(r.error)throw Error(r.error);promise.resolve(r.data);phoneCache.refresh().catch(()=>{});}catch(e){promise.reject(e);}};
const el=()=>document.querySelector('#mail-window');
function page(title,body,back){
  const d=el();
  delete d.dataset.mailArtViewer;delete d.openingMarker;
  // Keep private sender names out of the design export.
  d.dataset.reviewScreen=title.replace(/^(Reply to |A note for |To |From ).+$/,(_,prefix)=>prefix.trim()+' parcel');
  delete d.dataset.receipt;if(!d.open)d.showModal();
  d.innerHTML='<header><span>PIGEON POST</span><button data-x aria-label="Close">×</button></header><h2>'+esc(title)+'</h2>'+body+'<p class="mb-error" role="alert"></p>';
  d.querySelector('[data-x]').onclick=()=>d.close();
  if(back){
    const footer=d.querySelector('.reply-actions');
    if(footer)footer.insertAdjacentHTML('afterbegin',button('back','<span class="back-arrow" aria-hidden="true"></span> Back'));
    else d.insertAdjacentHTML('beforeend',button('back','<span class="back-arrow" aria-hidden="true"></span> Back'));
    action('back',back);
  }
}
function action(key,fn){
  const btn=el().querySelector('[data-mb="'+key+'"]');if(!btn)return;
  btn.onclick=async()=>{btn.disabled=true;try{await fn();}catch(e){const p=el().querySelector('.mb-error');if(p)p.textContent=e.message;}finally{btn.disabled=false;}};
}
function findRow(id,sent=false){return read().find(x=>x.id===id&&!!x.sent===sent);}
function portrait(f){return '<button class="mail-friend" data-friend="'+esc(f.code)+'" aria-label="View '+esc(f.name)+'’s profile"><img alt="" src="'+profilePhoto(f)+'"><strong>'+esc(f.name)+'</strong><small data-mail-mode="'+esc(f.mode||'unknown')+'">'+esc(mailModes[f.mode]||'Status not reported')+'</small></button>';}
let peopleExpanded=false;
export function peopleSection(){
 const book=directory(),friends=book.friends||[],requests=pendingFriendRequests(),count=requests.length;
 return '<section class="address-book"><div class="people-heading" data-base-look="peoplebar-4" data-review-look="peoplebar-4"><button type="button" class="people-toggle" data-people-toggle aria-expanded="'+peopleExpanded+'" aria-controls="people-list"><svg class="people-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg><b>Your people</b>'+(count?'<span class="request-count" aria-label="'+count+' pending friend request'+(count===1?'':'s')+'">'+count+'</span>':'')+'</button><button type="button" data-book>Add friend ＋</button></div><div id="people-list" '+(peopleExpanded?'':'hidden')+'>'+(count?'<button type="button" class="pending-friends" data-requests>'+count+' friend request'+(count===1?'':'s')+' <span aria-hidden="true">›</span></button>':'')+(friends.length?'<div class="friend-strip friend-grid">'+friends.map(f=>portrait(f).replace('<small>','<small>'+(f.simulated?'Simulation · ':''))).join('')+'</div>':'<p class="no-friends">No friends yet.</p>')+'</div></section>';
}
export function wirePeople(root,refresh){
 const toggle=root.querySelector('[data-people-toggle]'),list=root.querySelector('#people-list');
 if(toggle)toggle.onclick=()=>{peopleExpanded=!peopleExpanded;toggle.setAttribute('aria-expanded',String(peopleExpanded));list.hidden=!peopleExpanded;};
 root.querySelector('[data-book]')?.addEventListener('click',()=>friendsPage(refresh));
 root.querySelector('[data-requests]')?.addEventListener('click',()=>openFriendRequests(refresh));
 for(const b of root.querySelectorAll('[data-friend]'))b.onclick=()=>friendProfile(b.dataset.friend,refresh);
}
export function friendProfile(code,refresh){
 const f=(directory().friends||[]).find(friend=>friend.code===code);if(!f)return;
 if(f.simulated){page('Practice friend','<p>Simulation only · this friend cannot receive real parcels.</p>'+button('done','Done'));action('done',()=>el().close());return;}
 page(f.name,'<article class="friend-profile"><img class="friend-profile-photo" src="'+profilePhoto(f)+'" alt="'+esc(f.name)+'’s profile picture"><strong class="friend-mail-mode" data-mail-mode="'+esc(f.mode||'unknown')+'">'+esc(mailModes[f.mode]||'Status not reported')+'</strong><dl>'+friendFacts(f).map(([key,value])=>'<div><dt>'+esc(key)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl><p>These are the last settings reported by their app. A check-in can happen in the background; it does not mean they are online.</p></article>'+button('person-mail','View mail')+button('refresh-person','Refresh profile'));
 const card=el().querySelector('.friend-profile');
 const updates=new AbortController();
 const updatePhoto=()=>{
  if(!card.isConnected||!el().open){updates.abort();return;}
  const latest=(directory().friends||[]).find(friend=>friend.code===code);if(!latest)return;
  const image=card.querySelector('.friend-profile-photo'),source=profilePhoto(latest);
  if(image.getAttribute('src')!==source)image.src=source;
 };
 window.addEventListener('phone-mail-updated',updatePhoto,{signal:updates.signal});
 el().addEventListener('close',()=>updates.abort(),{once:true,signal:updates.signal});
 action('person-mail',()=>{person=code;el().close();refresh();});
 action('refresh-person',async()=>{await refreshFriends();if(card.isConnected&&el().open)friendProfile(code,refresh);});
}
export function mailboxView(){
  if(!phoneCache.ready())return '<p class="image-loading-label" role="status">Loading your inbox…</p>';
  const unread=unreadCount(read(),id=>phoneCache.wasRead(id));
  const rows=read().filter(r=>!!r.sent===(folder==='sent')&&(!person||r.code===person||r.senderCode===person));
  return '<section class="mailbox-heading" aria-label="Mailbox"><img src="assets/home/mailbox.png" alt="Mailbox" width="1864" height="843"></section>'+peopleSection()+'<div class="mail-tabs">'+['inbox','sent'].map(f=>'<button aria-pressed="'+(f===folder)+'" data-folder="'+f+'">'+'<img src="assets/home/'+(f==='sent'?'happy':'envelope')+'.webp" alt="">'+(f==='sent'?'Sent':'Inbox')+'</button>').join('')+'</div>'+(person?'<button class="mb-button" data-clear>All people ×</button>':'')+(folder==='inbox'&&unread?'<div class="mail-read-actions"><button type="button" data-mark-seen>Clear unread badges</button></div>':'')+'<div class="mail-rows">'+rows.map(m=>'<button class="mail-row" data-row="'+esc(m.id)+'" data-sent="'+!!m.sent+'"><span class="parcel-thumb"><img loading="lazy" decoding="async" alt="" src="'+esc((m.isReply&&!m.hasImage?'assets/home/envelope.webp':thumb(artworkId(m))))+'"></span><span class="mail-dot">'+(!m.sent&&!['scheduled','cancelled','rejected'].includes(m.status)&&!phoneCache.wasRead(m.id)?'●':'')+'</span><span><strong>'+esc(m.sent?'To '+m.sender:m.sender||'Pigeon Post')+'</strong><span>'+esc(m.isReply?(m.text||'Sticker reply'):parcelKind(m.kind)||'Parcel')+'</span><small>'+esc(rowStatus(m))+'</small></span><time>'+esc(date(m.created||m.when))+'</time></button>').join('')+(rows.length?'':'<p>No '+(folder==='sent'?'sent parcels':'deliveries')+' here yet.</p>')+'</div>';
}
export function wireMailbox(root,refresh){
  if(!phoneCache.ready())return;
  mailboxImages?.disconnect();
  mailboxImages=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const img=entry.target;mailboxImages.unobserve(img);fitPreview(img);}}, {rootMargin:'100px'});
  for(const img of root.querySelectorAll('.parcel-thumb img')){watchImage(img);mailboxImages.observe(img);}
  root.querySelector('[data-mark-seen]')?.addEventListener('click',()=>{for(const m of read())if(!m.sent&&!['scheduled','cancelled','rejected'].includes(m.status))phoneCache.markRead(m.id);refresh();});
  wirePeople(root,refresh);
  for(const b of root.querySelectorAll('[data-folder]'))b.onclick=()=>{folder=b.dataset.folder;refresh();};
  if(root.querySelector('[data-clear]'))root.querySelector('[data-clear]').onclick=()=>{person='';refresh();};
  for(const b of root.querySelectorAll('[data-row]'))b.onclick=()=>view(findRow(b.dataset.row,b.dataset.sent==='true'),refresh);
}
let refreshingFriends;
export function refreshFriends(){
 if(!window.Pigeon?.post)return Promise.resolve();
 if(!refreshingFriends)refreshingFriends=(async()=>{await post('friends');await phoneCache.refreshFresh();})().finally(()=>{refreshingFriends=null;});
 return refreshingFriends;
}
async function respond(request,accepted){
 if(!respondToPractice(request.code,accepted)){await post(accepted?'accept':'decline',{code:request.code});await phoneCache.refreshFresh();}
}
export function openFriendRequests(refresh,request=pendingFriendRequests()[0]){
 if(!request){page('Friend requests','<p>No pending friend requests.</p>'+button('done','Done'));action('done',()=>el().close());return;}
 page('Friend request','<article class="friend-request-card">'+bird+'<h3>'+esc(request.name)+'</h3><p>Would like to be your friend.</p>'+(request.simulated?'<p class="simulation-label">Simulation · only on this device. No real request was sent.</p>':'')+'</article><div class="friend-response">'+button('accept-request','Accept')+button('decline-request','Decline')+'</div>'+button('later-request','Later'));
 el().dataset.friendRequest=request.code;
 const answer=accepted=>async()=>{
  const card=el().querySelector('.friend-request-card'),controls=[...el().querySelectorAll('.friend-response button')];controls.forEach(button=>button.disabled=true);
  try{
   await respond(request,accepted);refresh();
   if(!card.isConnected||!el().open)return;
   page(accepted?'Request accepted':'Request declined','<p>'+esc(accepted?'You and '+request.name+' are now friends.':request.name+' hasn’t been added to your friends.')+'</p>'+(request.simulated?'<p class="simulation-label">Simulation only · practice friends cannot receive parcels.</p>':'')+button('done','Done'));
   action('done',()=>{el().close();refresh();});
  }catch(error){if(card.isConnected&&el().open)throw error;}finally{controls.forEach(button=>button.disabled=false);}
 };
 action('accept-request',answer(true));action('decline-request',answer(false));action('later-request',()=>el().close());
}
async function friendsPage(refresh){
 const show=()=>{
  const data=directory(),requests=pendingFriendRequests();
  page('Your people',(requests.length?button('incoming','Friend requests ('+requests.length+')'):'')+'<p>Your friend code</p><strong class="friend-code">'+esc(data.me?.code||(window.Pigeon?'Connecting…':'Available in the Android app'))+'</strong><label>Friend code<input data-code maxlength="10" autocapitalize="characters"></label>'+button('request','Send friend request')+(data.outgoing||[]).map(f=>'<p>Request sent to '+esc(f.name)+'</p>').join(''));
  action('incoming',()=>openFriendRequests(refresh));
  action('request',async()=>{
   if(!window.Pigeon?.post)throw Error('Install the Android app to connect with a real friend.');
   const code=el().querySelector('[data-code]').value.trim().toUpperCase();if(!/^[A-F0-9]{10}$/.test(code))throw Error('Enter their 10-character friend code.');
   await post('request',{code});await phoneCache.refreshFresh();show();refresh();
  });
 };
 show();if(!window.Pigeon?.post)return;
 const field=el().querySelector('[data-code]');
 try{await refreshFriends();if(!field.isConnected||!el().open)return;const typed=field.value;show();el().querySelector('[data-code]').value=typed;refresh();}catch(e){if(field.isConnected)el().querySelector('.mb-error').textContent=e.message;}
}
export function replyTo(id,refresh){
  const m=findRow(id);if(!m)return;const sender=m.sender||'sender';phoneCache.markRead(id);
  const intro=()=>{page('Reply to '+sender+'?',bird+'<div class="mail-dock">'+button('sticker','Send a sticker')+button('text','Quick text')+'</div>');
    action('text',()=>{page('A note for '+sender,'<label><textarea aria-label="Your reply" maxlength="500" placeholder="Write a quick reply…" rows="4"></textarea></label><div class="reply-actions">'+button('send','Send reply')+'</div>',intro);el().querySelector('textarea').focus();action('send',async()=>{let text=el().querySelector('textarea').value.trim();if(!text)throw Error('Write your reply first.');await post('reply',{id,text});done();});});
    action('sticker',()=>{el().close();openReplyShop(async(png,name,category,reopen)=>{const image=await scaled(png);page('Reply to '+sender+'?', '<img class="mail-proof" src="'+image+'" alt="'+esc(name)+'"><div class="mail-dock">'+button('edit','✎ Edit')+button('send','Send sticker')+'</div>');action('edit',()=>{el().close();reopen();});action('send',async()=>{await post('reply',{id,image});done();});},'Stickers',intro);});
  };
  function done(){page(m.remote?'Reply sent':'Reply saved',bird+button('done','Back to mailbox'));el().dataset.reviewScreen='reply-confirmation';refresh();action('done',()=>{el().close();refresh();});}
  intro();
}
async function viewReply(m,refresh,force=false){
  page('Opening reply…',mailLoading());
  const loading=el().querySelector('.mail-opening');
  const content=await resolveReplyContent(m,{force,loadPicture:async()=>{
    const source=thumb(m.id),image=new Image();image.src=source;await image.decode();return source;
  },fetchReceipt:id=>post('receipt',{id})});
  if(!loading.isConnected||!el().open)return;
  const hasContent=Boolean(content.text||content.image);
  page('Reply from '+m.sender,'<p>'+esc(date(m.created||m.when))+'</p>'+(content.text?'<p class="received-reply">'+esc(content.text)+'</p>':'')+(content.image?'<img class="mail-proof" style="visibility:hidden" src="'+esc(content.image)+'" alt="Picture reply">':'')+(!hasContent&&content.verified?'<p>No reply is attached to this parcel yet.</p>':'')+(content.warning?'<p role="status">'+esc(content.warning)+'</p>':'')+'<div class="mail-button-row reply-view-actions">'+button('retry-reply','Refresh reply')+button('done','Back to mailbox')+'</div>');
  el().dataset.reviewScreen='received-reply';
  action('retry-reply',()=>viewReply(m,refresh,true));action('done',()=>{el().close();refresh();});
  if(content.image){if(await enlargeMailArtwork(el()))confirmOpening(m);}
  else if(hasContent)confirmOpening(m);
  refresh();
}
async function view(m,refresh){
  if(!m)return;if(!m.sent)phoneCache.markRead(m.id);
  if(m.isReply)return viewReply(m,refresh);
  page((m.sent?'To ':'From ')+m.sender,'<p>'+esc(parcelKind(m.kind))+' · '+esc(date(m.when))+'</p><img class="mail-proof" src="'+(m.isReply&&!m.hasImage?'assets/home/envelope.webp':thumb(artworkId(m)))+'" alt="Parcel artwork"><div class="thread-reply"></div>'+(!m.sent?(m.status==='scheduled'?button('cancel','Cancel scheduled delivery'):m.status==='cancelled'?'':button('reply','Reply')):''));
  if(!m.sent){enlargeMailArtwork(el()).then(ready=>{if(ready)confirmOpening(m);});}
  const answer=el().querySelector('.thread-reply');action('reply',()=>replyTo(m.id,refresh));action('cancel',()=>{Pigeon.cancelScheduled(m.id);el().close();phoneCache.refresh().then(refresh).catch(()=>{});});
  if(m.sent&&!m.selfSent){
    const panel=document.createElement('div'),reply=document.createElement('div');answer.replaceChildren(panel,reply);panel.innerHTML=receiptMarkup(m.delivery||{},m.when);let replyVersion;
    followReceipt(panel,m.id,m.when,r=>{
      const version=JSON.stringify([r.replyAt,r.reply,r.replyImage]);if(version===replyVersion)return;replyVersion=version;reply.replaceChildren();
      if(r.reply||r.replyImage){phoneCache.markRead('reply-'+m.id);refresh();const text=document.createElement('p');text.textContent=r.reply||'Picture reply';reply.append(text);}
      if(r.replyImage?.startsWith('data:image/png;base64,')){const image=new Image();image.className='mail-proof';image.src=r.replyImage;image.alt='Reply';reply.append(image);}
      if(r.reply||r.replyImage)confirmOpening({id:'reply-'+m.id,remote:true},reply);
    });
  }
  else if(m.pictureReply||m.reply){answer.innerHTML=receiptMarkup(m.replyDelivery||{},0,true);const caption=document.createElement('p');answer.append(caption);caption.textContent=m.pictureReply?'Your sticker reply':'You replied: '+m.reply;if(m.pictureReply){const i=new Image();i.className='mail-proof';i.src=thumb('reply-'+m.id);answer.append(i);}}
  else if(m.selfSent)answer.textContent=m.status==='scheduled'?'Scheduled':m.status==='cancelled'?'Cancelled':'No reply yet.';
  refresh();
}
export function openMailboxItem(id,refresh){folder='inbox';person='';return view(findRow(id),refresh);}
export function friendsWindow(refresh){return pendingFriendRequests().length?openFriendRequests(refresh):friendsPage(refresh);}
export function composeFrom(category,refresh,example,myProfile={}){
  const draft={later:false,day:'',clock:'',target:'self'};
  const review=async(png,name,group,reopen,uploadedKind)=>{
    const image=await scaled(png),snapshot=directory(),key=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
    const people=(snapshot.friends||[]).filter(friend=>!friend.simulated);const kinds={Photos:'a framed photo',Notes:'a note',Stickers:'a sticker',Reminders:'a reminder',Flowers:'flowers',Postcards:'a postcard','Love notes':'a love note'};
    page('Who is it for?','<img class="mail-proof small" src="'+png+'" alt="'+esc(name)+'"><section class="recipient-choice" data-base-look="sendrow-3" data-review-look="sendrow-3"><label>Send to<select data-target hidden aria-label="Recipient"><option value="self">Myself</option>'+people.map(f=>'<option value="'+esc(f.code)+'" '+(f.mode==='closed'?'disabled':'')+'>'+esc(f.name)+' · '+esc(modes[f.mode])+'</option>').join('')+'</select></label><details class="recipient-menu" data-base-look="recipientdivider-1" data-review-look="recipientdivider-1"><summary aria-label="Choose recipient"></summary><div class="recipient-people" data-review-look="recipientfont-2" data-base-look="recipientfont-2" role="group" aria-label="Recipient"></div></details></section><p data-recipient-mail-status></p><div class="delivery-controls"></div><button class="dispatch-submit" type="button" data-mb="send">Send parcel <span aria-hidden="true">💌</span></button>'+button('edit','✎ Edit parcel'));
    fitPreview(el().querySelector('.mail-proof'));
    const target=el().querySelector('[data-target]');if([...target.options].some(o=>o.value===draft.target&&!o.disabled))target.value=draft.target;
    const list=el().querySelector('.recipient-people'),menu=el().querySelector('.recipient-menu'),heading=menu.querySelector('summary');
    el().querySelector('.recipient-choice>label').onclick=e=>{if(e.target.localName==='label'){e.preventDefault();menu.open=!menu.open;heading.focus();}};
    const updateTarget=()=>{
      draft.target=target.value;const recipientStatus=el().querySelector('[data-recipient-mail-status]');if(recipientStatus)recipientStatus.textContent=target.value==='self'?'Sending to yourself':mailModes[people.find(f=>f.code===target.value)?.mode]||'Mail status not reported';
      [...list.children].forEach((btn,i)=>btn.setAttribute('aria-pressed',String(i===target.selectedIndex)));
      const selected=list.children[target.selectedIndex];if(selected)heading.replaceChildren(...[...selected.childNodes].map(node=>node.cloneNode(true)));
      heading.setAttribute('aria-label','Send to '+target.selectedOptions[0].textContent);
    };
    for(const option of target.options){
      const person=document.createElement('button');person.type='button';person.disabled=option.disabled;
      const avatar=document.createElement('img');avatar.className='recipient-avatar';avatar.alt='';
      avatar.src=profilePhoto(option.value==='self'?myProfile:people.find(p=>p.code===option.value)||{});
      person.setAttribute('aria-label',option.textContent);person.append(avatar,document.createTextNode(option.textContent.split(' · ')[0]));
      person.onclick=()=>{target.value=option.value;updateTarget();menu.open=false;heading.focus();};list.append(person);
    }
    target.onchange=updateTarget;updateTarget();
    dispatchControls(el().querySelector('.delivery-controls'),draft);
    action('edit',()=>{el().close();reopen();});
    action('send',async()=>{let sentResult;const selected=target.value,later=draft.later,when=later?new Date(draft.day+'T'+draft.clock).getTime():Date.now();if(later&&(!Number.isFinite(when)||when<=Date.now()||when>Date.now()+30*86400000))throw Error('Choose a future time within 30 days.');
      if(selected==='self'){const result=Pigeon.queue(JSON.stringify({sender:'Myself',senderCode:'self',image,kind:uploadedKind||kinds[group]||'a parcel',text:name,when}));if(result!=='ok')throw Error(result);phoneCache.refresh().catch(()=>{});}
      else{const friend=people.find(f=>f.code===selected);sentResult=await post('send',{code:friend.code,recipient:friend.name,kind:uploadedKind||kinds[group]||'a parcel',image,when,receiptSecret:key});}
      const to=selected==='self'?'you':people.find(f=>f.code===selected).name;
      page(later?'Flight booked!':'Parcel sent!','<section class="post-receipt">'+bird+'<small>PIGEON POST · '+(later?'BOOKING SLIP':'DISPATCH SLIP')+'</small><p>'+(later?'Your courier has a date in the diary.':'Your pigeon has clocked in. The satchel is packed.')+'</p><strong data-base-look="receiptfont-2" data-review-look="receiptfont-2">'+esc(name)+'</strong><p>For '+esc(to)+' · '+esc(later?date(when):'Immediate delivery')+'</p></section>'+(sentResult?.id?'<div class="dispatch-status">'+receiptMarkup({sentAt:sentResult.sentAt},when)+'</div>':'')+'<div class="mail-button-row dispatch-complete-actions">'+(sentResult?.id?button('check-delivery','Check status'):'')+button('done','Done')+'</div>');
      const receiptPanel=el().querySelector('.dispatch-status'),watcher=receiptPanel?followReceipt(receiptPanel,sentResult.id,when):null;action('check-delivery',()=>watcher?.refresh());
      el().dataset.receipt='0';action('done',()=>{el().close();refresh();});});
  };
  if(example)return review(example.image,example.name,category,()=>composeFrom(category,refresh,null,myProfile));
  return openShop(review,category,{studio:true});
}
