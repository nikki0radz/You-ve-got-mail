import {fitPreview} from '../shop/preview-image.mjs';
import {watchImage} from '../shop/ui-tasks.mjs';

// Inbox viewing ignores the sender's overlay placement and size. The original
// saved PNG remains intact; fitPreview trims only this displayed image.
export function enlargeMailArtwork(dialog){
 const image=dialog.querySelector('.mail-proof');if(!image)return;
 if(!document.querySelector('[data-mail-art-styles]')){
  const sheet=document.createElement('link');sheet.rel='stylesheet';
  sheet.href=new URL('./mail-art-viewer.css',import.meta.url).href;
  sheet.dataset.mailArtStyles='';document.head.append(sheet);
 }
 dialog.dataset.mailArtViewer='';
 const stage=document.createElement('div');stage.className='mail-art-stage';
 image.before(stage);stage.append(image);
 watchImage(image,stage);fitPreview(image);
}
