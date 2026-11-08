// Only structural identifiers enter a review. Mail contents, form values, URLs and
// native mailbox identifiers remain in the live screen.
const identityAttrs = ['data-action','data-pref','data-tool','data-flow','data-section','data-key','data-target','data-mode','data-folder','data-social','data-setting','data-range','data-style-key','data-design','data-category'];
const simple = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
const visibleClass = el => [...el.classList].find(c => simple(c) && !['active','selected','picked','editing','visible'].includes(c));
export function selector(el) {
  if (el.id && simple(el.id)) return '#' + CSS.escape(el.id);
  if (!el.parentElement || el.localName === 'body') return el.localName;
  let part = el.localName;
  const attr = identityAttrs.find(k => el.hasAttribute(k) && simple(el.getAttribute(k)));
  if (attr) {
    part += '[' + attr + '="' + el.getAttribute(attr) + '"]';
    if (el.dataset.action === 'tab' && simple(el.dataset.id)) part += '[data-id="' + el.dataset.id + '"]';
  } else if (visibleClass(el)) part += '.' + CSS.escape(visibleClass(el));
  const peers = [...el.parentElement.children].filter(n => n.localName === el.localName);
  if (peers.filter(n => n.matches(part)).length > 1) part += ':nth-of-type(' + (peers.indexOf(el)+1) + ')';
  return selector(el.parentElement) + ' > ' + part;
}
export function label(el) {
  if (el.id === 'app' || el.localName === 'body') return 'Page background';
  if (el.matches('.frame-card')) return 'Whole carousel · artwork and name';
  if (el.matches('.wheel-paper')) return 'Carousel background';
  const action = identityAttrs.find(k => el.hasAttribute(k) && simple(el.getAttribute(k)));
  const name = el.id || (action && el.getAttribute(action)) || visibleClass(el) || el.localName;
  return name.replace(/[-_]/g,' ') + (name !== el.localName ? ' · ' + el.localName : '');
}
export function describe(el) {
  const r = el.getBoundingClientRect(), s = el.ownerDocument.defaultView.getComputedStyle(el);
  const detail={};
  if(el.matches('img')){
    // Only identify bundled artwork. Picked photos and mailbox images stay local.
    const asset=el.getAttribute('src')?.match(/^(?:\.\/)?(assets\/[\w./-]+\.(?:png|webp|svg))(?:\?.*)?$/i);
    if(asset)detail.asset=asset[1];
  }
  const tile=el.closest('[data-design],[data-preview],.category-reel button');
  if(tile?.hasAttribute('aria-label'))detail.design=tile.getAttribute('aria-label');
  if(el.matches('details'))detail.open=el.open;
  if(el.hasAttribute('aria-pressed'))detail.pressed=el.getAttribute('aria-pressed');
  return {...detail,selector:selector(el),label:label(el),x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),
    background:s.backgroundColor,text:s.color,border:s.borderTopColor,fontSize:s.fontSize,display:s.display};
}
export function screen(doc, root) {
  const surface = doc.querySelector('.guest') ? 'guest' : 'app';
  let view = root.dataset.reviewScreen || root.id || 'page';
  if (root.matches('.guest')) view = root.querySelector('#steps')?.dataset.reviewScreen || 'invitation status';
  if (root.id === 'app') view = root.querySelector('[aria-current="page"][data-id]')?.dataset.id || 'home';
  const folder = root.querySelector('[data-folder][aria-pressed=true]');
  if (folder) view += ' / ' + folder.dataset.folder;
  return {surface,view,theme:doc.documentElement.dataset.theme || 'light'};
}
export function layout(root) {
  const elements = [root,...root.querySelectorAll('*')].filter(el => !el.closest('[data-review-ui],svg *,option,script,style') && el.getClientRects().length);
  return {viewport:{width:root.ownerDocument.defaultView.innerWidth,height:root.ownerDocument.defaultView.innerHeight},
    scroll:{x:root.ownerDocument.defaultView.scrollX,y:root.ownerDocument.defaultView.scrollY,container:root.scrollTop},
    elements:elements.filter(el=>{
      if(el===root)return true;
      const r=el.getBoundingClientRect(),w=root.ownerDocument.defaultView;
      return r.right>0 && r.bottom>0 && r.left<w.innerWidth && r.top<w.innerHeight;
    }).map(describe)};
}
