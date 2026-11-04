import { escapeHtml as esc, collectionName } from '../domain.mjs';

const folder='assets/home/';
export const demoPeople=[
  ['owen','Owen',true],['sophie','Sophie',false],['mia','Mia',true],['alex','Alex',false],['sam','Sam',true]
];
const categories=[
  ['Messages','messages'],['Photos','pictures'],['Postcards','postcards'],['Flowers','flowers'],
  ['Stickers','stickers'],['Jokes','jokes'],['Notes','messages'],['Love notes','postcards']
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
function arrow(direction,rail){
  return `<button class="postal-arrow" data-action="rail" data-rail="${rail}" data-id="${direction}" aria-label="${direction<0?'Previous':'More'} ${rail}"><span aria-hidden="true">${direction<0?'‹':'›'}</span></button>`;
}
function friend(f){
  const id=demoPeople.some(([id])=>id===f.id)?f.id:'mascot';
  return `<button class="postal-person ${f.open?'open':'unavailable'}" data-action="friend" data-id="${esc(f.id)}">
    <span class="portrait-ring"><img src="${folder+id}.webp" alt=""></span>
    <strong>${esc(f.name)}</strong><span class="availability">${f.open?'✓ Bother me':'✕ Do not poke'}</span></button>`;
}
export function home(state){
  const on=state.receiving;
  return `<section class="postal-hero"><img src="${folder}mascot.webp" alt="Pigeon wearing a messenger bag, perched on a green letterbox"><div><h1>Go on,<br>send them<br>something.</h1><p>How else will they know you're thinking about them?</p></div></section>
  <label class="postal-receiving ${on?'open':'closed'}"><span class="postal-envelope">${on?'':'🚫'}</span>
  <span><strong>${on?'Open to mail':'Closed to mail'}</strong><small>${on?'Interruptions welcome.':'Do not disturb.'}</small></span>
  <span class="postal-switch"><input id="receiving" type="checkbox" role="switch" aria-label="Receive mail" ${on?'checked':''}><b>${on?'ON':'OFF'}</b><i></i></span></label>
  <div class="postal-label"><h2>Send mail to:</h2><button data-action="test">Send test</button></div>
  <div class="postal-track people">${arrow(-1,'people')}<div class="postal-row" data-list="people">${state.friends.map(friend).join('')}</div>${arrow(1,'people')}</div>
  <button class="add-pill" data-action="connect">+ Add someone</button>
  <section class="postal-shop"><div class="postal-kiosk"><header><h2>Pick &amp; post</h2><button data-action="shop"><span aria-hidden="true">▤</span> Shop</button></header>
  <div class="postal-track">${arrow(-1,'categories')}<div class="postal-row" data-list="categories">${categories.map(([cat,img])=>`<button class="postal-cat" data-action="shop" data-id="${cat}"><img src="${folder+img}.webp" alt="">${cat==='Photos'?'Pictures':collectionName(cat)}</button>`).join('')}</div>${arrow(1,'categories')}</div>
  </div></section><button class="quick-post" data-action="compose">Quick message</button>`;
}
export function wireRails(app){
  app.querySelectorAll('[data-list]').forEach(row=>{
    const [prev,next]=row.parentElement.querySelectorAll('.postal-arrow');
    const sync=()=>{prev.disabled=row.scrollLeft<2;next.disabled=row.scrollLeft+row.clientWidth>=row.scrollWidth-2;};
    row.onscroll=sync;requestAnimationFrame(sync);
  });
}
