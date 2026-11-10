import {loadingDots} from '../post/mail-loading.mjs';
let lastInput=-Infinity;
if(typeof window!=='undefined')for(const type of ['pointerdown','keydown'])window.addEventListener(type,()=>{lastInput=performance.now();},{capture:true,passive:true});
// Leave a quiet turn between image/native jobs so queued taps paint first.
export function idleTurn(){return new Promise(resolve=>{
 const wait=()=>{if(performance.now()-lastInput<100){setTimeout(wait,100);return;}
  if(typeof requestIdleCallback==='function')requestIdleCallback(()=>resolve(),{timeout:800});else setTimeout(resolve,16);
 };setTimeout(wait,0);
});}
const imageJobs=new WeakMap();
export function watchImage(image,host=image.parentElement){
 if(!host)return;imageJobs.get(image)?.();image.decoding='async';host.classList.add('art-pending');host.setAttribute('aria-busy','true');
 const marker=document.createElement('span');marker.innerHTML=loadingDots('art-loading-dots');const dots=marker.firstElementChild;host.append(dots);
 const done=()=>{if(imageJobs.get(image)!==done)return;imageJobs.delete(image);dots.remove();host.classList.remove('art-pending');host.removeAttribute('aria-busy');image.removeEventListener('load',done);image.removeEventListener('error',done);};
 imageJobs.set(image,done);image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});
 if(image.complete)queueMicrotask(done);
}
