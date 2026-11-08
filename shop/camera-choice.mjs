export function offerCamera(input){
 if(!input||input.dataset.cameraOffered)return;
 if(window.Pigeon){try{if(!JSON.parse(Pigeon.deliveryPrefs()).cameraCapture)return;}catch{return;}}
 input.dataset.cameraOffered='true';
 const button=document.createElement('button');button.type='button';button.className='studio-link camera-choice';button.textContent='Take photo';
 const capture=document.createElement('input');capture.type='file';capture.accept='image/*';capture.setAttribute('capture','user');capture.hidden=true;
 (input.closest('label')||input).after(button,capture);button.onclick=()=>capture.click();
 capture.onchange=()=>{if(!capture.files?.length)return;input.files=capture.files;input.dispatchEvent(new Event('change',{bubbles:true}));capture.value='';};
}
