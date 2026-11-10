import { escapeHtml as esc, collectionName } from '../domain.mjs';

const folder='assets/home/';
export const demoPeople=[
  ['owen','Owen',true],['sophie','Sophie',false],['mia','Mia',true],['alex','Alex',false],['sam','Sam',true]
];
export function profilePhoto(profile){
  const src=profile.photo||'';
  return (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)||/^assets\/home\/(?:mascot|owen|sophie|mia|alex|sam)\.webp$/.test(src))?src:folder+'mascot.webp';
}
export function themeToggle(theme){return '<label class="postal-theme"><input id="theme" type="checkbox" role="switch" aria-label="Dark mode" '+(theme==='dark'?'checked':'')+'><span class="sun" aria-hidden="true"></span><span class="moon" aria-hidden="true"></span></label>'; }
export function header(state,showColours=false,showTheme=true){
  return `<header class="postal-header"><strong>You've Got Mail!</strong>${showTheme?themeToggle(state.theme):''}
    <button class="profile-link" data-action="profile"><img src="${profilePhoto(state.profile)}" alt="">My profile</button></header>`;
}
export function home(state){
  const on=state.receiving;
  return `<section class="header-board" data-open="${on}"><div class="courier-stand post-office-home"><img class="post-office-art" src="${folder}post-office.png" alt="Pigeon at the post office"><div class="post-office-controls"><label class="mail-toggle"><input id="receiving" type="checkbox" role="switch" aria-label="Open to mail" ${on?'checked':''}><img class="mail-status-art" src="${folder}mail-${on?'open':'closed'}.webp" width="1064" height="314" alt=""><span class="mail-status-hint" aria-hidden="true">tap to change status</span></label></div></div></section><div id="home-wheel"></div><button type="button" class="home-send" data-home-send disabled><span>Send</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button>`;
}
