import {catalogueRecords,catalogueImage,catalogueThumbnail} from '../shop/catalogue.mjs';
import {offerCamera} from '../shop/camera-choice.mjs';
import {birds} from './profile-options.mjs';
import {mainRecords,avatarSettings} from '../shop/main-art.mjs';
import {escapeHtml as esc} from '../domain.mjs';
import {profilePhoto} from './home.mjs';


function readImage(src){return new Promise((ok,no)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=()=>no(new Error('That image could not be opened.'));if(/^https?:/i.test(src))img.crossOrigin='anonymous';img.src=src;});}
function squarePhoto(image,rect,lossless=false){
  const canvas=document.createElement('canvas');const side=Math.min(768,Math.round(Math.min(rect[2],rect[3])));canvas.width=canvas.height=side;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,...rect,0,0,side,side);
  return lossless?canvas.toDataURL('image/png'):canvas.toDataURL('image/webp',.94);
}
export function installSocial(state,save,refresh){
  const dialog=document.getElementById('social-flow');
  let from,previousFocus,code='',choice=-1;
  const end=()=>dialog.close();
  dialog.onclose=()=>{previousFocus?.focus({preventScroll:true});};
  function show(title,body,back){
    if(!dialog.open){previousFocus=document.activeElement;dialog.showModal();}
    dialog.dataset.reviewScreen=title;
    dialog.innerHTML=`<header class="social-head">${back?'<button data-prev aria-label="Back"><span class="back-arrow" aria-hidden="true"></span> Back</button>':'<span></span>'}<button data-x aria-label="Close">×</button></header><h2>${esc(title)}</h2>${body}<p class="social-alert" role="alert"></p>`;
    dialog.querySelector('[data-x]').onclick=end;
    if(back)dialog.querySelector('[data-prev]').onclick=back;
    dialog.scrollTop=0;
  }
  const btn=(label,action,kind='main')=>`<button class="social-${kind}" data-social="${action}">${esc(label)}</button>`;
  const on=(action,handler)=>{dialog.querySelector('[data-social="'+action+'"]').onclick=handler;};
  const alert=text=>{dialog.querySelector('.social-alert').textContent=text;};
  function saveProfile(changes){
    const old=state.profile;state.profile={...old,...changes};
    if(!save()){state.profile=old;alert('Could not save your profile on this device.');return false;}
    refresh();profile();return true;
  }
  function profile(){
    show('My profile',`<figure class="photo-booth"><button type="button" class="profile-photo-open" data-social="enlarge" aria-label="Enlarge profile picture"><img src="${profilePhoto(state.profile)}" alt="Your profile picture"></button><figcaption>${esc(state.profile.name)}</figcaption></figure><div class="profile-number"><small>My friend code</small><strong>${esc(window.Pigeon?(JSON.parse(Pigeon.friendsCached()).me?.code||'Connecting…'):state.profile.code)}</strong></div>${btn('Change picture','change')}${btn('Edit name','edit','quiet')}`,from==='lookup'?lookup:null);
    on('enlarge',()=>{
      const trigger=dialog.querySelector('[data-social=enlarge]'),viewer=document.createElement('dialog');
      viewer.id='profile-photo-viewer';viewer.setAttribute('aria-label','Enlarged profile picture');
      viewer.innerHTML=`<button type="button" aria-label="Close enlarged profile picture">×</button><img src="${profilePhoto(state.profile)}" alt="${esc(state.profile.name)}’s profile picture">`;
      document.body.append(viewer);viewer.querySelector('button').onclick=()=>viewer.close();
      viewer.onclick=e=>{if(e.target===viewer)viewer.close();};
      viewer.onclose=()=>{viewer.remove();if(trigger.isConnected)trigger.focus({preventScroll:true});};
      viewer.showModal();
    });
    on('change',()=>{choice=Number.isInteger(state.profile.pigeon)?state.profile.pigeon:-1;wall();});
    on('edit',()=>{
      show('What should we call you?',`<label>Your name<input maxlength="40" class="social-input social-name" value="${esc(state.profile.name)}"></label>${btn('Save name','save')}`,profile);
      on('save',()=>{const name=dialog.querySelector('input').value.trim();if(!name)return alert('Enter a name first.');saveProfile({name});});
    });
  }
  async function wall(){
    const tiles=birds.map((n,i)=>avatarSettings().hidden.includes(i)?'':`<button class="bird-choice" data-index="${i}" aria-pressed="${choice===i}"><span aria-hidden="true" style="background-position:${i%6*20}% ${Math.floor(i/6)*25}%"></span>${esc(n)}</button>`).join('');
    const uploads=(await catalogueRecords({includeAvatars:true})).filter(row=>row.kind==='avatar');
    const extra=uploads.map(row=>`<button class="bird-choice" data-avatar="${esc(row.id)}" aria-pressed="false">${catalogueThumbnail(row.design)}${esc(row.name||'Profile picture')}</button>`).join('');
    show('Choose your profile picture',`<div class="bird-wall">${tiles}${extra}</div>${btn('Use this picture','use')}${btn('Choose a photo','upload','quiet')}<input type="file" accept="image/*" hidden>`,profile);
    for(const tile of dialog.querySelectorAll('[data-avatar]'))tile.onclick=async()=>{try{const row=uploads.find(r=>r.id===tile.dataset.avatar),img=await catalogueImage(row.design);const side=Math.min(img.width,img.height);saveProfile({photo:squarePhoto(img,[(img.width-side)/2,(img.height-side)/2,side,side],true),pigeon:-1});}catch(e){alert(e.message);}};
    const use=dialog.querySelector('[data-social=use]');use.disabled=choice<0||avatarSettings().hidden.includes(choice);
    for(const tile of dialog.querySelectorAll('.bird-choice[data-index]'))tile.onclick=()=>{choice=Number(tile.dataset.index);for(const b of dialog.querySelectorAll('.bird-choice'))b.setAttribute('aria-pressed',String(b===tile));use.disabled=false;};
    on('use',async()=>{const i=choice;try{const im=await readImage('assets/home/portraits.webp');if(use.isConnected&&dialog.open)saveProfile({pigeon:i,photo:squarePhoto(im,[i%6*160,Math.floor(i/6)*160,160,160],true)});}catch(e){alert(e.message);}});
    const input=dialog.querySelector('input');on('upload',()=>input.click());offerCamera(input,{uploadButton:dialog.querySelector('[data-social=upload]')});
    input.onchange=async()=>{const file=input.files[0];if(!file)return;const url=URL.createObjectURL(file);try{const im=await readImage(url);const edge=Math.min(im.width,im.height);if(input.isConnected&&dialog.open)saveProfile({pigeon:null,photo:squarePhoto(im,[(im.width-edge)/2,(im.height-edge)/2,edge,edge])});}catch(e){alert(e.message);}finally{URL.revokeObjectURL(url);}};
  }
  function lookup(){
    show('Add a friend',`<form class="code-form"><label>Their friend code<span class="code-wrap"><input class="social-input" name="code" value="${esc(code)}" placeholder="e.g. OWEN-27" autocomplete="off" maxlength="24"><i aria-hidden="true">✓</i></span></label><button class="social-main">Find friend</button></form>${btn('My code','mine','quiet')}<small class="local-note">Demo code · OWEN-27</small>`);
    dialog.querySelector('h2').classList.add('stamp-title');
    const form=dialog.querySelector('form'),field=form.elements.code;
    const update=()=>{code=field.value;const found=code.trim().toUpperCase()==='OWEN-27';form.dataset.found=String(found);form.querySelector('button').textContent=found?'View Owen':'Find friend';alert('');return found;};
    field.oninput=update;update();form.onsubmit=e=>{e.preventDefault();if(update())match();else alert(code.trim()?'No match. Try OWEN-27.':'Enter a friend code first.');};
    on('mine',()=>{from='lookup';profile();});
  }
  function match(){
    show('Found your pigeon!',`<img class="match-bird" src="assets/home/owen.webp" alt="Owen’s pigeon"><strong>Owen</strong><p>Ready to make the first move?</p>${btn('Send friend request','send')}<small class="local-note">Test request on this device</small>`,lookup);
    on('send',()=>{
      const prior=state.friendRequest;state.friendRequest={status:'pending',name:state.profile.name,photo:profilePhoto(state.profile)};
      if(!save()){state.friendRequest=prior;return alert('The request could not be saved.');}
      refresh();show('Request sent!',`<p>Your test request to Owen is in the local inbox.</p>${btn('Done','done')}${btn('Preview as recipient','preview','quiet')}`);
      on('done',end);on('preview',invitation);
    });
  }
  function invitation(){
    const request=state.friendRequest;if(!request)return end();
    if(request.status!=='pending')return outcome();
    show('Friend request',`<article class="royal-card"><em>please</em><img class="match-bird" src="${profilePhoto(request)}" alt="Sender’s pigeon"><h3>be my friend</h3><p>${esc(request.name)} requests the honour of your friendship.</p></article>${btn('Accept request','accept')}${btn('Decline','decline','quiet')}<small class="local-note">Owen’s view · local test</small>`);
    function respond(status){request.status=status;if(!save()){request.status='pending';return alert('Could not save this response.');}refresh();outcome();}
    on('accept',()=>respond('accepted'));on('decline',()=>respond('declined'));
  }
  function outcome(){
    const r=state.friendRequest;if(!r)return end();const yes=r.status==='accepted';
    show(yes?'Request accepted':'Request declined',`<img class="result-bird" src="assets/home/${yes?'happy':'sad'}.webp" alt="${yes?'Delighted':'Tearful'} pigeon"><p>${yes?'You and '+esc(r.name)+' are now friends.':esc(r.name)+' hasn’t been added to your friends.'}</p>${btn('Done','done')}<small class="local-note">Local test</small>`);on('done',end);
  }
  return {profile:()=>{from='home';profile();},connect:()=>{from='lookup';code='';lookup();},invitation};
}
