import {dispatchControls} from './dispatch-controls.mjs';
import {profilePhoto} from './home.mjs';
import {fitPreview} from '../shop/preview-image.mjs';
import {escapeHtml as esc} from '../domain.mjs';
import {openReplyShop,openShop} from '../shop/shop.mjs';
import {scaled} from '../shop/transport-image.mjs';

const pending=new Map();let sequence=0,folder='inbox',person='';
function read(){
  const rows=JSON.parse(Pigeon.mailbox());
  const sentIds=new Set(rows.filter(row=>row.sent).map(row=>row.id));
  const selfSends=rows.filter(row=>!row.sent && row.remote===false &&
    (row.senderCode==='self' || (!row.senderCode && row.sender==='Myself')) && !sentIds.has(row.id));
  return rows.concat(selfSends.map(row=>({...row,sent:true,selfSent:true})))
    .sort((a,b)=>(b.created||b.when)-(a.created||a.when));
}
const artworkId=row=>row.sent&&!row.selfSent?'sent-'+row.id:row.id;
const directory=()=>JSON.parse(Pigeon.friendsCached());
const date=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const modes={open:'Open to mail',inbox:'Inbox only',closed:'Closed to mail'};
const bird='<img class="reply-bird" src="assets/home/mascot.webp" alt="Pigeon post courier">';
const button=(key,label)=>'<button class="mb-button" type="button" data-mb="'+key+'">'+label+'</button>';
const thumb=id=>document.documentElement.dataset.workroom?'assets/guest/105.svg':'https://appassets.androidplatform.net/mail-art/'+encodeURIComponent(id)+'.png';
function post(op,args={}){
  return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});Pigeon.post(id,op,JSON.stringify(args));});
}
window.postOfficeResult=(id,raw)=>{const promise=pending.get(id);if(!promise)return;pending.delete(id);try{const r=JSON.parse(raw);if(r.error)throw Error(r.error);promise.resolve(r.data);}catch(e){promise.reject(e);}};
const el=()=>document.querySelector('#mail-window');
function page(title,body,back){
  const d=el();
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
function portrait(f){return '<button class="mail-friend" data-friend="'+esc(f.code)+'"><img alt="" src="assets/home/mascot.webp"><strong>'+esc(f.name)+'</strong><small>'+esc(modes[f.mode]||'')+'</small></button>';}
export function mailboxView(){
  const book=directory(),friends=book.friends||[],requests=book.incoming||[];
  const rows=read().filter(r=>!!r.sent===(folder==='sent')&&(!person||r.code===person||r.senderCode===person));
  return '<section class="mailbox-heading" aria-label="Mailbox"><img src="assets/home/mailbox.png" alt="Mailbox" width="1864" height="843"></section><section class="address-book"><div class="people-heading" data-base-look="peoplebar-4" data-review-look="peoplebar-4"><b>Your people</b><button data-book>Friends'+(requests.length?' ('+requests.length+')':'')+'　＋</button></div><div class="friend-strip">'+friends.map(portrait).join('')+'</div></section><div class="mail-tabs">'+['inbox','sent'].map(f=>'<button aria-pressed="'+(f===folder)+'" data-folder="'+f+'">'+'<img src="assets/home/'+(f==='sent'?'happy':'envelope')+'.webp" alt="">'+(f==='sent'?'Sent':'Inbox')+'</button>').join('')+'</div>'+(person?'<button class="mb-button" data-clear>All people ×</button>':'')+'<div class="mail-rows">'+rows.map(m=>'<button class="mail-row" data-row="'+esc(m.id)+'" data-sent="'+!!m.sent+'"><span class="parcel-thumb"><img loading="lazy" decoding="async" alt="" src="'+esc(thumb(artworkId(m)))+'"></span><span class="mail-dot">'+(!m.sent&&!Pigeon.wasRead(m.id)?'●':'')+'</span><span><strong>'+esc(m.sent?'To '+m.sender:m.sender||'Pigeon Post')+'</strong><span>'+esc(m.kind||'Parcel')+'</span><small>'+esc(m.status==='scheduled'?'Scheduled · '+date(m.when):m.reply||m.pictureReply?'Replied':m.status==='cancelled'?'Cancelled':'')+'</small></span><time>'+esc(date(m.created||m.when))+'</time></button>').join('')+(rows.length?'':'<p>No '+(folder==='sent'?'sent parcels':'deliveries')+' here yet.</p>')+'</div>';
}
export function wireMailbox(root,refresh){
  for(const img of root.querySelectorAll('.parcel-thumb img')){
    img.addEventListener('error',()=>{img.hidden=true;},{once:true});
    if(img.complete&&img.naturalWidth)fitPreview(img);else img.addEventListener('load',()=>fitPreview(img),{once:true});
  }
  root.querySelector('[data-book]').onclick=()=>friendsPage(refresh);
  for(const b of root.querySelectorAll('[data-folder]'))b.onclick=()=>{folder=b.dataset.folder;refresh();};
  for(const b of root.querySelectorAll('[data-friend]'))b.onclick=()=>{person=b.dataset.friend;refresh();};
  if(root.querySelector('[data-clear]'))root.querySelector('[data-clear]').onclick=()=>{person='';refresh();};
  for(const b of root.querySelectorAll('[data-row]'))b.onclick=()=>view(findRow(b.dataset.row,b.dataset.sent==='true'),refresh);
}
async function friendsPage(refresh){
  const show=(data)=>{page('Your people','<p>Your friend code</p><strong class="friend-code">'+esc(data.me?.code||'Connecting…')+'</strong><label>Friend code<input data-code maxlength="12" autocapitalize="characters"></label>'+button('request','Send friend request')+(data.incoming||[]).map(f=>'<p>'+esc(f.name)+' would like to connect.</p>'+button('yes'+f.code,'Accept')+button('no'+f.code,'Decline')).join('')+(data.outgoing||[]).map(f=>'<p>Request sent to '+esc(f.name)+'</p>').join(''));
  action('request',async()=>{const code=el().querySelector('[data-code]').value.trim().toUpperCase();if(!/^[A-F0-9]{10}$/.test(code))throw Error('Enter their 10-character friend code.');show(await post('request',{code}));refresh();});
  for(const f of data.incoming||[])for(const [key,op] of [['yes','accept'],['no','decline']])action(key+f.code,async()=>{show(await post(op,{code:f.code}));refresh();});};
  show(directory());const field=el().querySelector('[data-code]');try{const data=await post('friends');if(!field.isConnected||!el().open)return;const typed=field.value;show(data);el().querySelector('[data-code]').value=typed;refresh();}catch(e){if(field.isConnected)el().querySelector('.mb-error').textContent=e.message;}
}
export function replyTo(id,refresh){
  const m=findRow(id);if(!m)return;const sender=m.sender||'sender';Pigeon.markRead(id);
  const intro=()=>{page('Reply to '+sender+'?',bird+'<div class="mail-dock">'+button('sticker','Send a sticker')+button('text','Quick text')+'</div>');
    action('text',()=>{page('A note for '+sender,'<label><textarea aria-label="Your reply" maxlength="500" placeholder="Write a quick reply…" rows="4"></textarea></label><div class="reply-actions">'+button('send','Send reply')+'</div>',intro);el().querySelector('textarea').focus();action('send',async()=>{let text=el().querySelector('textarea').value.trim();if(!text)throw Error('Write your reply first.');await post('reply',{id,text});done();});});
    action('sticker',()=>{el().close();openReplyShop(async(png,name,category,reopen)=>{const image=await scaled(png);page('Reply to '+sender+'?', '<img class="mail-proof" src="'+image+'" alt="'+esc(name)+'"><div class="mail-dock">'+button('edit','✎ Edit')+button('send','Send sticker')+'</div>');action('edit',()=>{el().close();reopen();});action('send',async()=>{await post('reply',{id,image});done();});},'Stickers',intro);});
  };
  function done(){page(m.remote?'Reply sent':'Test reply saved',bird+button('done','Back to mailbox'));action('done',()=>{el().close();refresh();});}
  intro();
}
async function view(m,refresh){
  if(!m)return;if(!m.sent)Pigeon.markRead(m.id);
  page((m.sent?'To ':'From ')+m.sender,'<p>'+esc(m.kind)+' · '+esc(date(m.when))+'</p><img class="mail-proof" src="'+thumb(artworkId(m))+'" alt="Parcel artwork"><div class="thread-reply"></div>'+(!m.sent?(m.status==='scheduled'?button('cancel','Cancel scheduled delivery'):m.status==='cancelled'?'':button('reply','Reply')):''));
  const answer=el().querySelector('.thread-reply');action('reply',()=>replyTo(m.id,refresh));action('cancel',()=>{Pigeon.cancelScheduled(m.id);el().close();refresh();});
  if(m.sent&&!m.selfSent){try{const r=await post('receipt',{id:m.id});answer.textContent=r.reply||(!r.replyImage?'No reply yet.':'Sticker reply');if(r.replyImage?.startsWith('data:image/png;base64,')){const i=new Image();i.className='mail-proof';i.src=r.replyImage;i.alt='Reply';answer.append(i);}}catch(e){answer.textContent=e.message;}}
  else if(m.pictureReply||m.reply){answer.textContent=m.pictureReply?'Your sticker reply':'You replied: '+m.reply;if(m.pictureReply){const i=new Image();i.className='mail-proof';i.src=thumb('reply-'+m.id);answer.append(i);}}
  else if(m.selfSent)answer.textContent=m.status==='scheduled'?'Scheduled':m.status==='cancelled'?'Cancelled':'No reply yet.';
  refresh();
}
export function friendsWindow(refresh){return friendsPage(refresh);}
export function composeFrom(category,refresh,example,myProfile={}){
  const draft={later:false,day:'',clock:'',target:'self'};
  const review=async(png,name,group,reopen,uploadedKind)=>{
    const image=await scaled(png),snapshot=directory(),key=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
    const people=snapshot.friends||[];const kinds={Photos:'a framed photo',Notes:'a note',Stickers:'a pigeon',Reminders:'a reminder',Flowers:'flowers',Postcards:'a postcard','Love notes':'a love note'};
    page('Who is it for?','<img class="mail-proof small" src="'+png+'" alt="'+esc(name)+'"><section class="recipient-choice" data-base-look="sendrow-5" data-review-look="sendrow-5"><label>Send to<select data-target hidden aria-label="Recipient"><option value="self">Myself</option>'+people.map(f=>'<option value="'+esc(f.code)+'" '+(f.mode==='closed'?'disabled':'')+'>'+esc(f.name)+' · '+esc(modes[f.mode])+'</option>').join('')+'</select></label><details class="recipient-menu"><summary aria-label="Choose recipient"></summary><div class="recipient-people" data-review-look="recipientfont-1" data-base-look="recipientfont-1" role="group" aria-label="Recipient"></div></details></section><div class="delivery-controls"></div><button class="dispatch-submit" type="button" data-mb="send">Send parcel <span aria-hidden="true">💌</span></button>'+button('edit','✎ Edit parcel'));
    fitPreview(el().querySelector('.mail-proof'));
    const target=el().querySelector('[data-target]');if([...target.options].some(o=>o.value===draft.target&&!o.disabled))target.value=draft.target;
    const list=el().querySelector('.recipient-people'),menu=el().querySelector('.recipient-menu'),heading=menu.querySelector('summary');
    el().querySelector('.recipient-choice>label').onclick=e=>{if(e.target.localName==='label'){e.preventDefault();menu.open=!menu.open;heading.focus();}};
    const updateTarget=()=>{
      draft.target=target.value;
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
    action('send',async()=>{const selected=target.value,later=draft.later,when=later?new Date(draft.day+'T'+draft.clock).getTime():Date.now();if(later&&(!Number.isFinite(when)||when<=Date.now()||when>Date.now()+30*86400000))throw Error('Choose a future time within 30 days.');
      if(selected==='self'){const result=Pigeon.queue(JSON.stringify({sender:'Myself',senderCode:'self',image,kind:uploadedKind||kinds[group]||'a parcel',text:name,when}));if(result!=='ok')throw Error(result);}
      else{const friend=people.find(f=>f.code===selected);await post('send',{code:friend.code,recipient:friend.name,kind:uploadedKind||kinds[group]||'a parcel',image,when,receiptSecret:key});}
      const to=selected==='self'?'you':people.find(f=>f.code===selected).name;
      page(later?'Flight booked!':'Parcel sent!','<section class="post-receipt">'+bird+'<small>PIGEON POST · '+(later?'BOOKING SLIP':'DISPATCH SLIP')+'</small><p>'+(later?'Your courier has a date in the diary.':'Your pigeon has clocked in. The satchel is packed.')+'</p><strong data-base-look="receiptfont-2" data-review-look="receiptfont-2">'+esc(name)+'</strong><p>For '+esc(to)+' · '+esc(later?date(when):'Immediate delivery')+'</p></section>'+button('done','Done'));
      el().dataset.receipt='0';action('done',()=>{el().close();refresh();});});
  };
  if(example)return review(example.image,example.name,category,()=>composeFrom(category,refresh,null,myProfile));
  return openShop(review,category,{studio:true});
}
