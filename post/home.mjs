import {stylePicker,wireStyle} from './style-choices.mjs';
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
  return `<section class="header-board" data-open="${on}"><div class="courier-stand"><img src="${folder}mascot.webp" alt="Pigeon courier with a messenger bag"><label class="mail-sign"><input id="receiving" type="checkbox" role="switch" ${on?'checked':''}><span aria-hidden="true">${on?'●':'⊘'}</span> ${on?'Open to mail':'Closed to mail'}</label><div class="side-signs"><button data-set-open="yes" aria-pressed="${on}">● Open</button><button data-set-open="no" aria-pressed="${!on}">⊘ Closed</button></div></div>${stylePicker('header','Header',['Post office window','Left and right signs','Counter stamp','Hanging sign'])}</section><div id="home-wheel"></div><div class="home-actions"><button data-action="test">Send test</button><button data-action="test-link">One-time link</button></div>`;
}
export function wireRails(root){
  const board=root.querySelector('.header-board');if(!board)return;
  wireStyle(board,'header',i=>{board.dataset.layout=i;});
  for(const btn of board.querySelectorAll('[data-set-open]'))btn.onclick=()=>{
    const field=board.querySelector('#receiving');field.checked=btn.dataset.setOpen==='yes';field.dispatchEvent(new Event('change',{bubbles:true}));
  };
}
