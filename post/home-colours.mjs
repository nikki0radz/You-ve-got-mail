const KEY='pigeon.home.colours.v2';
const PALETTE=[['Magnolia','#f8f1dd'],['Cream','#fff9ed'],['Pale sage','#e5efe7'],['Soft lagoon','#c9ddd1'],['Lagoon','#a1c6bc'],['Mauve','#dbc6d4'],['Peach','#f2d5bf'],['Slate','#667a78'],['Moss','#597c66'],['Forest','#365a40'],['Deep forest','#283f32'],['Midnight','#111c19']];
const valid=v=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v);
function read(){try{const value=JSON.parse(localStorage.getItem(KEY)||'{}');return Object.fromEntries(['light','dark'].map(mode=>[mode,Object.fromEntries(['page','carousel'].filter(k=>valid(value?.[mode]?.[k])).map(k=>[k,value[mode][k].toLowerCase()]))]))}catch{return {light:{},dark:{}}}}
function luminance(hex){const rgb=hex.match(/[\da-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
function ink(hex){const l=luminance(hex),dark='#20342a',light='#fff9ed';if((l+.05)/(luminance(dark)+.05)>=4.5)return dark;if((luminance(light)+.05)/(l+.05)>=4.5)return light;return (l+.05)/.05>=1.05/(l+.05)?'#000000':'#ffffff'}
export function setupHomeColours({app,getTheme,setTheme,isHome}){
  let colours=read(),target='page';
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(colours))}catch{}}
  function apply(){
    const page=colours[getTheme()]?.page,carousel=colours[getTheme()]?.carousel;
    for(const name of ['--mm-bg','--mm-text','--mm-sub','--shop-card','--shop-ink','--home-selected'])app.style.removeProperty(name);
    app.removeAttribute('data-custom-home');if(!isHome())return;
    if(page){const text=ink(page);app.style.setProperty('--mm-bg',page);app.style.setProperty('--mm-text',text);app.style.setProperty('--mm-sub',text);app.style.setProperty('--home-selected',(text==='#20342a'||text==='#000000')?'#ffffff77':'#ffffff33');app.dataset.customHome='';}
    if(carousel){app.style.setProperty('--shop-card',carousel);app.style.setProperty('--shop-ink',ink(carousel));}
  }
  const panel=document.createElement('dialog');panel.className='home-colour-dialog';panel.setAttribute('aria-label','Home colours');document.body.append(panel);
  function redraw(){
    const mode=getTheme(),value=colours[mode][target]||'';
    panel.innerHTML='<header><strong>Home colours</strong><button type="button" data-close aria-label="Close colours">×</button></header><p>Try colours on your phone. Each mode saves separately.</p><div class="home-colour-tabs" aria-label="Colour mode"><button type="button" data-mode="light">☀ Light</button><button type="button" data-mode="dark">☾ Dark</button></div><div class="home-colour-tabs" aria-label="Area to colour"><button type="button" data-target="page">Background</button><button type="button" data-target="carousel">Carousel</button></div><p class="home-colour-current"></p><div class="home-colour-swatches" role="group" aria-label="Colour choices"></div><label class="home-colour-custom">Custom colour <input type="color" aria-label="Custom colour"></label><div class="home-colour-actions"><button type="button" data-reset>Original colour</button><button type="button" data-share>Share colours</button><button type="button" data-done>Done</button></div>';
    panel.querySelectorAll('[data-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.mode===mode));b.onclick=()=>{if(mode!==b.dataset.mode)setTheme(b.dataset.mode);apply();redraw()}});
    panel.querySelectorAll('[data-target]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.target===target));b.onclick=()=>{target=b.dataset.target;redraw()}});
    const idx=PALETTE.findIndex(([,v])=>v===value);panel.querySelector('.home-colour-current').textContent=(mode==='light'?'Light':'Dark')+' · '+(target==='page'?'Background':'Carousel')+' · '+(idx>=0?(idx+1)+' '+PALETTE[idx][0]:value||'Original');
    const holder=panel.querySelector('.home-colour-swatches');PALETTE.forEach(([name,hex],i)=>{const b=document.createElement('button');b.type='button';b.style.background=hex;b.style.color=ink(hex);b.textContent=String(i+1);b.title=name+' · '+hex;b.setAttribute('aria-label',(i+1)+' '+name+' '+hex);b.setAttribute('aria-pressed',String(value===hex));b.onclick=()=>{colours[mode][target]=hex;persist();apply();redraw()};holder.append(b)});
    const custom=panel.querySelector('input[type=color]');custom.value=value||(target==='page'?(mode==='light'?'#a1c6bc':'#111c19'):(mode==='light'?'#e4f1e9':'#9eafa1'));
    custom.oninput=()=>{colours[mode][target]=custom.value;persist();apply();panel.querySelector('.home-colour-current').textContent=(mode==='light'?'Light':'Dark')+' · '+(target==='page'?'Background':'Carousel')+' · '+custom.value;};custom.onchange=redraw;
    panel.querySelector('[data-reset]').onclick=()=>{delete colours[mode][target];persist();apply();redraw()};
    panel.querySelector('[data-close]').onclick=panel.querySelector('[data-done]').onclick=()=>panel.close();
    panel.querySelector('[data-share]').onclick=()=>{const payload=JSON.stringify({format:'pigeon-post.home-colours',version:1,colours},null,2);if(window.Pigeon?.shareDesign)window.Pigeon.shareDesign(payload);else {const blob=new Blob([payload],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pigeon-post-home-colours.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}};
  }
  function open(which){target=which;redraw();if(!panel.open)panel.showModal()}
  app.addEventListener('click',e=>{
    if(!isHome())return;const el=e.target;
    if(el.closest('[data-home-colours]')){open('page');return}
    if(el.closest('button,a,input,label,select,textarea,.category-reel,.post-office-controls,.postal-theme,.profile-link'))return;
    if(el.closest('#home-wheel .wheel-paper'))open('carousel');
    else if(el===app||el.matches('.page-content,.header-board,.courier-stand,.wheel,.postal-header,.draft-label'))open('page');
  });
  return {apply,close:()=>{if(!panel.open)return false;panel.close();return true}};
}
