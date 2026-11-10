import {phoneCache} from './post/phone-cache.mjs';
import {unreadCount} from './post/unread.mjs';
import {repairLatestReview} from './design/review-repairs.mjs';
import {openArtworkUploads} from './shop/art-upload.mjs';
import {setupHomeColours} from './post/home-colours.mjs';
import {openPhoneStudio,closePhoneStudio} from './design/phone-home.mjs';
import {settingsPage,wireSettings,backdropOpacity} from './post/settings.mjs';
import {refreshMainArt,verifyManager} from './shop/main-art.mjs';
import {catalogueDesigns} from './shop/catalogue.mjs';
import {mountCategoryWheel,restoreCategoryWheel} from './shop/category-wheel.mjs';
import {mailboxView,wireMailbox,friendsWindow,replyTo,composeFrom,openMailboxItem,peopleSection,wirePeople,openFriendRequests,refreshFriends,publishFriendProfile,retryFriendProfile} from './post/mailbox.mjs';
import {pendingFriendRequests} from './post/friend-requests.mjs';
import {createRequestPrompts} from './post/friend-state.mjs';
import {header,home,demoPeople} from './post/home.mjs?v=hanging-sign-2';
import {installSocial} from './post/social.mjs';
import {openShop,backInShop} from './shop/shop.mjs';
import{createId,STORAGE_KEY,FRAMES,COLOURS,loadState,validateMessage,makeMessage,escapeHtml as esc}from'./domain.mjs';
repairLatestReview(localStorage);
const app=document.getElementById('app'),dialog=document.getElementById('flow'),notice=document.getElementById('notice');
let raw=null;try{raw=localStorage.getItem(STORAGE_KEY)}catch{}
let state=loadState(raw),tab='home',flow=null,lastFocus=null,noticeTimer;
try{const previous=sessionStorage.getItem('pigeon.design.return-tab');if(['home','inbox','settings'].includes(previous))tab=previous;sessionStorage.removeItem('pigeon.design.return-tab');}catch{}
const icons={home:'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',inbox:'M4 4h16l2 11v5H2v-5z M2 15h6l2 3h4l2-3h6',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',plus:'M12 5v14 M5 12h14',back:'M15 5l-7 7 7 7',mail:'M3 5h18v14H3z M3 6l9 7 9-7',close:'M6 6l12 12 M18 6L6 18',check:'M5 12l4 4L19 6',ring:'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4z M10 21h4',link:'M9 15l6-6 M8 17l-1 1a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0 M16 7l1-1a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-5 0'};
function icon(name){return`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.mail}"/></svg>`}
function toast(text){clearTimeout(noticeTimer);notice.textContent=text;notice.classList.add('visible');noticeTimer=setTimeout(()=>notice.classList.remove('visible'),3500)}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true}catch{toast('Could not save on this device. Remove a picture or free some storage.');return false}}
let homeColours;
let nativeTheme,nativeName;
function applyTheme(){if(nativeTheme!==state.theme){window.Pigeon?.setTheme?.(state.theme==='dark');nativeTheme=state.theme;}document.documentElement.dataset.theme=state.theme;document.querySelector('meta[name="theme-color"]').content=state.theme==='dark'?'#111c19':'#a1c6bc';homeColours?.apply()}
let localFolder='inbox';
let requestPrompts;
function finishStartup(){document.getElementById('app-loading')?.remove();app.inert=false;app.removeAttribute('aria-busy');queueRequestPrompt();}
function recipientName(id){return id==='self'?'Myself':state.friends.find(friend=>friend.id===id)?.name||'Owen';}
function localSent(){
 const rows=[...state.inbox.filter(m=>m.recipient),...state.scheduled].sort((a,b)=>(b.createdAt||Date.parse(b.when))-(a.createdAt||Date.parse(a.when)));
 return rows.length?'<div class="inbox-list">'+rows.map(m=>`<button class="inbox-item" data-action="sent-detail" data-id="${esc(m.id)}"><span>${icon('mail')}</span><span><strong>To ${esc(recipientName(m.recipient))}</strong><span>${esc(m.kind||m.text||m.gift||'Parcel')}</span><small>${m.when?'Scheduled · ':''}${formatTime(m.when?Date.parse(m.when):m.createdAt)}</small></span></button>`).join('')+'</div>':'<p>No sent parcels here yet.</p>';
}
function inbox(){if(window.Pigeon?.mailbox)return mailboxView();
 const tabs='<div class="mail-tabs">'+['inbox','sent'].map(f=>`<button type="button" data-action="local-folder" data-id="${f}" aria-pressed="${localFolder===f}"><img src="assets/home/${f==='sent'?'happy':'envelope'}.webp" alt="">${f==='sent'?'Sent':'Inbox'}</button>`).join('')+'</div>';
 if(localFolder==='sent')return '<section class="mailbox-heading"><img src="assets/home/mailbox.png" alt="Mailbox" width="1864" height="843"></section>'+tabs+localSent();const request=state.friendRequest;const requestCard=request?`<button class="menu-item" data-action="invitation"><span><strong>Friend request</strong><small>Local test · ${esc(request.status)}</small></span><span>›</span></button>`:'';return`<section class="mailbox-heading"><img src="assets/home/mailbox.png" alt="Mailbox" width="1864" height="843">${window.Pigeon?'<button class="primary" data-action="phone-history">Phone inbox &amp; schedules</button>':''}</section>${tabs}${requestCard}${!state.inbox.length?`<div class="empty"><img src="assets/pigeon.webp" alt=""><h2>Suspiciously peaceful.</h2><p>Try a test pop-up to see a letter here.</p><button class="secondary" data-action="test">Send test</button></div>`:`<div class="inbox-list">${state.inbox.slice().reverse().map(m=>`<button class="inbox-item" data-action="read" data-id="${esc(m.id)}"><span>${m.type==='picture'&&m.image?'<img alt="" class="local-mail-thumb" src="'+esc(m.image)+'">':icon(m.type==='message'?'mail':'inbox')}</span><span><strong>${esc(m.sender)}</strong><span>${esc(m.type==='picture'?'A picture':m.text||m.gift||'A little interruption')}</span><small>${formatTime(m.createdAt)} · Test on this device${m.snoozeUntil?' · Snoozed':''}</small></span>${m.read?'':'<b class="unread" aria-label="Unread"></b>'}</button>`).join('')}</div>`}${state.scheduled.length?`<h2 class="section-title">Waiting pigeons</h2>${state.scheduled.map(m=>`<div class="scheduled"><span>Local test · ${esc(m.recipient)}<small>${formatTime(Date.parse(m.when))}</small></span><button class="text-button" data-action="cancel-scheduled" data-id="${esc(m.id)}">Cancel</button></div>`).join('')}`:''}`}
