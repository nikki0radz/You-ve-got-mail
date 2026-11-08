import {pages} from './pages.mjs';
const key=new URLSearchParams(location.search).get('page'),guest=pages[key]?.[1]==='One-time link';
if(!pages[key])throw Error('Unknown preview page');
// The real app screens run against disposable example data in this document.
const values=new Map();
Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)}});
const html=new DOMParser().parseFromString(await (await fetch(guest?'guest.html?v=032':'index.html?v=032')).text(),'text/html');
const css=[...html.querySelectorAll('link[rel=stylesheet]')].map(link=>new Promise(ok=>{const el=document.createElement('link');el.rel='stylesheet';el.onload=ok;el.onerror=ok;el.href=link.getAttribute('href');document.head.append(el);}));
html.querySelectorAll('script').forEach(n=>n.remove());document.body.replaceChildren(...html.body.childNodes);
await Promise.all(css);
if(key==='home'||key==='dispatch'){
  const review=document.createElement('link');review.rel='stylesheet';review.href='design/parcel-round.css';document.head.append(review);
}
const click=s=>document.querySelector(s)?.click();
if(guest){
  document.documentElement.dataset.workroom=key;document.documentElement.dataset.theme='light';
  await import('../post/guest.mjs?studio=pages1');
}else{
  const people={friends:[{name:'Owen',code:'POSTSAMPLE',mode:'open',photo:'assets/home/owen.webp'},{name:'Sophie',code:'SOPHIEDEMO',mode:'open',photo:'assets/home/sophie.webp'},{name:'Alex',code:'ALEXDEMO01',mode:'closed',photo:'assets/home/alex.webp'}],incoming:[],outgoing:[],me:{code:'SAMPLECODE'}};
  const mail=[{id:'sample',sender:'Owen',kind:'A postcard',status:'received',created:Date.UTC(2026,0,1,12),when:Date.UTC(2026,0,1,12)},{id:'out',sent:true,sender:'Owen',kind:'A sticker',created:Date.UTC(2026,0,2,12),when:Date.UTC(2026,0,2,12)}];
  const prefs={fullPopup:true,onUnlock:true,warning:true,warningSeconds:3,closedInbox:true,backdropOpacity:70};
  const hint=()=>{const n=document.querySelector('#notice');n.textContent='Device action · preview only';n.classList.add('visible');setTimeout(()=>n.classList.remove('visible'),1600)};
  window.Pigeon={mailbox:()=>JSON.stringify(mail),friendsCached:()=>JSON.stringify(people),wasRead:()=>false,markRead:()=>{},isOpen:()=>true,receiving:()=>{},name:()=>{},setTheme:()=>{},designPaired:()=>false,
    deliveryPrefs:()=>JSON.stringify(prefs),deliverySetting:(k,v)=>prefs[k]=v==='true'||v==='false'?v==='true':isNaN(v)?v:Number(v),
    settingsAction:hint,settings:hint,invite:hint,history:hint,queue:()=> 'ok',precise:()=>true,cancelScheduled:hint,
    post:(id,op)=>queueMicrotask(()=>window.postOfficeResult(id,JSON.stringify(op==='friends'?{data:people}:{error:'Device action · preview only'})))};
  document.documentElement.dataset.workroom=key;
  await import('../app.js');
  if(document.querySelector('#theme')?.checked)click('#theme');
  if(['inbox','sent','thread','friends','reply','quick','replyPicker'].includes(key))click('[data-action=tab][data-id=inbox]');
  if(key==='sent')click('[data-folder=sent]');
  if(key==='friends')click('[data-book]');
  if(['thread','reply','quick','replyPicker'].includes(key))click('[data-row=sample]');
  if(['reply','quick','replyPicker'].includes(key))click('[data-mb=reply]');
  if(key==='replyPicker')click('[data-mb=sticker]');
  if(key==='quick')click('[data-mb=text]');
  if(['profile','avatar','rename'].includes(key))click('[data-action=profile]');
  if(key==='avatar')click('[data-social=change]');
  if(key==='rename')click('[data-social=edit]');
  if(key==='arrival')window.previewArrival?.();
  if(['recipient','schedule','posted'].includes(key)){
    const {composeFrom}=await import('../post/mailbox.mjs');
    await composeFrom('Postcards',()=>{}, {image:'assets/guest/105.svg',name:'Open scrapbook'});
    if(key==='schedule')click('[name=post-time][value=later]');
    if(key==='posted')click('[data-mb=send]');
  }
  if(['settings','defaults','about'].includes(key))click('[data-action=tab][data-id=settings]');
  if(key==='defaults'){
    const button=document.createElement('button');button.dataset.action='defaults';
    document.querySelector('#app').append(button);button.click();button.remove();
  }
  if(key==='about')click('[data-action=about]');

}
await import('./page-surface.mjs');
