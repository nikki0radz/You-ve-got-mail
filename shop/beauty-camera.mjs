export function createBeautyCamera(onStatus=()=>{}){
 let worker,ready=false,closed=false,next=0,failed=false;
 const pending=new Map();
 let finishStartup;const startupResult=new Promise(resolve=>{finishStartup=resolve;});
 function fail(message){if(closed||failed)return;if(message)console.warn('Natural filter:',message);failed=true;ready=false;finishStartup(false);worker?.terminate();for(const job of pending.values()){clearTimeout(job.timer);job.resolve(null);}pending.clear();onStatus('Natural filter unavailable · original photo');}
 try{
  if(!globalThis.Worker||!globalThis.createImageBitmap)throw Error();
  worker=new Worker(new URL('./beauty-worker.js',import.meta.url));
  const startup=setTimeout(fail,20000);onStatus('Loading natural filter…');
  worker.onmessage=({data})=>{
   if(closed){data.bitmap?.close();return;}
   if(data.type==='ready'){clearTimeout(startup);ready=true;finishStartup(true);onStatus('Natural filter · On');return;}
   if(data.type==='error'){clearTimeout(startup);fail(data.message);return;}
   const job=pending.get(data.id);if(!job){data.bitmap?.close();return;}pending.delete(data.id);clearTimeout(job.timer);job.resolve(data);
  };
  worker.onerror=event=>{clearTimeout(startup);fail(event.message);};worker.postMessage({type:'init'});
  return {
   get ready(){return ready;},
   waitUntilReady:()=>startupResult,
   async apply(source){
    if(!ready||closed||failed)return source;
    const bitmap=await createImageBitmap(source);if(closed||failed){bitmap.close();return source;}
    const id=++next,result=await new Promise(resolve=>{const timer=setTimeout(fail,12000);pending.set(id,{resolve,timer});worker.postMessage({type:'frame',id,bitmap},[bitmap]);});
    if(!result)return source;
    if(closed){result.bitmap.close();return source;}
    source.getContext('2d').drawImage(result.bitmap,0,0);result.bitmap.close();onStatus(result.faces?'Natural filter · On':'Natural filter · no face detected');return source;
   },
   close(){if(closed)return;closed=true;finishStartup(false);clearTimeout(startup);worker.terminate();for(const job of pending.values()){clearTimeout(job.timer);job.resolve(null);}pending.clear();}
  };
 }catch{fail();return {ready:false,waitUntilReady:()=>startupResult,apply:async source=>source,close(){closed=true;}};}
}
