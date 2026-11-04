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
    if(node.dataset.designCopy)targets.push({id:node.dataset.designCopy,label:'Placed sticker',selector:'[data-design-copy="'+node.dataset.designCopy+'"]'});
    for(const [id,[label,selector]] of Object.entries(registry)){
      if(!node.matches(selector)||id==='pocket'||targets.some(t=>t.id===id))continue;
      const scope=node.closest('#parcel-shop')&&id!=='composer'?'#parcel-shop ':'';
      const scoped=scope+selector;
      const matches=Array.from(doc.querySelectorAll(scoped));
      targets.push({id,label,selector:scoped,instance:matches.indexOf(node)+1});
    }
  }
  return targets;
}
export function mountReview(frames,getComments,change){
  const modal=$('commentDialog'),select=$('commentTarget'),text=$('commentText');
  let choices=[],context,existing=null;
  function open(targets,device,old=null){
    choices=targets;context=device;existing=old;
    select.replaceChildren(...choices.map((t,i)=>new Option(t.label,i)));
    text.value=old?.text||'';$('commentDevice').textContent=device.preset+' · '+device.width+' × '+device.height+' · '+device.view;
    modal.showModal();text.focus();
  }
  const attached=new WeakSet();
  function attach(frame){
    const doc=frame.contentDocument;if(!doc||attached.has(doc))return;attached.add(doc);
    doc.addEventListener('pointerdown',e=>{if(e.button===2)e.stopImmediatePropagation()},true);
    doc.addEventListener('contextmenu',e=>{
      const targets=candidates(e,doc);if(!targets.length)return;
      e.preventDefault();e.stopPropagation();
      const device=frame.closest('.device');
      const heading=e.target.closest('dialog,.guest')?.querySelector('h2');
      open(targets,{preset:device.querySelector('header b').textContent,width:frame.contentWindow.innerWidth,
        height:frame.contentWindow.innerHeight,view:heading?.textContent||'Postcard composer'});
    },true);
  }
  frames.forEach(f=>{f.addEventListener('load',()=>attach(f));attach(f)});
  $('commentCancel').onclick=()=>modal.close();
  $('commentForm').onsubmit=e=>{
    e.preventDefault();if(!text.value.trim()){text.focus();return;}
    const comment={id:existing?.id||crypto.randomUUID(),target:choices[Number(select.value)],preview:context,text:text.value.trim()};
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
  const file=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(file);
  const a=document.createElement('a');a.href=url;a.download='pigeon-post-'+(review.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,60)||'composer')+'-review.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
