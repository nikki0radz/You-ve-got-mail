import {elements} from './model.mjs';
const $=id=>document.getElementById(id);
const groups={
  placement:['Placement preview','.sample-phone'],header:['Composer heading','.studio-heading'],
  notePanel:['Note options panel','.banner-options'],stickerPanel:['Sticker options panel','.sticker-options'],
  photoTools:['Photo controls','.studio-photo'],crop:['Photo crop window','.crop-window'],
  colours:['Colour and font controls','.studio-colours'],picker:['Colour picker','.ink-picker'],
  composer:['Composer box','#parcel-shop'],guest:['Guest screen','.guest']
};
const registry={...elements,...groups};
function candidates(event,doc){
  const path=event.composedPath(),targets=[];
  for(const node of path){
    if(!node.matches)continue;
    if(node.dataset.workId){
      const entry=doc.defaultView.designSurface?.inventory?.()[node.dataset.workId];
      if(entry)targets.push({id:node.dataset.workId,label:entry[0],selector:entry[1],kind:entry[2]||node.localName});
      continue;
    }
    if(node.dataset.designCopy)targets.push({id:node.dataset.designCopy,label:'Placed sticker',selector:'[data-design-copy="'+node.dataset.designCopy+'"]'});
    for(const [id,[label,selector]] of Object.entries(registry)){
      if(!node.matches(selector)||id==='pocket'||targets.some(t=>t.id===id))continue;
      const scope=node.closest('#parcel-shop')&&id!=='composer'?'#parcel-shop ':'';
      const scoped=scope+selector;
      const matches=Array.from(doc.querySelectorAll(scoped));
      targets.push({id,label,selector:scoped,kind:node.localName,instance:matches.indexOf(node)+1});
    }
  }
  return targets;
}
export function mountReview(frames,getComments,change,getContext){
  const modal=$('commentDialog'),select=$('commentTarget'),text=$('commentText');
  let choices=[],context,existing=null,origin=null;
  let reference=null,marked=null,previousOutline='',priority='',drag=null;
  function clearMark(){
    if(marked){marked.style.setProperty('outline',previousOutline,priority);marked=null;}
  }
  function highlight(){
    clearMark();const target=choices[Number(select.value)];
    if(!reference||!target)return;
    try{marked=reference.contentDocument.querySelectorAll(target.selector)[(target.instance||1)-1];}catch{return;}
    if(marked){previousOutline=marked.style.getPropertyValue('outline');priority=marked.style.getPropertyPriority('outline');marked.style.setProperty('outline','3px dashed #b74f28','important');}
  }
  function move(left,top){
    const r=modal.getBoundingClientRect();
    modal.style.left=Math.max(8,Math.min(innerWidth-r.width-8,left))+'px';
    modal.style.top=Math.max(8,Math.min(innerHeight-r.height-8,top))+'px';
  }
  function dock(right){move(right?innerWidth-modal.offsetWidth-12:12,(innerHeight-modal.offsetHeight)/2);}
  const grip=$('commentGrip');
  grip.onpointerdown=e=>{if(e.button!==0)return;const r=modal.getBoundingClientRect();drag={dx:e.clientX-r.left,dy:e.clientY-r.top};grip.setPointerCapture(e.pointerId);};
  grip.onpointermove=e=>{if(drag)move(e.clientX-drag.dx,e.clientY-drag.dy);};
  grip.onlostpointercapture=grip.onpointercancel=grip.onpointerup=()=>drag=null;
  grip.onkeydown=e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();const r=modal.getBoundingClientRect();move(r.left+d[0]*24,r.top+d[1]*24);}};
  $('commentSide').onclick=()=>dock(modal.getBoundingClientRect().left<innerWidth/2-modal.offsetWidth/2);
  addEventListener('resize',()=>{if(modal.open){const r=modal.getBoundingClientRect();move(r.left,r.top);}});
  select.onchange=highlight;modal.addEventListener('close',()=>{clearMark();reference=null;drag=null;});
  function open(targets,device,old=null,frame=null){
    choices=targets;context=device;existing=old;origin=old?old.origin:getContext();
    select.replaceChildren(...choices.map((t,i)=>new Option(t.label,i)));
    text.value=old?.text||'';$('commentDevice').textContent=device.preset+' · '+device.width+' × '+device.height+' · '+device.view;
    reference=frame||frames.find(f=>f.closest('.device').querySelector('header b').textContent===device.preset);
    modal.showModal();highlight();const r=reference?.getBoundingClientRect();dock(!r||r.left+r.width/2<=innerWidth/2);text.focus({preventScroll:true});
  }
  const attached=new WeakSet();
  function attach(frame){
    const doc=frame.contentDocument;if(!doc||attached.has(doc))return;attached.add(doc);
    doc.addEventListener('pointerdown',e=>{if(e.button===2)e.stopImmediatePropagation()},true);
    doc.addEventListener('contextmenu',e=>{
      const targets=candidates(e,doc);if(!targets.length)return;
      e.preventDefault();e.stopPropagation();
      const device=frame.closest('.device');
      const heading=e.target.closest('dialog[open]')?.querySelector('h2')||[...doc.querySelectorAll('main h1,main h2,.guest h1,.guest h2')].find(n=>n.getClientRects().length);
      open(targets,{preset:device.querySelector('header b').textContent,width:frame.contentWindow.innerWidth,
        height:frame.contentWindow.innerHeight,view:heading?.textContent||document.querySelector('main h1')?.textContent||'Page'},null,frame);
    },true);
  }
  frames.forEach(f=>{f.addEventListener('load',()=>attach(f));attach(f)});
  $('commentCancel').onclick=()=>modal.close();
  $('commentForm').onsubmit=e=>{
    e.preventDefault();if(!text.value.trim()){text.focus();return;}
    const target=choices[Number(select.value)];
    const comment={id:existing?.id||crypto.randomUUID(),target,preview:context,text:text.value.trim(),origin,
      parents:existing?.parents??choices.slice(Number(select.value)+1).map(({id,label,selector,instance})=>({id,label,selector,instance}))};
    const list=getComments(),idx=list.findIndex(c=>c.id===comment.id);if(idx<0)list.push(comment);else list[idx]=comment;
    modal.close();change();
  };
  function render(){
    const list=getComments(),host=$('comments');host.replaceChildren();
    if(!list.length){host.textContent='No comments yet.';return;}
    for(const [i,c] of list.entries()){
      const article=document.createElement('article'),title=document.createElement('b'),body=document.createElement('p');
      title.textContent=(i+1)+'. '+c.target.label;body.textContent=c.text;article.append(title,body);
      for(const [label,fn] of [['Edit',()=>open([c.target],c.preview,c)],['Remove',()=>{list.splice(i,1);change()}]]){
        const button=document.createElement('button');button.textContent=label;button.onclick=fn;article.append(button);
      }
      host.append(article);
    }
  }
  return {render};
}
export function exportReview(review){
  const report={format:'pigeon-post.design-review',schemaVersion:1,repository:'nikki0radz/You-ve-got-mail',
    component:'Postcard composer',sourceFiles:['shop/guest-studio.mjs','shop/studio.css','post/guest.css','design/model.mjs'],
    exportedAt:new Date().toISOString(),...review};
  download(report,review.name,'review');
}
export function exportComments(sections,name){
  download({format:'pigeon-post.comment-review',schemaVersion:1,repository:'nikki0radz/You-ve-got-mail',
    exportedAt:new Date().toISOString(),sections},name,'comments');
}
function download(report,name,suffix){
  const file=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(file);
  const a=document.createElement('a');a.href=url;a.download='pigeon-post-'+(name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,60)||'composer')+'-'+suffix+'.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
