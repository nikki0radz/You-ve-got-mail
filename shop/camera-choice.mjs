import {openFrameCamera} from './frame-camera.mjs';
export function offerCamera(input,{item=null,uploadButton=null}={}){
 if(!input||input.dataset.cameraOffered)return;
 let native=null;if(window.Pigeon){try{native=JSON.parse(Pigeon.deliveryPrefs());if(!native.cameraCapture)return;}catch{return;}}
 input.dataset.cameraOffered='true';
 const button=document.createElement('button');button.type='button';button.className='studio-link camera-choice';button.setAttribute('aria-label','Take photo');button.innerHTML='<span aria-hidden="true">📸</span> Take photo';
 const capture=document.createElement('input');capture.type='file';capture.accept='image/*';capture.setAttribute('capture','user');capture.hidden=true;
 const group=document.createElement('div');group.className='photo-source-actions';
 const trigger=uploadButton||input.closest('label');if(trigger){trigger.before(group);group.append(trigger,button);}else{input.after(group);group.append(button);}group.after(capture);
 function deliver(file){if(!file)return;const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}
 button.onclick=async()=>{if(!native||native.embeddedCamera){const file=await openFrameCamera(item);deliver(file);}else capture.click();};
 capture.onchange=()=>{deliver(capture.files?.[0]);capture.value='';};
}