let homeCategory='Photos',wheelGeneration=0;
function browseHomeCategory(category){
 if(window.Pigeon)return composeFrom(category,render,null,state.profile);
 const b=document.createElement('button');b.dataset.action='shop';b.dataset.id=category;app.append(b);b.click();b.remove();
}
async function mountHomeWheel(){
 const root=app.querySelector('#home-wheel'),generation=++wheelGeneration;
 if(!root)return;
 let designs;
 try{designs=await catalogueDesigns();}catch{if(root.isConnected)root.textContent='The artwork could not load. Reopen Post office to retry.';finishStartup();return;}
 if(!root.isConnected||generation!==wheelGeneration)return;
 const send=app.querySelector('[data-home-send]');
 mountCategoryWheel(root,{initialCategory:homeCategory,designs,onSelect:key=>{homeCategory=key;send?.setAttribute('aria-label','Send '+(key==='Photos'?'photo frames':key==='Stickers'?'stickers':key.toLowerCase()));},onBack:()=>{},onBrowse:browseHomeCategory});
 const hint=root.querySelector('.wheel > p');if(hint)hint.textContent='Swipe to choose, then tap Send.';
 if(send){send.disabled=false;send.onclick=()=>browseHomeCategory(homeCategory);}
 finishStartup();
}
function updateUnreadBadge(){
 const btn=app.querySelector('.app-nav [data-id="inbox"]');if(!btn)return;
 let count=pendingFriendRequests().length;try{count+=window.Pigeon?.mailbox?unreadCount(phoneCache.rows(),id=>phoneCache.wasRead(id)):state.inbox.filter(m=>!m.read).length;}catch{}
 const badge=btn.querySelector('.inbox-count');badge.hidden=!count;badge.textContent=count>99?'99+':String(count);btn.setAttribute('aria-label',count?'Inbox, '+count+' unread items including pending friend requests':'Inbox');
}
const pageCache=new Map();let renderedTab;
function render(reuse=false){const previous=app.querySelector('.page-content');if(previous&&renderedTab)pageCache.set(renderedTab,previous);const cached=reuse===true?pageCache.get(tab):null;applyTheme();app.innerHTML=`${header(state,tab==='home',false)}${window.Pigeon?"":'<div class="draft-label">Browser preview · local deliveries only</div>'}<div class="page-content ${tab==='inbox'?'mailbox-layout':''}" ${tab==='inbox'?'data-base-look="mailbox-3" data-review-look="mailbox-3"':''}>${cached?'':tab==='home'?home(state):tab==='inbox'?inbox():settingsPage()}</div><nav class="app-nav" aria-label="Main navigation">${[['home','Post office','home'],['inbox','Inbox','inbox'],['settings','Settings','settings']].map(([id,label,ic])=>`<button data-action="tab" data-id="${id}" ${tab===id?'aria-current="page"':''}>${icon(ic)}<span>${label}</span>${id==='inbox'?'<b class="inbox-count" hidden aria-hidden="true"></b>':''}</button>`).join('')}</nav>`;if(cached)app.querySelector('.page-content').replaceWith(cached);renderedTab=tab;pageCache.set(tab,app.querySelector('.page-content'));if(tab==='settings'){if(!cached)wireSettings(app);app.querySelector('#theme').checked=state.theme==='dark';}
 updateUnreadBadge();
 if(tab==='home'&&!cached)mountHomeWheel();else{if(tab==='home')restoreCategoryWheel(cached);finishStartup();}
 if(tab==='inbox'&&window.Pigeon?.mailbox)wireMailbox(app,render);
 if(tab==='inbox'&&!window.Pigeon?.mailbox){const content=app.querySelector('.page-content');if(!cached)content.insertAdjacentHTML('afterbegin',peopleSection());wirePeople(app,render);}
 if(window.Pigeon?.name&&nativeName!==state.profile.name){Pigeon.name(state.profile.name);nativeName=state.profile.name;}
 publishFriendProfile(state.profile).catch(()=>{});
}
homeColours=setupHomeColours({app,getTheme:()=>state.theme,setTheme:value=>{state.theme=value;persist();render()},isHome:()=>tab==='home'});
window.openPigeonHomeColours=async()=>{await verifyManager();tab='home';render();homeColours.open('page');};
function formatTime(n){return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(n))}
function start(next){lastFocus=document.activeElement;flow=next;renderFlow();if(!dialog.open)dialog.showModal()}
function close(){dialog.close();flow=null;if(lastFocus?.isConnected)lastFocus.focus()}
function cancel(){if(!flow)return;if(flow.type==='arrival'){close();return}if(flow.type==='incoming'){flow.message.read=true;delete flow.message.snoozeUntil;persist();render();close();return}if(['send','defaults','profile','connect'].includes(flow.type)&&flow.step>0&&!flow.confirmCancel){flow.confirmCancel=true;renderFlow();return}close()}
function shell(title,body,{step='',next='',back=false,cancelButton=true,nextAction='next',warning=''}={}){dialog.innerHTML=`<div class="flow-head">${step?`<span class="step">${step}</span>`:'<span class="step">Pigeon post</span>'}<button class="icon-button" data-flow="cancel" aria-label="Close">${icon('close')}</button></div><h2 id="flow-title">${title}</h2>${body}${warning?`<p class="form-error" role="alert">${esc(warning)}</p>`:''}<p id="flow-error" class="form-error" role="alert"></p><div class="flow-actions">${back?`<button class="secondary" data-flow="back">${icon('back')} Back</button>`:cancelButton?'<button class="secondary" data-flow="cancel">Cancel</button>':''}${next?`<button class="primary" data-flow="${nextAction}">${next}</button>`:''}</div>`;requestAnimationFrame(()=>{const el=dialog.querySelector('textarea,input:not([type=file]),button.primary')||dialog.querySelector('button');el?.focus()})}
function choices(items,selected,key){return`<div class="choices">${items.map(item=>`<button class="choice ${item.id===selected?'selected':''}" data-flow="choose" data-key="${key}" data-value="${esc(item.id)}" aria-pressed="${item.id===selected}"><span><strong>${esc(item.label)}</strong>${item.description?`<small>${esc(item.description)}</small>`:''}</span>${item.id===selected?icon('check'):'<span>›</span>'}</button>`).join('')}</div>`}
function steps(){if(flow?.draft?.prepared)return ['recipient',...(state.scheduling?['timing']:[]),'preview'];return['recipient','type','content','frame','colour',...(state.scheduling?['timing']:[]),'preview']}
const testPigeon = 'assets/home/test-pigeon.png';
function arrivalImage(m) {
  if (m.type !== 'picture') return '';
  return m.image === testPigeon || /^data:image\/png;base64,/.test(m.image || '') ? m.image : '';
}
function receive(message) {
  return {type: arrivalImage(message) ? 'arrival' : 'incoming', message};
}
function deliveryCard(m){const safeImage=m.image===testPigeon?testPigeon:/^data:image\/(png|jpeg|webp|gif);base64,/.test(m.image||'')?m.image:'';return`<div class="delivery frame-${esc(m.frame)} colour-${esc(m.colour)}"><span class="delivery-from">${esc(m.sender||'A test from Owen')}</span>${m.type==='picture'&&safeImage?`<img class="message-image" src="${esc(safeImage)}" alt="Picture in your test message">`:m.type==='gift'?`<div class="gift-art" aria-hidden="true">${esc(m.gift)}</div>`:''}<p>${esc(m.text||'A little interruption, just for you.')}</p></div>`}
function renderFlow(){if(!flow)return;
  dialog.dataset.reviewScreen=flow.type+' / '+(flow.confirmCancel?'discard':flow.step??0);
  dialog.classList.toggle('png-arrival', flow.type === 'arrival');
  if (flow.type === 'arrival') {
    dialog.style.setProperty('--parcel-dim',String(backdropOpacity()/100));
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.flow = 'done';
    button.setAttribute('aria-label', 'Dismiss picture from ' + flow.message.sender);
    const image = new Image();
    let swipe=null;
    button.style.touchAction='none';
    button.onpointerdown=e=>{if(e.isPrimary){swipe=[e.clientX,e.clientY];button.setPointerCapture(e.pointerId);}};
    button.onpointercancel=()=>{swipe=null;image.style.transform='';};
    button.onpointermove=e=>{if(swipe&&e.isPrimary)image.style.transform='translate('+(e.clientX-swipe[0])+'px,'+(e.clientY-swipe[1])+'px)';};
    button.onpointerup=e=>{if(!swipe||!e.isPrimary)return;const moved=Math.hypot(e.clientX-swipe[0],e.clientY-swipe[1]);swipe=null;image.style.transform='';if(moved>=64)close();};
    image.src = arrivalImage(flow.message);
    image.alt = flow.message.text || 'Picture delivery';
    button.append(image);
    dialog.innerHTML = '<h2 id="flow-title" class="arrival-sr">Picture delivery. Tap anywhere to dismiss.</h2>';
    dialog.append(button);
    const actions=document.createElement('div');
    actions.className='arrival-actions';
    actions.innerHTML='<button data-flow="dismiss">× Dismiss</button><button data-flow="reply">Reply</button>';
    actions.hidden=true;dialog.append(actions);
    setTimeout(()=>{if(actions.isConnected)actions.hidden=false;},1000);
    button.focus({preventScroll:true});
    return;
  }
  if(flow.confirmCancel){shell('Abandon the pigeon?',`<p>Your unfinished changes will be discarded.</p>`,{next:'Discard',nextAction:'discard',cancelButton:false});dialog.querySelector('.flow-actions').insertAdjacentHTML('afterbegin','<button class="secondary" data-flow="keep">Keep editing</button>');return}
if(flow.type==='send'){const d=flow.draft,key=steps()[flow.step],progress=`${flow.step+1} of ${steps().length}`;let title='',body='';if(key==='recipient'){const recipients=[{id:'self',name:'Myself',open:true},...state.friends];title='Who are we bothering?';body='<section class="recipient-choice" data-base-look="sendrow-5" data-review-look="sendrow-5"><label>Send to<select aria-label="Recipient" data-local-recipient><option value="">Choose someone</option>'+recipients.map(f=>'<option value="'+esc(f.id)+'" '+(f.id===d.recipient?'selected':'')+'>'+esc(f.name)+(f.id==='self'?'':' · '+(f.open?'Open to mail':'Not receiving')+' · demo friend')+'</option>').join('')+'</select></label><div class="recipient-people" data-review-look="recipientfont-1" data-base-look="recipientfont-1" role="group" aria-label="Recipient">'+recipients.map(f=>'<button data-flow="choose" data-key="recipient" data-value="'+esc(f.id)+'" aria-pressed="'+(f.id===d.recipient)+'"><img class="recipient-avatar" alt="" src="'+(demoPeople.some(p=>p[0]===f.id)?'assets/home/'+esc(f.id)+'.webp':'assets/home/mascot.webp')+'">'+esc(f.name)+'</button>').join('')+'</div></section>'}
if(key==='type'){title='Choose your interruption.';body=choices([{id:'message',label:'A message',description:'Words. Potentially unnecessary ones.'},{id:'picture',label:'A picture',description:'Still images only.'},{id:'gift',label:'A little something',description:'Hugs, flowers, wine, and other distractions.'}],d.type,'type')}
if(key==='content'){title=d.type==='message'?'What needs their attention?':d.type==='picture'?'Choose the evidence.':'Pick a little distraction.';body=d.type==='gift'?choices([{id:'💐',label:'Flowers'},{id:'🤗',label:'A hug'},{id:'🍷',label:'A glass of wine'},{id:'👀',label:'An ominous stare'}],d.gift,'gift'):d.type==='picture'?`<label class="field-label" for="photo">Picture (PNG, JPG, WebP or GIF · max 2 MB)</label><input id="photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif">${d.image?`<img class="upload-preview" src="${esc(d.image)}" alt="Chosen picture">`:''}`:'';if(d.type!=='gift')body+=`<label class="field-label" for="message">${d.type==='picture'?'Optional caption':'Your message'}</label><textarea id="message" maxlength="1000" placeholder="Oi. Pay attention to me.">${esc(d.text)}</textarea><small class="helper">Up to 1,000 characters.</small>`}
if(key==='frame'){title='Dress the interruption.';body=choices(FRAMES,d.frame,'frame')}
if(key==='colour'){title='Pick its colour.';body=choices(COLOURS.map(c=>({...c,label:c.label,description:c.id==='lagoon'?'The classic pigeon post':c.id==='apricot'?'A little warmer':'A little quieter'})),d.colour,'colour')}
if(key==='timing'){title='When should it arrive?';body='<fieldset class="timing-options" data-base-look="whenticks-1" data-review-look="whenticks-1"><legend data-review-look="timeheading-1" data-base-look="timeheading-1">Delivery timing</legend><div>'+['now','later'].map(key=>'<label><input type="radio" name="local-time" value="'+key+'" '+((key==='later')===(d.when!==null)?'checked':'')+'><span>'+ (key==='now'?'Now':'Later')+'</span></label>').join('')+'</div></fieldset><small>Local tests run while this draft is open or when you reopen it.</small>'+(d.when!==null?`<label class="field-label" for="when">Delivery time</label><input id="when" type="datetime-local" value="${esc(d.when||'')}">`:'')}
if(key==='preview'){title='Ready to disturb the peace?';body=(arrivalImage(d)?`<img class="arrival-preview" src="${esc(arrivalImage(d))}" alt="Your picture"><p class="helper">The picture will float over the dimmed page. Tap anywhere to dismiss.</p>`:deliveryCard({...d,sender:`Test from ${recipientName(d.recipient)}`}))+`<p class="helper">${window.Pigeon?'This is a phone delivery test. View it in your phone inbox.':'This first draft previews delivery on this device.'} ${window.Pigeon?'':d.when?'Scheduled tests need the page open, or will appear when you return.':'No message is sent to another phone.'}</p>`}
shell(title,body,{step:progress,back:flow.step>0,next:key==='preview'?(d.when?'Schedule test':'Preview delivery'):'Next'});return}
if(flow.type==='sent-detail'){const m=flow.message;shell('To '+esc(recipientName(m.recipient)),deliveryCard({...m,sender:recipientName(m.recipient)})+(m.when?'<p>Scheduled · '+formatTime(Date.parse(m.when))+'</p>':''),{next:'Done',nextAction:'done',cancelButton:false});return}
if(flow.type==='incoming'){const m=flow.message;shell(`${esc(m.sender)} has entered your screen.`,`<span class="helper">${formatTime(m.createdAt)} · Local test</span>${deliveryCard(m)}<div class="incoming-actions"><button class="primary" data-flow="reply">Reply</button><button class="secondary" data-flow="dismiss">Dismiss</button></div>`,{cancelButton:false});return}
if(flow.type==='reply'){shell('Return the interruption.',`<label class="field-label" for="reply">Your reply</label><textarea id="reply" maxlength="1000" placeholder="I was enjoying the peace.">${esc(flow.text||'')}</textarea><p class="helper">Your reply is saved locally in this draft.</p>`,{next:'Save test reply',back:true});return}
if(flow.type==='defaults'){shell(flow.step===0?'Choose your default frame.':'Choose your default colour.',choices(flow.step===0?FRAMES:COLOURS,flow.step===0?flow.draft.frame:flow.draft.colour,flow.step===0?'frame':'colour'),{step:`${flow.step+1} of 2`,next:flow.step===0?'Next':'Save style',back:flow.step>0});return}
if(flow.type==='friend'){const f=state.friends.find(x=>x.id===flow.id);if(!f){close();return}if(flow.step===1){shell(`Allow ${esc(f.name)} to ring you?`,`<p>Loud ringing is off by default. This saves your preference only; Android support is still pending.</p>${choices([{id:'off',label:'Keep it off'},{id:'on',label:'Allow loud ringing'}],flow.ring?'on':'off','ring')}`,{next:'Save preference',back:true});return}shell(esc(f.name),`<p class="friend-status ${f.open?'':'off'}">${f.open?'● Open to mail':'● Not receiving'}</p><div class="fact">Pop-ups <b>${f.popups?'Allowed':'Off'}</b></div><div class="fact">Loud ring <b>${f.ring?'Allowed':'Off'}</b></div><p class="helper">Demo friend. Permissions apply to what they may send you.</p>${f.open?'<button class="primary" data-flow="send-friend">Send mail</button>':''}<button class="menu-item" data-flow="ring-pref">${icon('ring')}<span>Edit loud-ring permission</span><span>›</span></button>`,{next:'Done',nextAction:'done',cancelButton:false});return}
if(flow.type==='schedule-setting'){shell('Enable scheduling?',`<p>Add a timing step to the sending process.</p>${choices([{id:'off',label:'Keep it simple',description:'Send immediately.'},{id:'on',label:'Show scheduling',description:'Pick a time in its own pop-up.'}],flow.enabled?'on':'off','enabled')}<p class="helper">${window.Pigeon?'Android schedules local parcels, including when the app is closed.':'Scheduled tests run while the page is open, or catch up when reopened.'}</p>`,{next:'Save'});return}
if(flow.type==='permissions'){shell('Phone permissions',`<p>These are Android features. This browser draft cannot grant them.</p><div class="fact">Phone notifications <b class="pending">Not connected</b></div><div class="fact">Display over other apps <b class="pending">Android app needed</b></div><div class="fact">Loud ringing / DND <b class="pending">Off · native setup needed</b></div><div class="fact">Background receiving <b class="pending">Android app needed</b></div>`,{next:'Got it',nextAction:'done',cancelButton:false});return}
if(flow.type==='test-link'){shell('Send me something',`<p>Create a one-use link in the Android app under Settings → Send me something.</p><p class="helper">Your friend can open the link in their browser.</p>`,{next:'Got it',nextAction:'done',cancelButton:false});return}
if(flow.type==='about'){
 let version='';try{version=JSON.parse(window.Pigeon?.deliveryPrefs?.()||'{}').appVersion||'';}catch{}
 shell('About Pigeon Post',`<div class="pigeon-handbook"><p>A tiny pigeon. A little interruption. Send friends stickers, photos, postcards and notes that can pop up on their phone.</p><details><summary>Connect with a friend</summary><p>Open Inbox, tap Friends, then share your friend code or add theirs. Accept the request to exchange parcels.</p></details><details><summary>Send a parcel</summary><p>Swipe through the categories in Post office and tap a circle. Pick your artwork, add a photo or note if you like, then choose who it is for. Choose Now or Later, review it and tap Send parcel. Myself sends it to your own phone.</p></details><details><summary>Control incoming mail</summary><p>Tap the post-office sign to open or close your mail. In Settings, choose pop-ups or notifications, warning time and what happens while closed. Your phone permissions must allow the delivery style you choose.</p></details><details><summary>Read and reply</summary><p>Inbox holds received parcels; Sent holds parcels you have sent. Open a parcel to view it or reply. Scheduled parcels show their arrival time.</p></details><details><summary>Artwork and updates</summary><p>The shared artwork library refreshes when you open the app online. Published design changes download automatically when the app is idle. Use Check for updates for changes that need a new app installation.</p></details><p class="installed-version">${version?'Installed app version '+esc(version):window.Pigeon?'Installed app version: check for updates to enable version details.':'Browser preview'}</p></div>`,{next:'Done',nextAction:'done',cancelButton:false});return}
if(flow.type==='blocked'){shell('The post office is closed.',`<p>Turn receiving on to test an incoming pop-up.</p>`,{next:'Open to mail',nextAction:'enable'});return}
if(flow.type==='sending'){shell('Pigeon in transit…',`<div class="loader" role="status" aria-label="Preparing local test"></div><p class="helper">Preparing a test on this device.</p>`,{cancelButton:false});dialog.querySelector('[data-flow=cancel]').hidden=true;return}
if(flow.type==='result'){shell(flow.title,`<p>${esc(flow.message)}</p>`,{next:'Done',nextAction:'done',cancelButton:false});return}
}
function error(text){dialog.querySelector('#flow-error').textContent=text}
async function next(){if(flow.type==='send'){const d=flow.draft,key=steps()[flow.step];if(key==='recipient'&&!d.recipient)return error('Pick someone first.');if(key==='type'&&!d.type)return error('Choose what to send.');if(key==='type'&&d.type==='picture'){
  const recipient=d.recipient;close();openShop((image,label,category)=>start({type:'send',step:1,draft:{...d,prepared:true,image,text:label,kind:category==='Photos'?'a framed photo':'a parcel',recipient}}),'Photos',{studio:true});return;
}if(key==='content'){if(d.type==='message'&&!d.text?.trim())return error('Write a message first.');if(d.type==='picture'&&!d.image)return error('Choose a picture first.');if(d.type==='gift'&&!d.gift)return error('Choose a little something first.')}if(key==='timing'&&d.when!==null&&(!d.when||Date.parse(d.when)<=Date.now()))return error('Choose a future time.');if(key!=='preview'){flow.step++;renderFlow();return}const problem=validateMessage(d);if(problem)return error(problem);if(window.Pigeon)return nativeTest(d);d.outbound=true;if(d.when){state.scheduled.push({...d,id:createId()});if(!persist()){state.scheduled.pop();return}render();flow={type:'result',title:'Pigeon booked.',message:'Your local test is scheduled. It will run while this page is open, or when you return.'};renderFlow();return}await deliver(d);return}
if(flow.type==='defaults'){if(flow.step===0){flow.step++;renderFlow()}else{state.defaults={...flow.draft};persist();close();toast('Default style saved.')}return}
if(flow.type==='friend'){const f=state.friends.find(x=>x.id===flow.id);f.ring=!!flow.ring;persist();render();close();return}
if(flow.type==='schedule-setting'){state.scheduling=flow.enabled;persist();render();close();return}
if(flow.type==='reply'){if(!flow.text?.trim())return error('Write a reply first.');const m=makeMessage({type:'message',text:flow.text,frame:flow.message.frame,colour:flow.message.colour});m.sender=state.profile.name;m.read=true;flow.message.read=true;delete flow.message.snoozeUntil;state.inbox.push(m);if(!persist()){state.inbox.pop();return}render();close();toast('Test reply saved here.');return}}
async function deliver(draft){flow={type:'sending'};renderFlow();await new Promise(resolve=>setTimeout(resolve,650));if(!state.receiving){flow={type:'result',title:'Delivery paused.',message:'This device is not open to mail. Turn receiving on and try again.'};renderFlow();return}const message=makeMessage(draft);message.sender=recipientName(draft.recipient);if(draft.outbound||draft.when)message.recipient=draft.recipient;state.inbox.push(message);if(!persist()){state.inbox.pop();flow={type:'result',title:'Could not save the test.',message:'Device storage is unavailable or full. No receipt was saved.'};renderFlow();return}render();flow=receive(message);renderFlow()}
async function test(){if(window.Pigeon){
  try{
    const {loadSheet}=await import('./shop/compositor.mjs');
    const art=await loadSheet('assets/guest/162.svg');
    const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=2688;
    const width=1140,height=width*art.naturalHeight/art.naturalWidth;
    canvas.getContext('2d').drawImage(art,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
    return await nativeTest({recipient:'owen',image:canvas.toDataURL('image/png'),text:'Your post pigeon',type:'picture',kind:'a sticker'});
  }catch{toast('Could not prepare the test sticker. Try again.');return;}
}if(!state.receiving){start({type:'blocked'});return}start({type:'sending'});deliver({recipient:'owen',type:'picture',image:testPigeon,text:'Your post pigeon',...state.defaults})}
async function nativeTest(d){
  let image=d.image;
  if(!image||(!image.startsWith('data:image/png;')&&image!==testPigeon)){
    const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;
    const ctx=canvas.getContext('2d');
    if(image){const img=new Image();img.src=image;await img.decode();const scale=Math.min(600/img.width,600/img.height);ctx.drawImage(img,(600-img.width*scale)/2,(600-img.height*scale)/2,img.width*scale,img.height*scale);}
    else{ctx.fillStyle='#fbe9c8';ctx.beginPath();ctx.roundRect(15,120,570,360,36);ctx.fill();ctx.fillStyle='#284837';ctx.textAlign='center';const words=d.type==='gift'?d.gift:d.text;const lines=words.match(/[\s\S]{1,32}/g)||[];const size=Math.min(28,Math.floor(330/Math.max(lines.length,1)));ctx.font='bold '+size+'px sans-serif';lines.forEach((line,i)=>ctx.fillText(line,300,300+(i-(lines.length-1)/2)*size,530));}
    image=canvas.toDataURL('image/png');
  }
  const result=Pigeon.queue(JSON.stringify({image,kind:d.kind||'a parcel',sender:recipientName(d.recipient),senderCode:d.recipient==='self'?'self':'',text:d.text||'',when:d.when?Date.parse(d.when):0}));
  if(result!=='ok'){toast(result);return;}
  const text=d.when?'Saved in Phone inbox & schedules for '+formatTime(Date.parse(d.when))+'.':'Switch to another app now. Your test starts in five seconds.';
  start({type:'result',title:d.when?'Pigeon booked.':'Pigeon on its way.',message:text+(d.when&&!Pigeon.precise()?' Enable precise schedules in Phone permissions for exact timing.':'')});
}
function compose(){start({type:'send',step:0,draft:{recipient:'',type:'',text:'',image:'',gift:'',...state.defaults,when:null}})}
app.addEventListener('change',e=>{if(e.target.id==='theme'){state.theme=e.target.checked?'dark':'light';applyTheme();persist()}if(e.target.id==='receiving'){state.receiving=e.target.checked;window.Pigeon?.receiving(state.receiving);persist();
  const sign=e.target.closest('.header-board');
  sign.dataset.open=String(state.receiving);
  sign.querySelector('.mail-status-art').src='assets/home/mail-'+(state.receiving?'open':'closed')+'.webp'}});
app.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;if(a==='local-folder'){localFolder=b.dataset.id;render();return}
 if(a==='sent-detail'){const m=[...state.inbox,...state.scheduled].find(row=>row.id===b.dataset.id);if(m)start({type:'sent-detail',message:m});return}
 if(a==='phone-design'){if(window.startPigeonReview){tab='home';render();window.startPigeonReview();}else openPhoneStudio();return}if(a==='tab'){if(tab===b.dataset.id)return;tab=b.dataset.id;render(true);return}if(window.Pigeon){if(a==='permissions')return Pigeon.settings();if(a==='test-link')return Pigeon.invite();if(a==='phone-history')return Pigeon.history();}if(a==='test')return test();if(a==='compose')return compose();if(a==='rail'){const row=b.parentElement.querySelector('.postal-row');row.scrollBy({left:Number(b.dataset.id)*Math.max(64,row.clientWidth/2),behavior:'smooth'});return}if(a==='art-uploads')return openArtworkUploads();if(a==='shop-scroll'){const row=app.querySelector('.post-home-items');row.scrollBy({left:Number(b.dataset.id)*row.clientWidth,behavior:'smooth'});return}if(a==='shop')return openShop((image,label,category,_reopen,uploadedKind)=>start({type:'send',step:0,draft:{prepared:true,kind:uploadedKind||({Photos:'a framed photo',Stickers:'a sticker','Love notes':'a love note',Flowers:'flowers',Postcards:'a postcard',Notes:'a note',Messages:'a message',Jokes:'a joke'})[category]||'a parcel',recipient:'',type:'picture',image,text:label,gift:'',...state.defaults,when:null}}),b.dataset.id,{studio:true});if(a==='connect')return social.connect();if(a==='invitation')return social.invitation();if(a==='friend')return start({type:'friend',id:b.dataset.id,step:0});if(a==='read'){const m=state.inbox.find(m=>m.id===b.dataset.id);m.read=true;persist();render();return start({type:'incoming',message:m})}if(a==='cancel-scheduled'){state.scheduled=state.scheduled.filter(m=>m.id!==b.dataset.id);persist();render();toast('Scheduled test cancelled.');return}if(a==='profile')return social.profile();if(a==='defaults')return start({type:'defaults',step:0,draft:{...state.defaults}});if(a==='schedule-setting')return start({type:a,enabled:state.scheduling});start({type:a})});
