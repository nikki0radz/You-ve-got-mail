import {phoneCache} from './phone-cache.mjs';
import {escapeHtml as esc} from '../domain.mjs';
if(typeof document!=='undefined'&&!document.querySelector('[data-phone-finder-style]')){const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./phone-finder.css',import.meta.url).href;sheet.dataset.phoneFinderStyle='';document.head.append(sheet);}
const preferences=()=>{try{return JSON.parse(window.Pigeon?.deliveryPrefs?.()||'{}');}catch{return {};}};
export function phoneFinderControls(friend){
 const native=preferences().phoneFinderSupported===true,available=friend.settings?.phoneFinder===true;
 return '<section class="phone-finder"><h3>Find phone</h3><p>Ring their Android phone at full alarm volume for 30 seconds. Their phone must be online, open to mail and allow you to ring it.</p>'+
  '<button type="button" class="mb-button" data-mb="find-phone" '+(!available||!friend.canFindPhone||friend.mode!=='open'?'disabled':'')+'>Find phone</button>'+
  '<p>'+(available?(friend.canFindPhone?'They allow you to ring their phone.':'They need to allow you to ring their phone first.'):'They need the Android Find phone update.')+'</p>'+
  (native?'<button type="button" class="mb-button" data-mb="finder-permission">'+(friend.finderAllowed?'Allowed':'Off')+' · Let '+esc(friend.name)+' ring my phone</button>':'<p>To let friends ring this phone, install the Android Find phone update. iPhone and web cannot receive these alarms.</p>')+'</section>';
}
export function openFinderPermission(friend,{page,button,action,post,back}){
 const allowed=!friend.finderAllowed;
 page(allowed?'Let them ring your phone?':'Turn off phone finding?',
  '<p>'+esc(friend.name)+(allowed?' will be able to ring this phone at full alarm volume for up to 30 seconds, including when the ringer is silent.':' will no longer be able to ring this phone.')+'</p><p>Your receiving switch still controls this. Android Do Not Disturb alarm rules apply. You can stop ringing from the phone’s Find phone notification.</p>'+button('save-finder',allowed?'Allow ringing':'Turn off'),back);
 action('save-finder',async()=>{await post('finder-permission',{code:friend.code,allowed});await phoneCache.refreshFresh();back();});
}
export function openPhoneFinder(friend,{page,button,action,post,el,back}){
 page('Find '+friend.name+'’s phone?',
  '<p>This rings their phone at full alarm volume for up to 30 seconds. They can stop it from their notification.</p><p>Android Do Not Disturb alarm rules apply.</p>'+button('ring-now','Ring phone'),back);
 action('ring-now',async()=>{
  const result=await post('find-phone',{code:friend.code});
  page('Finding their phone','<p data-finder-status role="status">Ring request sent. Waiting for their phone…</p>'+button('done-finder','Done'));
  action('done-finder',()=>el().close());
  const target=el().querySelector('[data-finder-status]'),started=Date.now();let timer,stopped=false;
  const stop=()=>{stopped=true;clearTimeout(timer);};el().addEventListener('close',stop,{once:true});
  const labels={waiting:'Waiting for their phone to respond…',claimed:'Their phone received the request. Starting the alarm…',ringing:'Their phone started ringing. Listen out for it!',stopped:'Ringing stopped.',declined:'Their phone declined the ring. Check their receiving switch and permission.',unavailable:'Their phone could not start the alarm. Check its notification and sound settings.',expired:'Their phone did not respond in time. Check it is online and try again.'};
  const poll=async()=>{
   if(stopped||!target.isConnected||!el().open)return stop();
   try{
    const {status}=await post('find-status',{id:result.id});if(stopped||!target.isConnected)return;
    target.textContent=labels[status]||'Checking ring status…';
    if(!['waiting','claimed','ringing'].includes(status))return stop();
   }catch{if(target.isConnected)target.textContent='Could not check ring status. Reconnecting…';}
   if(Date.now()-started>75000){target.textContent='Ring status could not be confirmed. Any ringing stops automatically after 30 seconds.';return stop();}
   timer=setTimeout(poll,2000);
  };poll();
 });
}
