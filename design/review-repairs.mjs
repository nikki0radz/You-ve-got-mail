// Apply Nicole's explicit corrections once, retaining unrelated colours/comments.
function repairCirclesInbox(storage){
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

// A separate marker also updates devices that applied the earlier correction.
export function repairLatestReview(storage){
 repairCirclesInbox(storage);
 const marker='pigeon.repair.mailbox-magnolia.037';
 try{
  if(storage.getItem(marker))return;
  const lightBackground=colour=>{
   const hex=/^#([\da-f]{6})$/i.exec(colour||'');if(!hex)return false;
   const rgb=hex[1].match(/../g).map(value=>parseInt(value,16));
   return rgb[0]>=220&&rgb[1]>=210&&rgb[2]>=180;
  };
  for(const key of Object.keys(storage).filter(key=>key.startsWith('pigeon.live-review.v1.'))){
   const entry=JSON.parse(storage.getItem(key));
   if(entry?.surface!=='app'||entry.theme!=='light'||!entry.view?.startsWith('inbox'))continue;
   let changed=false;
   for(const target of Object.values(entry.targets||{})){
    if(lightBackground(target.colours?.background)){target.colours.background='#f8f1dd';changed=true;}
   }
   if(changed)storage.setItem(key,JSON.stringify(entry));
  }
  const key='pigeon.linked-navigation.v1.light',items=JSON.parse(storage.getItem(key)||'{}');
  let changed=false;
  for(const [selector,target] of Object.entries(items)){
   if(selector.includes('.mail-tabs')&&lightBackground(target.colours?.background)){target.colours.background='#f8f1dd';changed=true;}
  }
  if(changed)storage.setItem(key,JSON.stringify(items));
  storage.setItem(marker,'1');
 }catch{}
}
