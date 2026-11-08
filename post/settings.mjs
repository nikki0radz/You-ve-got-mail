import {themeToggle} from './home.mjs';
const defaults={fullPopup:true,onUnlock:true,closedInbox:true,warning:true,warningSeconds:3,friendAlerts:false,replyAlerts:true,backdropOpacity:70};
let preview={...defaults};
try{
  const saved=JSON.parse(localStorage.getItem('pigeon.backdrop')||'{}');
  if(Number.isInteger(saved.backdropOpacity)&&saved.backdropOpacity>=0&&saved.backdropOpacity<=100)preview.backdropOpacity=saved.backdropOpacity;
}catch{}
function read(){return window.Pigeon?.deliveryPrefs?{...defaults,...JSON.parse(Pigeon.deliveryPrefs())}:preview;}
export function backdropOpacity(){return read().backdropOpacity??defaults.backdropOpacity;}
const link=(action,title,copy)=>'<button type="button" data-action="'+action+'" class="setting-link"><span><strong>'+title+'</strong><small>'+copy+'</small></span><i aria-hidden="true">›</i></button>';
const action=(key,title)=>'<button type="button" data-platform="'+key+'" class="setting-pill">'+title+'</button>';
const select=(key,label,choices)=>'<label class="setting-field"><span>'+label+'</span><select data-pref="'+key+'">'+choices.map(([v,n])=>'<option value="'+v+'">'+n+'</option>').join('')+'</select></label>';
const toggle=(key,label)=>'<label class="setting-field"><span>'+label+'</span><input type="checkbox" role="switch" data-pref="'+key+'"></label>';
const section=(id,name,summary,body)=>'<details class="post-setting" data-section="'+id+'"><summary><span><b>'+name+'</b><small>'+summary+'</small></span></summary><div class="setting-body">'+body+'</div></details>';
export function settingsPage(){
  const native=Boolean(window.Pigeon?.deliveryPrefs);
  return '<section class="post-settings" data-review-look="settingsbuttons-3" data-base-look="settingsbuttons-3"><header><div><small>PIGEON POST</small><h1>Settings</h1><p>Your rules for incoming mail.</p></div><img src="assets/home/mascot.webp" alt=""></header>'+
  (!native?'<p class="settings-preview">Browser preview · changes apply here only.</p>':'')+
  '<div class="settings-appearance"><b>Appearance</b>'+themeToggle(document.documentElement.dataset.theme)+'</div>'+
  link('art-uploads','Artwork manager','Upload PNGs and organise the main library.')+
  section('delivery','Delivery','Choose what happens when a parcel arrives.',
    select('fullPopup','When open',[['true','Full pop-up'],['false','Notification only']])+toggle('onUnlock','Open one second after unlock')+
    select('closedInbox','When closed',[['true','Inbox only'],['false','Completely closed']]))+
  section('alerts','Alerts','Warnings, timing and friend updates.',
    toggle('warning','Warn before a pop-up')+select('warningSeconds','Warning time',[[3,'3 seconds'],[10,'10 seconds'],[15,'15 seconds']])+toggle('friendAlerts','Friend status changes')+toggle('replyAlerts','Reply notifications'))+
  section('phone','Phone & appearance','Set the backdrop and check phone permissions.',
    '<label class="setting-field backdrop-strength"><span>Black backdrop opacity</span><output data-opacity for="backdrop-alpha"></output><input type="range" id="backdrop-alpha" data-pref="backdropOpacity" min="0" max="100" step="1"></label>'+
    (native?'<div class="permission-list" data-base-look="permissionactions-5" data-review-look="permissionactions-5">'+(read().permissionSetup?action('deliverySetup','Delivery setup'):'')+action('overlay','Display over apps')+action('notifications','Phone notifications')+action('warningChannel','Warning banner settings')+action('precise','Precise schedules')+'</div>':'<p class="setting-hint">Open the Android app to receive parcels over other apps.</p>'))+
  section('account','Profile & invitations','Your pigeon and one-time links.',link('profile','Your profile','Change your name or pigeon.')+link('test-link','One-time link','Invite someone to send you a parcel.'))+
  section('about','About & updates','A quick guide and your installed version.',(native?action('updates','Check for updates'):'')+link('about','About Pigeon Post','What it does and how to use it.'))+'</section>';
}
export function wireSettings(root){
  const panel=root.querySelector('.post-settings');if(!panel)return;
  const native=Boolean(window.Pigeon?.deliveryPrefs);
  for(const select of panel.querySelectorAll('select[data-pref]')){
    select.hidden=true;
    // Android refreshes preferences on resume and after permission changes.
    // Reuse the control so repeated refreshes preserve its focus and open state.
    const menus=select.parentElement.querySelectorAll(':scope > .setting-dropdown');
    if(menus.length){for(const extra of [...menus].slice(1))extra.remove();continue;}
    const menu=document.createElement('details');menu.className='setting-dropdown';
    const heading=document.createElement('summary');menu.append(heading);
    const list=document.createElement('div');list.setAttribute('role','listbox');list.setAttribute('aria-label',select.closest('label').querySelector('span').textContent);
    for(const option of select.options){
      const b=document.createElement('button');b.type='button';b.textContent=option.textContent;b.setAttribute('role','option');b.dataset.value=option.value;
      b.onclick=e=>{e.preventDefault();select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));menu.open=false;heading.focus();};list.append(b);
    }
    menu.append(list);select.after(menu);
  }
  const sync=()=>{
    const s=read();for(const field of panel.querySelectorAll('[data-pref]')){
      const k=field.dataset.pref;if(field.type==='checkbox')field.checked=s[k];else field.value=String(s[k]);
      field.disabled=(k==='onUnlock'&&!s.fullPopup)||(k==='warningSeconds'&&!s.warning);
      if(field.tagName==='SELECT'){const menu=field.nextElementSibling;menu.querySelector('summary').textContent=field.selectedOptions[0].textContent;menu.querySelector('summary').setAttribute('aria-disabled',String(field.disabled));menu.ontoggle=()=>{if(field.disabled)menu.open=false;};for(const b of menu.querySelectorAll('button')){b.disabled=field.disabled;b.setAttribute('aria-selected',String(b.dataset.value===field.value));}}
    }
    panel.querySelector('[data-opacity]').value=s.backdropOpacity+'%';
    if(native){
      for(const [key,caption,ok] of [['overlay','Display over apps',s.overlay],['notifications','Phone notifications',s.notifications],['precise','Precise schedules',s.precise]]){
        panel.querySelector('[data-platform='+key+']').textContent=caption+' · '+(ok?'On':'Set up');
      }
    }
  };
  panel.oninput=e=>{
    if(e.target.dataset.pref==='backdropOpacity')panel.querySelector('[data-opacity]').value=e.target.value+'%';
  };
  panel.onchange=e=>{
    const k=e.target.dataset.pref;if(!k)return;
    const value=e.target.type==='checkbox'?e.target.checked:k==='warningSeconds'||k==='backdropOpacity'?Number(e.target.value):e.target.value==='true';
    if(native)Pigeon.deliverySetting(k,String(value));
    else{
      preview={...preview,[k]:value};
      if(k==='backdropOpacity')try{localStorage.setItem('pigeon.backdrop',JSON.stringify({backdropOpacity:preview.backdropOpacity}));}catch{}
    }
    sync();
  };
  for(const btn of panel.querySelectorAll('[data-platform]'))btn.onclick=()=>Pigeon.settingsAction(btn.dataset.platform);
  sync();
}
