// Make a script-free copy in a separate document. Async receipt updates and
// native callbacks can finish without moving what the reviewer is pointing at.
export function freezeFrame(frame, appRoot) {
  const doc = frame.contentDocument;
  const base = doc.createElement('base');
  base.href = new URL('.',document.baseURI).href;
  doc.head.append(base);
  for (const a of document.documentElement.attributes) doc.documentElement.setAttribute(a.name,a.value);
  for (const css of document.querySelectorAll('head link[rel=stylesheet],head style')) {
    if(css.hasAttribute('data-live-colours'))continue;
    // Inline the loaded rules, keeping each stylesheet's relative asset URLs.
    if (css.sheet) {
      try {
        const style = doc.createElement('style');
        style.textContent = [...css.sheet.cssRules].map(rule => rule.cssText.replace(/url\(["']?([^"')]+)["']?\)/g,(all,url) => {
          if (/^(data:|blob:|#)/.test(url)) return all;
          return 'url("' + new URL(url,css.sheet.href || document.baseURI).href + '")';
        })).join('\n');
        doc.head.append(style);
        continue;
      } catch { /* external sheets may only allow linking */ }
    }
    doc.head.append(doc.importNode(css,true));
  }
  const copies = new Map();
  function copy(original) {
    if (original.nodeType !== 1) return doc.importNode(original,false);
    if (original.matches('script,iframe,object,embed,[data-review-ui]')) return null;
    const twin = doc.importNode(original,false);
    for (const attr of [...twin.attributes]) if (attr.name.startsWith('on') || attr.name==='autofocus') twin.removeAttribute(attr.name);
    copies.set(original,twin);
    for (const child of original.childNodes) {
      const node = copy(child);
      if (node) twin.append(node);
    }
    if (original.matches('input:not([type=file]),textarea,select')) twin.value = original.value;
    if (original.matches('input')) twin.checked = original.checked;
    return twin;
  }
  doc.body.replaceWith(copy(document.body));
  for (const [el,twin] of copies) {
    if (el.matches('dialog:modal')) { twin.removeAttribute('open'); twin.showModal(); }
    if (el.matches('canvas') && el.width && el.height) twin.getContext('2d')?.drawImage(el,0,0);
  }
  const restoreScroll = () => {
    for (const [el,twin] of copies) {
      if (el.scrollLeft) twin.scrollLeft = el.scrollLeft;
      if (el.scrollTop) twin.scrollTop = el.scrollTop;
    }
    doc.defaultView.scrollTo(window.scrollX,window.scrollY);
  };
  const still = doc.createElement('style');
  still.textContent='*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}';
  doc.head.append(still);
  restoreScroll();
  return {doc,root:copies.get(appRoot)};
}
