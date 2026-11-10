import {escapeHtml} from '../domain.mjs';
export function loadingDots(extra=''){
 return '<span class="mail-loading-dots '+extra+'" aria-hidden="true"><i></i><i></i><i></i></span>';
}
export function mailLoading(label='Opening reply…'){
 return '<div class="mail-opening" role="status" aria-live="polite" aria-busy="true" aria-label="'+escapeHtml(label||'Loading')+'">'+(label?'<span>'+escapeHtml(label)+'</span>':'')+loadingDots()+'</div>';
}
const activeButtons=new WeakMap(),activeStatus=new WeakMap();
export function loadingButton(button,label=button?.textContent?.trim()||'Loading'){
 if(!button||activeButtons.has(button))return ()=>{};
 const disabled=button.disabled,busy=button.getAttribute('aria-busy'),name=button.getAttribute('aria-label');
 const ink=button.style.getPropertyValue('--loading-ink');button.style.setProperty('--loading-ink',getComputedStyle(button).color);
 button.insertAdjacentHTML('beforeend',loadingDots());const dots=button.lastElementChild;
 button.disabled=true;button.classList.add('button-loading');button.setAttribute('aria-busy','true');button.setAttribute('aria-label',label);
 const finish=()=>{
  if(activeButtons.get(button)!==finish)return;activeButtons.delete(button);dots.remove();button.classList.remove('button-loading');button.disabled=disabled;
  if(ink)button.style.setProperty('--loading-ink',ink);else button.style.removeProperty('--loading-ink');
  for(const [key,value] of [['aria-busy',busy],['aria-label',name]])if(value===null)button.removeAttribute(key);else button.setAttribute(key,value);
 };
 activeButtons.set(button,finish);return finish;
}
export function loadingStatus(node,label){
 if(!node)return ()=>{};activeStatus.get(node)?.();node.textContent=label;node.insertAdjacentHTML('beforeend',loadingDots());
 const dots=node.lastElementChild,busy=node.getAttribute('aria-busy');node.classList.add('loading-status');node.setAttribute('aria-busy','true');
 const finish=()=>{if(activeStatus.get(node)!==finish)return;activeStatus.delete(node);dots.remove();node.classList.remove('loading-status');if(busy===null)node.removeAttribute('aria-busy');else node.setAttribute('aria-busy',busy);};
 activeStatus.set(node,finish);return finish;
}
