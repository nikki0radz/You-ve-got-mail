import { escapeHtml as esc, collectionName } from '../domain.mjs';

const folder='assets/home/';
export const demoPeople=[
  ['owen','Owen',true],['sophie','Sophie',false],['mia','Mia',true],['alex','Alex',false],['sam','Sam',true]
];
export function profilePhoto(profile){
  const src=profile.photo||'';
  return (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)||/^assets\/home\/mascot\.webp$/.test(src))?src:folder+'mascot.webp';
}
export function header(state){
  return `<header class="postal-header"><strong>You've Got Mail!</strong><label class="postal-theme">
    <input id="theme" type="checkbox" role="switch" aria-label="Dark mode" ${state.theme==='dark'?'checked':''}>
    <span class="sun" aria-hidden="true"></span><span class="moon" aria-hidden="true"></span></label>
    <button class="profile-link" data-action="profile"><img src="${profilePhoto(state.profile)}" alt="">My profile</button></header>`;
}
export function home(state){
  const on=state.receiving;
  return `<section class="header-board" data-open="${on}"><div class="courier-stand post-office-home"><img class="post-office-art" src="${folder}post-office.png" alt="Pigeon at the post office"><div class="post-office-controls" role="group" aria-label="Receiving mail"><input id="receiving" type="checkbox" ${on?'checked':''} hidden><button type="button" data-set-open="yes" aria-pressed="${on}"><span aria-hidden="true">✉</span> Open to mail</button><button type="button" data-set-open="no" aria-pressed="${!on}"><span aria-hidden="true">⊘</span> Closed</button></div></div></section><div id="home-wheel"></div>`;
}
export function wireRails(root){
  const board=root.querySelector('.header-board');if(!board)return;
  for(const btn of board.querySelectorAll('[data-set-open]'))btn.onclick=()=>{
    const field=board.querySelector('#receiving');field.checked=btn.dataset.setOpen==='yes';field.dispatchEvent(new Event('change',{bubbles:true}));
  };
}
