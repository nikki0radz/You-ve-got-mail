let nextTicket=0;

// New APKs acknowledge the native window update. Older APKs retain their boost;
// a browser can illuminate its page but cannot override display brightness.
export function createScreenFlash({bridge,eventTarget,show,active=()=>true,boost=false,timeout=1500}){
 let cancelPending=null;
 const acknowledged=typeof bridge?.screenFlash==='function';
 return function screen(on){
  cancelPending?.();
  on=Boolean(on&&active());show(on);
  if(!acknowledged){
   if(boost)bridge.settingsAction(on?'cameraFlashOn':'cameraFlashOff');
   return;
  }
  if(!on){bridge.screenFlash(false,0);return;}
  const ticket=++nextTicket;
  return new Promise((resolve,reject)=>{
   let timer;
   function finish(error){
    clearTimeout(timer);eventTarget.removeEventListener('pigeon-screen-flash',receive);cancelPending=null;
    if(error)reject(error);else resolve();
   }
   function receive(event){
    if(event.detail?.ticket!==ticket)return;
    finish(event.detail.applied&&active()?null:Error('The screen flash could not start. Try again with flash off.'));
   }
   cancelPending=()=>finish(Error('The camera was closed.'));
   eventTarget.addEventListener('pigeon-screen-flash',receive);
   timer=setTimeout(()=>finish(Error('The screen brightness boost did not start. Try again, or turn flash off.')),timeout);
   try{bridge.screenFlash(true,ticket);}catch(error){finish(error);}
  });
 };
}
