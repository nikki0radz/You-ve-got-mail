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
  return `<section class="mail-counter"><img src="${folder}mascot.webp" alt="Pigeon courier with a messenger bag"><label><input id="receiving" type="checkbox" role="switch" ${on?'checked':''}><span>${on?'Open to mail':'Closed to mail'}</span></label></section><div id="home-wheel"></div><div class="home-actions"><button data-action="test">Send test</button><button data-action="test-link">One-time link</button></div>`;
}
export function wireRails(){}
