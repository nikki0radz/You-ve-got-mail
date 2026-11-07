const defaults={fullPopup:true,onUnlock:true,closedInbox:true,warning:true,warningSeconds:3,friendAlerts:false,backdropOpacity:70};
let preview={...defaults};
try{
  const saved=JSON.parse(localStorage.getItem('pigeon.backdrop')||'{}');
  if(Number.isInteger(saved.backdropOpacity)&&saved.backdropOpacity>=0&&saved.backdropOpacity<=100)preview.backdropOpacity=saved.backdropOpacity;
}catch{}
function read(){return window.Pigeon?.deliveryPrefs?JSON.parse(Pigeon.deliveryPrefs()):preview;}
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
  section('delivery','Delivery','Choose what happens when a parcel arrives.',
    select('fullPopup','When open',[['true','Full pop-up'],['false','Notification only']])+toggle('onUnlock','Open one second after unlock')+
    select('closedInbox','When closed',[['true','Inbox only'],['false','Completely closed']]))+
  section('alerts','Alerts','Warnings, timing and friend updates.',
    toggle('warning','Warn before a pop-up')+select('warningSeconds','Warning time',[[3,'3 seconds'],[10,'10 seconds'],[15,'15 seconds']])+toggle('friendAlerts','Friend status changes'))+
  section('phone','Phone & appearance','Set the backdrop and check phone permissions.',
    '<label class="setting-field backdrop-strength"><span>Black backdrop opacity</span><output data-opacity for="backdrop-alpha"></output><input type="range" id="backdrop-alpha" data-pref="backdropOpacity" min="0" max="100" step="1"></label>'+
    (native?'<button class="setting-pill" data-action="test">Test over another app</button><p class="setting-hint">Tap Test, then go to your home screen. Use Full pop-up and switch Open to mail on first.</p><div class="permission-list" data-base-look="permissionactions-1" data-review-look="permissionactions-1">'+action('overlay','Display over apps')+action('notifications','Phone notifications')+action('warningChannel','Warning banner settings')+action('precise','Precise schedules')+'</div>':'<p class="setting-hint">Open the Android app to test a parcel over another app.</p>'))+
  section('account','Profile & invitations','Your pigeon and one-time links.',link('profile','Your profile','Change your name or pigeon.')+link('test-link','One-time link','Invite someone to send you a parcel.'))+
  (native?section('design','Design Mode','Try your laptop layout on this phone.',link('phone-design','Design Home on this phone','Tap the live home screen to change colours or leave comments.')+action('design','Open laptop draft')+'<p class="setting-hint">Open the laptop editor, copy its pairing key, then enter it here.</p><span data-forget>'+action('designForget','Disconnect laptop')+'</span>'):'')+
  section('about','Testing & updates','App version and delivery checks.',(native?action('updates','Check for updates')+action('listen','Listen for 30 minutes'):link('schedule-setting','Test scheduling','Set a time for a local test.'))+link('about','About Pigeon Post','About this test edition.'))+'</section>';
}
export function wireSettings(root){
  const panel=root.querySelector('.post-settings');if(!panel)return;
  const native=Boolean(window.Pigeon?.deliveryPrefs);
  const sync=()=>{
    const s=read();for(const field of panel.querySelectorAll('[data-pref]')){
      const k=field.dataset.pref;if(field.type==='checkbox')field.checked=s[k];else field.value=String(s[k]);
      field.disabled=(k==='onUnlock'&&!s.fullPopup)||(k==='warningSeconds'&&!s.warning);
    }
    panel.querySelector('[data-opacity]').value=s.backdropOpacity+'%';
    if(native){
      panel.querySelector('[data-forget]').hidden=!Pigeon.designPaired?.();
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
