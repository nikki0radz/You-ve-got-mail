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
    stand.style.setProperty('--booth-paper',draft.colours.header||'#e5d5b3');
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
      stand.classList.add('post-office-six');
      const roof=doc.createElement('div');roof.className='post-office-roof';
      const name=doc.createElement('span');name.textContent='PIGEON POST';roof.append(name);
      const counter=doc.createElement('div');counter.className='post-office-counter';
      const label=stand.querySelector('.mail-sign');counter.append(label);
      stand.prepend(roof);stand.append(counter);
      const style=doc.createElement('style');
      style.textContent=`
        html[data-workroom=home] .header-board .style-choice{display:none}
        html[data-workroom=home] #home-wheel .wheel-paper{background:#e4eedf;color:#203b2c}
        .header-board[data-open] .courier-stand.post-office-six{
          display:grid;grid-template-rows:auto 1fr auto;justify-items:center;gap:0;
          padding:0 12px 10px;border:3px solid #75563b;border-radius:17px 17px 10px 10px;
          background:linear-gradient(90deg,#9a714b 0 5%,#31573f 5% 95%,#9a714b 95%);
          overflow:hidden;color:#263e2c
        }
        .post-office-six .post-office-roof{width:calc(100% + 24px);min-height:50px;display:grid;place-items:center;
          border-bottom:4px solid #75563b;border-radius:10px 10px 0 0;
          background:repeating-linear-gradient(100deg,#e9e4c8 0 22px,#457253 22px 44px)}
        .post-office-roof span{padding:3px 19px;background:#fff0cb;color:#294d35;border:2px solid #745639;border-radius:18px;font:800 16px PostalBaloo,system-ui}
        .header-board .post-office-six>img{display:block;width:min(68%,190px);height:165px;object-fit:contain;margin:-2px auto -7px}
        .post-office-counter{width:100%;padding:7px;background:var(--booth-paper,#e5d5b3);border:3px solid #795a3b;border-radius:8px;box-sizing:border-box}
        .header-board[data-open] .post-office-six .mail-sign{display:flex;justify-content:center;align-items:center;gap:6px;width:100%;min-height:44px;box-sizing:border-box;
          margin:0;transform:none;border:2px solid #1b5135;border-radius:13px;background:#286b43;color:#fff9e8;font:800 17px/1.1 system-ui;text-align:center}
        .header-board[data-open=false] .post-office-six .mail-sign{background:#8b3840;border-color:#60252b;color:#fff9e8}
        .post-office-six .side-signs{display:none}
      `;doc.head.append(style);paint();
      doc.addEventListener('click',e=>{
        if(e.target.closest('.mail-sign')){
          e.preventDefault();e.stopImmediatePropagation();
          const board=doc.querySelector('.header-board'),open=board.dataset.open!=='true';
          board.dataset.open=String(open);
          const sign=board.querySelector('.mail-sign');sign.lastChild.textContent=open?' Open to mail':' Closed to mail';sign.querySelector('span').textContent=open?'●':'⊘';return;
        }
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
