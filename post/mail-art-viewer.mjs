import {fitPreview} from '../shop/preview-image.mjs';
import {mailLoading} from './mail-loading.mjs';

let stylesReady;
function prepareStyles(){
 if(stylesReady)return stylesReady;
 let sheet=document.querySelector('[data-mail-art-styles]');
 if(sheet?.sheet)return Promise.resolve();
 stylesReady=new Promise((resolve,reject)=>{
  if(!sheet){sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./mail-art-viewer.css',import.meta.url).href;sheet.dataset.mailArtStyles='';}
  sheet.addEventListener('load',resolve,{once:true});sheet.addEventListener('error',()=>{stylesReady=null;sheet.remove();reject(Error('Picture viewer could not load.'));},{once:true});
  if(!sheet.isConnected)document.head.append(sheet);
 });
 return stylesReady;
}
// Load the layout with the mailbox module, before a picture is opened.
prepareStyles().catch(()=>{});

// Reveal once the full-size layout, trimmed pixels and final image are ready.
export async function enlargeMailArtwork(dialog){
 const image=dialog.querySelector('.mail-proof');if(!image)return false;
 image.style.visibility='hidden';
 dialog.dataset.mailArtViewer='';
 const stage=document.createElement('div');stage.className='mail-art-stage';stage.setAttribute('aria-busy','true');
 stage.innerHTML=mailLoading('Opening picture…');image.before(stage);stage.append(image);
 try{
  await prepareStyles();await fitPreview(image);await image.decode();
  if(!stage.isConnected||!dialog.open)return false;
  stage.querySelector('.mail-opening')?.remove();stage.removeAttribute('aria-busy');image.style.visibility='';
  return true;
 }catch{
  if(stage.isConnected){stage.querySelector('.mail-opening')?.remove();stage.removeAttribute('aria-busy');const error=document.createElement('p');error.className='mail-image-error';error.setAttribute('role','alert');error.textContent='The picture could not open. Close and reopen it, or tap Refresh reply.';stage.append(error);}
  return false;
 }
}
