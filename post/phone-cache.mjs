import {idleTurn} from '../shop/ui-tasks.mjs';
export function createPhoneCache({bridge,yieldControl=idleTurn,changed=()=>{}}){
 let rows=[],friends={},loaded=false,pending=null,signature='';
 const seen=new Set(),writes=new Set();let writing=null;
 function flush(){if(writing)return writing;writing=(async()=>{while(writes.size){await yieldControl();for(const id of [...writes].slice(0,8)){bridge()?.markRead(id);writes.delete(id);}}})().finally(()=>{writing=null;});return writing;}
 return {
  rows:()=>rows,friends:()=>friends,ready:()=>loaded,wasRead:id=>seen.has(id),
  markRead(id){seen.add(id);writes.add(id);changed();flush().catch(()=>{});},
  refresh(){if(pending)return pending;pending=(async()=>{
   const phone=bridge();if(!phone?.mailbox)return false;
   await yieldControl();await flush();const raw=phone.mailbox(),next=JSON.parse(raw);
   await yieldControl();const bookRaw=phone.friendsCached(),book=JSON.parse(bookRaw);
   for(let i=0;i<next.length;i+=8){await yieldControl();for(const row of next.slice(i,i+8))if(!seen.has(row.id)&&phone.wasRead(row.id))seen.add(row.id);}
   const key=raw+bookRaw+next.map(row=>seen.has(row.id)?'1':'0').join('');
   rows=next;friends=book;loaded=true;if(key!==signature){signature=key;changed();return true;}return false;
  })().finally(()=>{pending=null;});return pending;}
 };
}
export const phoneCache=createPhoneCache({bridge:()=>window.Pigeon,changed:()=>window.dispatchEvent(new Event('phone-mail-updated'))});
