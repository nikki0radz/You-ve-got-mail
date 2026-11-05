const key='pigeon.phone.home.design.v1';
const colours=['#f8f1dd','#e5efe7','#c9ddd1','#a1c6bc','#597c66','#365a40','#283f32','#ead8bf'];
let closeStudio=()=>false;
export function closePhoneStudio(){return closeStudio()}
export function openPhoneStudio(){
  if(document.getElementById('phone-studio'))return;
  let draft={colours:{}};
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');draft.colours=saved.colours||{}}catch{}
  const layer=document.createElement('section');layer.id='phone-studio';
  layer.innerHTML='<header><button data-close>← Back</button><strong>Design Home</strong><button data-export>Export</button></header><p>Post office · tap the counter or carousel, then choose a colour.</p><div class="phone-design-colours" aria-label="Colours"></div><iframe title="Post office Home preview" src="design/page.html?page=home"></iframe>';
  document.body.append(layer);
  const frame=layer.querySelector('iframe'),palette=layer.querySelector('.phone-design-colours');
  let target='header';
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({...draft,header:'post-office-6'}))}catch{}};
  for(const colour of colours){
    const button=document.createElement('button');button.style.background=colour;button.title=colour;button.setAttribute('aria-label','Colour '+colour);
    button.onclick=()=>{draft.colours[target]=colour;persist();paint()};palette.append(button);
  }
  function paint(){
    const doc=frame.contentDocument,stand=doc?.querySelector('.courier-stand');
    if(!stand)return;
    const controls=stand.querySelector('.post-office-controls');
    if(controls)controls.style.backgroundColor=draft.colours.header||'';
    const wheel=doc.querySelector('#home-wheel .wheel-paper');
    if(wheel){
      const colour=draft.colours.carousel||'';
      wheel.style.backgroundColor=colour;
      wheel.style.color=['#597c66','#365a40','#283f32'].includes(colour)?'#fff9e8':'#203b2c';
    }
  }
  frame.onload=()=>{
    const doc=frame.contentDocument;
    const prepare=()=>{
      const stand=doc.querySelector('.courier-stand'),surface=frame.contentWindow.designSurface;
      if(!stand||!surface){setTimeout(prepare,100);return}
      surface.configure({editing:false,selected:'',layout:{styles:{}},textScale:1});
      paint();
      new MutationObserver(paint).observe(doc.querySelector('#app'),{childList:true,subtree:true});
      doc.addEventListener('click',e=>{
        if(e.target.closest('[data-set-open]'))return;
        if(e.target.closest('.courier-stand')){target='header';e.preventDefault();e.stopImmediatePropagation()}
        else if(e.target.closest('#home-wheel .wheel-paper')){target='carousel'}
      },true);
    };
    prepare();
  };
  layer.querySelector('[data-export]').onclick=()=>{
    const payload=JSON.stringify({format:'pigeon-post.phone-home-design',version:1,screen:'home',appVersion:'0.1.12',exportedAt:new Date().toISOString(),draft:{...draft,header:'post-office-6'}},null,2);
    if(window.Pigeon?.shareDesign)Pigeon.shareDesign(payload);else navigator.clipboard?.writeText(payload);
  };
  closeStudio=()=>{layer.remove();closeStudio=()=>false;return true};
  layer.querySelector('[data-close]').onclick=closeStudio;
}
