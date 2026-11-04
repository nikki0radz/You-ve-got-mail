// Keep the controls in laptop pixels while the preview scales and scrolls independently.
export function anchorOptions(rail,frame,selectors){
  let pending=false;
  function schedule(){
    if(!pending){pending=true;requestAnimationFrame(place);}
  }
  function place(){
    pending=false;
    const doc=frame.contentDocument,viewport=frame.getBoundingClientRect(),bounds=rail.getBoundingClientRect();
    const scale=viewport.height/frame.clientHeight,visible=[];
    const modal=doc?.querySelector('dialog[open]');
    [...rail.children].forEach((row,i)=>{
      const el=selectors[i]&&doc?.querySelector(selectors[i]);
      const rect=el?.getBoundingClientRect();
      row.hidden=!rect?.height||!scale||rect.bottom<=0||rect.top>=frame.clientHeight||!!(modal&&!modal.contains(el));
      if(row.hidden)return;
      const middle=(Math.max(0,rect.top)+Math.min(frame.clientHeight,rect.bottom))/2;
      visible.push({row,y:viewport.top-bounds.top+middle*scale,height:row.offsetHeight});
    });
    visible.sort((a,b)=>a.y-b.y);
    let end=0;
    for(const item of visible){
      item.top=Math.max(end,item.y-item.height/2);
      end=item.top+item.height+4;
    }
    end=bounds.height;
    for(const item of visible.reverse()){
      const top=Math.max(0,Math.min(end-item.height,item.top));
      item.row.style.top=top+'px';
      let line=item.row.querySelector('svg');
      if(!line){
        const ns='http://www.w3.org/2000/svg';
        line=document.createElementNS(ns,'svg');line.setAttribute('aria-hidden','true');
        line.append(document.createElementNS(ns,'path'));item.row.prepend(line);
      }
      const mid=item.height/2,pin=item.y-top;
      line.firstChild.setAttribute('d',`M1 ${pin} L5 ${pin} L13 ${mid} L18 ${mid}`);
      end=top-4;
    }
  }
  function watch(){
    const doc=frame.contentDocument;
    if(!doc?.body)return;
    doc.addEventListener('scroll',schedule,{capture:true,passive:true});
    frame.contentWindow.addEventListener('resize',schedule);
    new ResizeObserver(schedule).observe(doc.body);
    new MutationObserver(schedule).observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','open','style','data-review-look']});
    doc.fonts?.ready.then(schedule);
    schedule();
  }
  new ResizeObserver(schedule).observe(rail);
  frame.addEventListener('load',watch);
  if(frame.contentDocument?.readyState==='complete')watch();
  return {schedule};
}