dialog.addEventListener('input',e=>{if(!flow)return;const id=e.target.id;if(flow.type==='send'){if(id==='message')flow.draft.text=e.target.value;if(id==='when')flow.draft.when=e.target.value}if(id==='name'&&flow.type==='profile')flow.name=e.target.value;if(id==='friend-code'&&flow.type==='connect')flow.code=e.target.value.toUpperCase();if(id==='reply'&&flow.type==='reply')flow.text=e.target.value});
dialog.addEventListener('change',e=>{if(flow?.type!=='send')return;if(e.target.matches('[data-local-recipient]')){flow.draft.recipient=e.target.value;return;}if(e.target.name==='local-time'){flow.draft.when=e.target.value==='now'?null:'';renderFlow();return;}if(e.target.id!=='photo')return;const file=e.target.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))return error('Choose a PNG, JPG, WebP or GIF image.');if(file.size>2*1024*1024)return error('Choose a picture under 2 MB.');const active=flow;const reader=new FileReader();reader.onload=()=>{if(flow!==active)return;flow.draft.image=String(reader.result);renderFlow()};reader.onerror=()=>{if(flow===active)error('That picture could not be read.');};reader.readAsDataURL(file)});
dialog.addEventListener('click',e=>{const b=e.target.closest('[data-flow]');if(!b||!flow)return;const action=b.dataset.flow;if(action==='cancel')return cancel();if(action==='done')return close();if(action==='discard'){flow.confirmCancel=false;close();return}if(action==='keep'){flow.confirmCancel=false;renderFlow();return}if(action==='choose'){const{key,value}=b.dataset;if(flow.type==='send'){if(key==='timing')flow.draft.when=value==='now'?null:'';else{const previous=flow.draft[key];flow.draft[key]=value;if(key==='type'&&previous!==value){flow.draft.text='';flow.draft.image='';flow.draft.gift=''}}}if(flow.type==='defaults')flow.draft[key]=value;if(flow.type==='schedule-setting')flow.enabled=value==='on';if(flow.type==='friend')flow.ring=value==='on';renderFlow();return}if(action==='back'){if(flow.type==='reply'){flow={type:'incoming',message:flow.message}}else if(flow.type==='friend')flow.step=0;else flow.step=Math.max(0,flow.step-1);renderFlow();return}if(action==='next')return next();if(action==='send-friend'){const f=state.friends.find(f=>f.id===flow.id);if(!f?.open)return;start({type:'send',step:1,draft:{recipient:f.id,type:'',text:'',image:'',gift:'',...state.defaults,when:null}});return}if(action==='ring-pref'){flow.step=1;flow.ring=state.friends.find(x=>x.id===flow.id).ring;renderFlow();return}if(action==='enable'){state.receiving=true;persist();render();close();return test()}if(action==='reply'){flow={type:'reply',message:flow.message,text:''};renderFlow();return}if(action==='snooze'){flow.message.snoozeUntil=Date.now()+5*60*1000;persist();render();close();toast('Snoozed for 5 minutes on this device.');return}if(action==='dismiss'){flow.message.read=true;delete flow.message.snoozeUntil;persist();render();close()}});
dialog.addEventListener('cancel',e=>{e.preventDefault();if(flow?.type!=='sending')cancel()});
let touchStart=null;dialog.addEventListener('pointerdown',e=>{if(flow?.type==='incoming'&&!e.target.closest('button,input,textarea'))touchStart={x:e.clientX,y:e.clientY};else touchStart=null});dialog.addEventListener('pointerup',e=>{if(touchStart&&Math.abs(e.clientX-touchStart.x)>95&&Math.abs(e.clientY-touchStart.y)<65&&flow?.type==='incoming')dialog.querySelector('[data-flow=dismiss]')?.click();touchStart=null});
function catchUp(){if(document.querySelector('[data-review-ui="freeze"][open]')||dialog.open||document.querySelector('#parcel-shop').open||document.querySelector('#social-flow').open||!state.receiving)return;const now=Date.now();const snoozed=state.inbox.find(m=>m.snoozeUntil&&m.snoozeUntil<=now);if(snoozed){delete snoozed.snoozeUntil;persist();start(receive(snoozed));return}const queued=state.scheduled.find(m=>Date.parse(m.when)<=now);if(queued){state.scheduled=state.scheduled.filter(m=>m.id!==queued.id);persist();start({type:'sending'});deliver(queued)}}
for(const [id,name,open] of demoPeople){
  if(!state.friends.some(f=>f.id===id))state.friends.push({id,name,open,popups:true,ring:false,demo:true});
}
const social=installSocial(state,persist,render);
function queueRequestPrompt(){requestAnimationFrame(()=>requestPrompts?.pump());}
requestPrompts=createRequestPrompts({requests:pendingFriendRequests,available:()=>Boolean(window.pigeonAppReady&&!document.hidden&&!flow&&!document.getElementById('app-loading')&&!document.querySelector('dialog[open],#phone-studio,input:focus,textarea:focus,select:focus,[contenteditable="true"]:focus')),open:request=>{tab='inbox';render();openFriendRequests(render,request);}});
document.addEventListener('close',()=>{pageCache.delete('inbox');if(tab==='inbox')render();queueRequestPrompt();},true);
document.addEventListener('focusout',queueRequestPrompt);
window.addEventListener('friend-requests-changed',()=>{updateUnreadBadge();pageCache.delete('inbox');if(tab==='inbox'&&!document.querySelector('dialog[open]'))render();queueRequestPrompt();});
window.refreshMailbox=()=>phoneCache.refresh().catch(()=>{});
let mailPaint;window.addEventListener('phone-mail-updated',()=>{cancelAnimationFrame(mailPaint);mailPaint=requestAnimationFrame(()=>{updateUnreadBadge();pageCache.delete('inbox');if(tab==='inbox'&&!document.querySelector('dialog[open]'))render();queueRequestPrompt();});});
window.openParcelAction=async id=>{if(id!=='@settings')await phoneCache.refresh().catch(()=>{});if(id==='@settings'){tab='settings';render();return;}tab='inbox';render();if(id==='@friends')friendsWindow(render);else if(id.startsWith('@inbox:'))openMailboxItem(id.slice(7),render);else replyTo(id,render);};
if(window.Pigeon){state.receiving=Pigeon.isOpen();
  phoneCache.refresh().catch(()=>{});refreshFriends().catch(()=>{});setInterval(()=>{if(!document.hidden){refreshFriends().catch(()=>{});retryFriendProfile().catch(()=>{});}},15000);
  // Keep mailbox receipts current while the list is visible, including deliveries after Send.
  setInterval(()=>{if(tab==='inbox'&&!document.hidden)refreshFriends().catch(()=>{});},3000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){requestPrompts.reset();publishFriendProfile(state.profile).catch(()=>{});phoneCache.refresh().finally(queueRequestPrompt).catch(()=>{});refreshFriends().catch(()=>{});}});
}
if(!window.Pigeon&&new URLSearchParams(location.search).get('review')==='settings')tab='settings';
window.refreshDeliverySettings=()=>{requestPrompts.reset();publishFriendProfile(state.profile).catch(()=>{});phoneCache.refresh().finally(queueRequestPrompt).catch(()=>{});if(tab==='settings')wireSettings(app);else pageCache.delete('settings');refreshArtwork();};
window.addEventListener('shared-art-updated',()=>{
 updateUnreadBadge();
 pageCache.delete('home');if(tab==='home')mountHomeWheel();
});
function refreshArtwork(){if(!document.hidden)refreshMainArt().catch(()=>{});}
document.addEventListener('visibilitychange',refreshArtwork);
window.addEventListener('online',refreshArtwork);
window.addEventListener('online',()=>publishFriendProfile(state.profile).catch(()=>{}));
render();refreshArtwork();setTimeout(catchUp,600);setInterval(catchUp,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)catchUp()});

