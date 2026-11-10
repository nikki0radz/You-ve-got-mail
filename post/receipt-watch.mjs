// Poll only while its status panel is open and visible. Manual refresh remains available.
export function watchReceipt({read,draw,active,visible=()=>true,subscribe=()=>()=>{},onError=()=>{},interval=3000,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer,pending,stopped=false,complete=false;
 const stop=()=>{stopped=true;clearTimer(timer);unsubscribe();};
 function schedule(){clearTimer(timer);if(stopped||complete)return;if(!active())return stop();timer=setTimer(()=>refresh(),visible()?interval:15000);}
 function refresh(force=false){
  clearTimer(timer);if(stopped)return Promise.resolve();if(!active()){stop();return Promise.resolve();}
  if(pending)return pending;if(!force&&!visible()){schedule();return Promise.resolve();}
  pending=Promise.resolve().then(read).then(data=>{
   if(stopped||!active())return;
   draw(data);complete=Boolean(data.seenAt||data.displayedAt||data.outcome==='screen');return data;
  }).catch(error=>{if(active()&&!stopped)onError(error);}).finally(()=>{pending=null;schedule();});return pending;
 }
 const unsubscribe=subscribe(()=>{if(visible()&&!complete)refresh();});
 refresh();return {refresh:()=>refresh(true),stop};
}
