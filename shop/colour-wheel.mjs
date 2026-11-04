// The wheel controls hue (angle) and saturation (radius); the strip controls brightness.
function hsv(hex){
  const [r,g,b]=hex.match(/[\da-f]{2}/gi).map(v=>parseInt(v,16)/255),v=Math.max(r,g,b),d=v-Math.min(r,g,b);
  const sector=d===0?0:v===r?(g-b)/d:v===g?(b-r)/d+2:(r-g)/d+4;
  return {h:(sector*60+360)%360,s:v?d/v:0,v};
}
function hex({h,s,v}){
  const channel=n=>{const k=(n+h/60)%6;return Math.round(255*v*(1-s*Math.max(0,Math.min(k,4-k,1)))).toString(16).padStart(2,'0');};
  return '#'+[5,3,1].map(channel).join('');
}
const limit=v=>Math.max(0,Math.min(1,v));
export function colourButton(label,accessible,initial,apply){
  const button=document.createElement('button');button.type='button';button.className='colour-chip';button.setAttribute('aria-label',accessible);button.setAttribute('aria-haspopup','dialog');
  const swatch=document.createElement('i');swatch.setAttribute('aria-hidden','true');swatch.style.backgroundColor=initial;button.append(label,swatch);
  button.onclick=()=>{
    const value=hsv(initial),dialog=document.createElement('dialog');dialog.className='ink-picker';dialog.setAttribute('aria-label',accessible);
    dialog.innerHTML='<h2></h2><div class="ink-disc" tabindex="0" role="group" aria-label="Hue and saturation. Left and right change hue, up and down change saturation."><i></i></div><label>Brightness<input type="range" min="0" max="100"></label><output aria-live="off"></output><div class="ink-actions"><button type="button" data-cancel>Cancel</button><button type="button" data-apply>Use colour</button></div>';
    dialog.querySelector('h2').textContent=accessible;
    const disc=dialog.querySelector('.ink-disc'),dot=disc.firstElementChild,slider=dialog.querySelector('input'),output=dialog.querySelector('output');
    function paint(){
      const ang=value.h*Math.PI/180;dot.style.left=(50+49*value.s*Math.sin(ang))+'%';dot.style.top=(50-49*value.s*Math.cos(ang))+'%';
      disc.style.setProperty('--shade',1-value.v);slider.value=Math.round(100*value.v);slider.style.setProperty('--bright',hex({...value,v:1}));
      output.textContent=hex(value).toUpperCase();output.style.setProperty('--ink',hex(value));
    }
    function point(e){const rect=disc.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width-.5,y=(e.clientY-rect.top)/rect.height-.5;value.h=(Math.atan2(x,-y)*180/Math.PI+360)%360;value.s=limit(2*Math.hypot(x,y));paint();}
    disc.onpointerdown=e=>{disc.setPointerCapture(e.pointerId);point(e);};
    disc.onpointermove=e=>{if(disc.hasPointerCapture(e.pointerId))point(e);};
    disc.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft'||e.key==='ArrowRight')value.h=(value.h+(e.key==='ArrowRight'?5:-5)+360)%360;else value.s=limit(value.s+(e.key==='ArrowUp'?.05:-.05));paint();};
    slider.oninput=()=>{value.v=slider.value/100;paint();};
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    dialog.querySelector('[data-apply]').onclick=()=>{initial=hex(value);swatch.style.backgroundColor=initial;apply(initial);dialog.close();};
    dialog.onclose=()=>{dialog.remove();button.focus();};document.body.append(dialog);dialog.showModal();paint();disc.focus();
  };return button;
}