window.pigeonBack=()=>{
  const photoViewer=document.querySelector('#profile-photo-viewer[open]');if(photoViewer){photoViewer.close();return true;}
  if(window.pigeonReviewBack?.())return true;
  const upload=document.querySelector('#art-upload[open]');if(upload){upload.close();return true;}
  if(homeColours.close())return true;
  if(closePhoneStudio())return true;
  const top=document.activeElement?.closest('dialog[open]');
  if(top?.id==='mail-window'){
    const back=top.querySelector('[data-mb=back],[data-mb=edit]');if(back)back.click();else top.close();return true;
  }
  if(backInShop())return true;
  const mail=document.querySelector('#mail-window');
  if(mail.open){mail.close();return true;}
  const socialDialog=document.querySelector('#social-flow');
  if(socialDialog.open){const back=socialDialog.querySelector('[data-prev]');if(back)back.click();else socialDialog.close();return true;}
  if(dialog.open){const back=dialog.querySelector('[data-flow=back]');if(back)back.click();else cancel();return true;}
  if(tab!=='home'){tab='home';render();return true;}
  return false;
};

if(document.documentElement.dataset.workroom==='arrival')window.previewArrival=()=>start({type:'arrival',message:{type:'picture',image:testPigeon,sender:'Sample sender',text:'Preview delivery'}});

window.pigeonPrepareDesignReload=()=>{
 if(document.hidden||flow||document.querySelector('dialog[open],#phone-studio,details[open],input:focus,textarea:focus,select:focus,[contenteditable="true"]:focus'))return false;
 if(document.querySelector('[data-review-ui="dock"]')?.shadowRoot?.querySelector('.switch[aria-checked="true"]'))return false;
 try{sessionStorage.setItem('pigeon.design.return-tab',tab);}catch{}
 document.body.inert=true;
 return true;
};
window.pigeonAppReady=true;
