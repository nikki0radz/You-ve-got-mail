import {composePNG} from './compositor.mjs';
import {escapeHtml as esc} from '../domain.mjs';

const categories=['Notes','Photos','Postcards','Flowers','Love notes','Messages','Jokes','Stickers'];
const displayName=category=>category==='Photos'?'Photo frames':category;
const palette=[['','None'],['#fff1d4','Cream'],['#c1d6bc','Pale forest'],['#d9cce8','Lilac'],['#45634d','Forest']];
let catalog;
async function getCatalog(){
  if(catalog)return catalog;
  const response=await fetch('assets/post/catalog.json');
  if(!response.ok)throw new Error('The shop could not load. Open it again to retry.');
  catalog=await response.json();return catalog;
}
function miniature(item){
  const [x,y,w,h]=item.rect;
  return '<svg viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><svg width="'+w+'" height="'+h+'" viewBox="'+[x,y,w,h].join(' ')+'" overflow="hidden"><image href="'+esc(item.sheet)+'" width="'+item.sheetWidth+'" height="'+item.sheetHeight+'"/></svg></svg>';
}
export async function openShop(onTest, initialCategory){
  const dialog=document.querySelector('#parcel-shop');
  let current,group,draft,step=0,latest=0,dirty=false,finished;
  let returnScroll=0,previewURL;
  const trigger=document.activeElement;
  if(dialog.open)return;
  dialog.showModal();
  const cleanup=()=>{latest++;if(previewURL)URL.revokeObjectURL(previewURL);dialog.replaceChildren();trigger?.focus();};
  dialog.onclose=cleanup;
  let cancel=()=>dialog.close();
  dialog.oncancel=e=>{e.preventDefault();cancel();};
  const shell=(name,status,body,back)=>{
    dialog.innerHTML='<header class="parcel-head"><small>'+esc(status)+'</small><button type="button" aria-label="Close" class="parcel-x">×</button></header><h2>'+esc(name)+'</h2>'+body+'<p role="alert" class="parcel-error"></p>';
    dialog.querySelector('.parcel-x').onclick=()=>cancel();
    const prev=dialog.querySelector('[data-prev]');if(prev)prev.onclick=back;
    dialog.scrollTop=0;
  };
  const report=e=>{const line=dialog.querySelector('.parcel-error');if(line)line.textContent=e.message||String(e);};
  const backButton='<button class="secondary" data-prev>‹ Back</button>';
  const chooseItem=it=>{current=it;group=it.category;step=0;dirty=false;
    draft={words:'',extra:'',photo:null,zoom:1,panX:.5,panY:.5,shape:'Rounded',background:'',border:''};edit();};
  const shelfButton=it=>'<button type="button" class="parcel-tile" data-item="'+catalog.indexOf(it)+'">'+miniature(it)+'<span>'+esc(it.name)+'</span></button>';
  const wireTiles=()=>dialog.querySelectorAll('[data-item]').forEach(btn=>btn.onclick=()=>{returnScroll=dialog.scrollTop;chooseItem(catalog[Number(btn.dataset.item)]);});
  function browse(){
    dirty=false;cancel=()=>dialog.close();
    shell('Pick & post','The parcel shop','<div class="postal-shelves">'+categories.map(cat=>{
      const items=catalog.filter(it=>it.category===cat);
      return '<section><h3>'+displayName(cat)+'</h3><div class="postal-strip"><button class="bubble previous" aria-label="Previous '+cat+'">‹</button><div class="strip-items">'+items.slice(0,6).map(shelfButton).join('')+'</div><button class="bubble following" aria-label="More '+cat+'">›</button></div><button class="seam" data-cat="'+cat+'" aria-label="See all '+cat+'">See all ↓</button></section>';
    }).join('')+'</div>');
    wireTiles();
    dialog.querySelectorAll('[data-cat]').forEach(btn=>btn.onclick=()=>{group=btn.dataset.cat;returnScroll=0;gallery();});
    dialog.querySelectorAll('.postal-strip').forEach(strip=>{
      const row=strip.querySelector('.strip-items'), prev=strip.querySelector('.previous'), next=strip.querySelector('.following');
      const sync=()=>{prev.disabled=row.scrollLeft<2;next.disabled=row.scrollLeft+row.clientWidth>=row.scrollWidth-2};
      prev.onclick=()=>row.scrollBy({left:-row.clientWidth,behavior:'smooth'});next.onclick=()=>row.scrollBy({left:row.clientWidth,behavior:'smooth'});row.onscroll=sync;requestAnimationFrame(sync);
    });
  }
  function gallery(){
    dirty=false;cancel=()=>dialog.close();
    const items=catalog.filter(it=>it.category===group);
    shell(displayName(group),items.length+' designs',backButton+'<div class="parcel-gallery">'+items.map(shelfButton).join('')+'</div>',browse);wireTiles();dialog.scrollTop=returnScroll;
  }
  function confirmExit(action){
    if(!dirty){action();return}
    shell('Discard this parcel?','Unfinished design','<button class="secondary" data-keep>Keep editing</button> <button class="primary" data-discard>Discard</button>');
    cancel=edit;dialog.querySelector('[data-keep]').onclick=edit;dialog.querySelector('[data-discard]').onclick=action;
  }
  function stages(){return [...(current.maskSheet?['Picture']:[]),...(current.textBox?['Write']:[]),'Surround','Extra note','Ready'];}
  function selectControl(key,opts){return '<label>'+key+'<select data-setting="'+key.toLowerCase()+'">'+opts.map(([v,n])=>'<option value="'+v+'" '+(draft[key.toLowerCase()]===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label>';}
  async function paint(){
    const token=++latest,slot=dialog.querySelector('.parcel-canvas');
    try{const c=await composePNG(current,draft);if(token!==latest||!slot?.isConnected)return;finished=c;slot.replaceChildren(c);if(stages()[step]==='Ready')dialog.querySelectorAll('[data-export]').forEach(b=>b.disabled=false);}
    catch(e){if(token===latest)report(e)}
  }
  function edit(){
    cancel=()=>confirmExit(()=>dialog.close());
    const seq=stages(),page=seq[step];let controls='';
    if(page==='Picture')controls='<label>Choose your picture<input type="file" data-photo accept="image/*"></label>'+['zoom','panX','panY'].map((k,i)=>'<label>'+['Zoom','Left / right','Up / down'][i]+'<input type="range" data-range="'+k+'" min="'+(i?0:1)+'" max="'+(i?1:3)+'" step=".01" value="'+draft[k]+'"></label>').join('');
    if(page==='Write'||page==='Extra note'){const k=page==='Write'?'words':'extra';controls='<label>'+ (k==='words'?'Write on this design':'Optional note below the artwork')+'<textarea data-text="'+k+'" maxlength="180" rows="2">'+esc(draft[k])+'</textarea></label>';}
    if(page==='Surround')controls=selectControl('Background',palette)+selectControl('Shape',['Rounded','Oval','Square'].map(v=>[v,v]))+selectControl('Border',palette);
    const actions=page==='Ready'?'<button class="secondary" data-export="save" disabled>Save PNG</button><button class="primary" data-export="share" disabled>Share PNG</button><button class="secondary" data-export="test" disabled>Send test</button>':'<button class="primary" data-next>Next</button>';
    shell(current.name,(step+1)+' of '+seq.length+' · '+page,'<div class="parcel-canvas" role="img" aria-label="Parcel preview"></div><div class="parcel-controls">'+controls+'</div><div class="parcel-actions">'+backButton+actions+'</div>',()=>{if(step){step--;edit();}else confirmExit(gallery);});
    dialog.querySelector('[data-next]')?.addEventListener('click',()=>{if(page==='Picture'&&!draft.photo)return report(new Error('Choose a picture first.'));if(page==='Write'&&!draft.words.trim())return report(new Error('Add a few words first.'));step++;edit()});
    dialog.querySelectorAll('[data-setting],[data-range],[data-text]').forEach(el=>el.oninput=()=>{const k=el.dataset.setting||el.dataset.range||el.dataset.text;draft[k]=el.dataset.range?Number(el.value):el.value;dirty=true;paint()});
    const file=dialog.querySelector('[data-photo]');
    if(file)file.onchange=async()=>{
      if(!file.files[0])return;
      const url=URL.createObjectURL(file.files[0]),img=new Image();img.src=url;previewURL=url;
      try{await img.decode();if(!file.isConnected||previewURL!==url)return;draft.photo=img;dirty=true;await paint();}
      catch{report(new Error('Could not open that picture. Try JPG or PNG.'))}finally{URL.revokeObjectURL(url);}
    };
    dialog.querySelectorAll('[data-export]').forEach(btn=>btn.onclick=async()=>{
      const c=finished;if(!c)return;
      try{
        if(btn.dataset.export==='test'){dirty=false;dialog.close();onTest(c.toDataURL('image/png'),current.name);return;}
        const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));const file=new File([blob],current.name+'.png',{type:'image/png'});
        if(btn.dataset.export==='share'&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file]});return;}
        const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
        if(btn.dataset.export==='share')dialog.querySelector('.parcel-error').textContent='PNG downloaded. Attach it in your messaging app.';
      }catch(e){if(e.name!=='AbortError')report(e)}
    });paint();
  }
  try{await getCatalog();if(dialog.open){if(categories.includes(initialCategory)){group=initialCategory;gallery()}else browse()}}
  catch(e){shell('Shop unavailable','Pick & post','<button class="secondary" data-prev>Close</button>',()=>dialog.close());report(e);}
}
