import {readEntry,saveEntry,deleteEntry} from './shared-art.mjs';

const origin=['127.0.0.1','localhost'].includes(location.hostname)?location.origin:'https://pigeon-post-delivery.nikki0radz.chatgpt.site';
const endpoint=origin+'/api/catalogue/';
const ownerKey='pigeon.main-art.owner';
export const queueScope='main-catalogue';
let records=[],categories=[],signature='',refreshing=null;
export const mainRecords=()=>records;
export const mainCategories=()=>categories;
export const ownerUnlocked=()=>Boolean(localStorage.getItem(ownerKey));
export function lockManager(){localStorage.removeItem(ownerKey);}
async function request(path,options={}){
  const res=await fetch(endpoint+path,{...options,cache:'no-store',credentials:'omit'});
  if(!res.ok){
    if(res.status===403)lockManager();
    const msg=await res.json().catch(()=>({}));throw Object.assign(Error(msg.error||'Could not reach the main library.'),{status:res.status});
  }
  return res.json();
}
export async function unlockManager(value){
  const code=value.replace(/[\s-]/g,'').toUpperCase();
  await request('unlock',{method:'POST',headers:{Authorization:'Bearer '+code}});
  localStorage.setItem(ownerKey,code);
}
function adopt(data){
  const next=JSON.stringify(data);if(next===signature)return;
  signature=next;categories=data.categories;
  records=data.items.map(r=>r.id.startsWith('builtin-')?r:{...r,src:endpoint+'files/'+r.id});
  window.dispatchEvent(new Event('shared-art-updated'));
}
let hydrated=false;
async function refresh(){
  if(!hydrated){
    const cached=await readEntry('items',queueScope,'manifest').catch(()=>null);
    if(cached)adopt(cached.data);hydrated=true;
  }
  const items=[];let page,cats;
  do{
    page=await request('items'+(items.length?'?after='+encodeURIComponent(items.at(-1).id):''));
    if(!cats)cats=page.categories;items.push(...page.items);
  }while(page.more);
  const data={items,categories:cats};adopt(data);
  await saveEntry('items',{scope:queueScope,id:'manifest',data}).catch(()=>{});
}
export function refreshMainArt(){
  if(!refreshing)refreshing=refresh().finally(()=>{refreshing=null;});
  return refreshing;
}
export async function refreshAfterWrite(){
  if(refreshing)await refreshing.catch(()=>{});
  return refreshMainArt();
}
function authorization(){return {Authorization:'Bearer '+(localStorage.getItem(ownerKey)||'')};}
export async function manage(action,body){
  return request(action,{method:'POST',headers:{...authorization(),'Content-Type':'application/json'},body:JSON.stringify(body)});
}
export async function uploadMain(entry){
  const bytes=await entry.blob.arrayBuffer();
  const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const item=await request('files/'+id,{method:'POST',headers:{...authorization(),'Content-Type':'image/png'},body:entry.blob});
  await deleteEntry('queue',queueScope,entry.id);return item;
}
