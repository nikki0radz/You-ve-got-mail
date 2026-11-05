import { escapeHtml as esc, collectionName } from '../domain.mjs';

const folder='assets/home/';
export const demoPeople=[
  ['owen','Owen',true],['sophie','Sophie',false],['mia','Mia',true],['alex','Alex',false],['sam','Sam',true]
];
export function profilePhoto(profile){
  const src=profile.photo||'';
  return (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)||/^assets\/home\/mascot\.webp$/.test(src))?src:folder+'mascot.webp';
}
export function header(state,showColours=false){
  return `<header class="postal-header"><strong>You've Got Mail!</strong><label class="postal-theme">
    <input id="theme" type="checkbox" role="switch" aria-label="Dark mode" ${state.theme==='dark'?'checked':''}>
    <span class="sun" aria-hidden="true"></span><span class="moon" aria-hidden="true"></span></label>
    ${showColours?'<button type="button" class="home-palette" data-home-colours aria-label="Change home colours" title="Change home colours"><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18h1.3a2.1 2.1 0 0 0 1.2-3.8 1.5 1.5 0 0 1 .9-2.7h1.3A4.3 4.3 0 0 0 21 10.2C21 6.1 17 3 12 3Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10" cy="6.9" r=".8"/><circle cx="14" cy="6.9" r=".8"/><circle cx="17" cy="9.5" r=".8"/></svg></button>':''}<button class="profile-link" data-action="profile"><img src="${profilePhoto(state.profile)}" alt="">My profile</button></header>`;
}
export function home(state){
  const on=state.receiving;
  return `<section class="header-board" data-open="${on}"><div class="courier-stand post-office-home"><img class="post-office-art" src="${folder}post-office.png" alt="Pigeon at the post office"><div class="post-office-controls"><label class="mail-toggle"><input id="receiving" type="checkbox" role="switch" aria-label="Open to mail" ${on?'checked':''}><span class="mail-toggle-track" aria-hidden="true"><span class="mail-toggle-glow"></span><span class="mail-toggle-option">✉ Open to mail</span><span class="mail-toggle-option">⊘ Closed</span></span></label></div></div></section><div id="home-wheel"></div>`;
}
export function wireRails(root){
  const label=root.querySelector('.mail-toggle'),input=root.querySelector('#receiving');if(!label||!input)return;
  let start=null,suppress=false;
  label.addEventListener('pointerdown',e=>{if(e.isPrimary)start={x:e.clientX,y:e.clientY};});
  label.addEventListener('pointerup',e=>{
    if(!start||!e.isPrimary)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;
    if(Math.abs(dx)<32||Math.abs(dx)<Math.abs(dy))return;
    const next=dx<0;suppress=true;e.preventDefault();
    if(input.checked!==next){input.checked=next;input.dispatchEvent(new Event('change',{bubbles:true}));}
  });
  label.addEventListener('pointercancel',()=>{start=null});
  label.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);
}
