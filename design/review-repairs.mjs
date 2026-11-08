// Apply Nicole's explicit corrections once, retaining unrelated colours/comments.
export function repairLatestReview(storage){
 const marker='pigeon.repair.circles-inbox.036';
 try{
  if(storage.getItem(marker))return;
  for(const key of Object.keys(storage).filter(key=>key.startsWith('pigeon.live-review.v1.'))){
   const entry=JSON.parse(storage.getItem(key));if(!entry?.targets)continue;
   let changed=false;
   for(const [selector,target] of Object.entries(entry.targets)){
    const design=target.atSelection?.design||entry.layout?.elements?.find(item=>item.selector===selector)?.design||'';
    if((selector.includes('#home-wheel')||selector.includes('.category-reel'))&&/^(?:Browse|Show) (?:pigeons|stickers)$/i.test(design)&&target.colours?.background){delete target.colours.background;changed=true;}
    if(entry.surface==='app'&&entry.theme==='light'&&entry.view?.startsWith('inbox')&&['#app','body'].includes(selector)&&target.colours?.background){target.colours.background='#f8f1dd';changed=true;}
   }
   if(changed)storage.setItem(key,JSON.stringify(entry));
  }
  const key='pigeon.home.colours.v2',home=JSON.parse(storage.getItem(key)||'{}');
  if(home.light?.carousel==='#f2d5bf'){home.light.carousel='#ffe9c7';storage.setItem(key,JSON.stringify(home));}
  storage.setItem(marker,'1');
 }catch{}
}
