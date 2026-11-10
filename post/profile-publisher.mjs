// Keep the latest selection queued while encoding/uploading, and retry failed uploads.
export function createProfilePublisher({supported,encode,publish,changed=()=>{}}){
 let desired='',published='',pending=null,status='idle';
 function updateStatus(value){if(value!==status){status=value;changed(value);}}
 function drain(){
  if(!desired)return Promise.resolve(false);
  if(!supported()){updateStatus('unsupported');return Promise.resolve(false);}
  if(pending)return pending;
  if(desired===published){updateStatus('shared');return Promise.resolve(true);}
  pending=(async()=>{
   while(desired!==published){
    const source=desired;updateStatus('sharing');
    try{
     const photo=await encode(source);
     if(source!==desired)continue;
     await publish(photo);published=source;
    }catch{
     if(source!==desired)continue;
     updateStatus('waiting');return false;
    }
   }
   updateStatus('shared');return true;
  })().finally(()=>{pending=null;});return pending;
 }
 return {update(source){desired=source;return drain();},retry:drain,status:()=>status};
}
