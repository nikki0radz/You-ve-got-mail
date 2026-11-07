const service = 'https://pigeon-post-delivery.nikki0radz.chatgpt.site/api/art';
const endpoint = location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? '/api/art' : service;
const pref = 'pigeon.shared-art.library.v1';
let dbPromise;
function database() {
  if (!dbPromise) dbPromise = new Promise((resolve,reject) => {
    const req = indexedDB.open('pigeon.shared-art.v1',1);
    req.onupgradeneeded = () => {
      for (const store of ['items','queue']) req.result.createObjectStore(store,{keyPath:['scope','id']}).createIndex('scope','scope');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch(err=>{dbPromise=null;throw err;});
  return dbPromise;
}
async function transaction(store,mode,work) {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode);
    let result;
    tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(tx.error || Error('Device storage unavailable.'));
    tx.onerror=()=>reject(tx.error);
    work(tx.objectStore(store),value=>{result=value;});
  });
}
export const saveEntry=(store,row)=>transaction(store,'readwrite',s=>s.put(row));
export const deleteEntry=(store,scope,id)=>transaction(store,'readwrite',s=>s.delete([scope,id]));
export const readEntry=(store,scope,id)=>transaction(store,'readonly',(s,done)=>{const q=s.get([scope,id]);q.onsuccess=()=>done(q.result);});
async function visit(store,scope,each){
  return transaction(store,'readonly',s=>{
    const request=s.index('scope').openCursor(IDBKeyRange.only(scope));
    request.onsuccess=()=>{const cursor=request.result;if(cursor){each(cursor.value);cursor.continue();}};
  });
}
export async function listQueue(scope){
  const rows=[];await visit('queue',scope,({blob,...info})=>rows.push(info));
  return rows.sort((a,b)=>a.order-b.order);
}
export const libraryCode=()=>localStorage.getItem(pref)||'';
let active='', known=new Map(), cursor=0, pending, hydrated=false;
function reset(scope){
  for(const item of known.values()) URL.revokeObjectURL(item.src);
  active=scope;cursor=0;hydrated=false;known=new Map();
  window.dispatchEvent(new Event('shared-art-updated'));
}
export const sharedItems=()=>Array.from(known.values());
function addLocal(row){
  const existing=known.get(row.id);
  if (active!==row.scope || (existing && existing.seq>=row.seq)) return false;
  const {blob,scope,...metadata}=row;
  known.set(row.id,{...metadata,src:existing?.src || URL.createObjectURL(blob)});return true;
}
// A refresh and an edit can finish in either order. Keep the newest metadata on disk.
async function cacheOriginal(row) {
  await transaction('items','readwrite',s=>{
    const lookup=s.get([row.scope,row.id]);
    lookup.onsuccess=()=>{if (!lookup.result || lookup.result.seq<=row.seq) s.put(row);};
  });
  if(addLocal(row)) window.dispatchEvent(new Event('shared-art-updated'));
}
export async function updateArtwork(entry,values) {
  const res=await api(entry.scope,'/items/'+entry.id+'?revision='+entry.seq,{
    method:'POST',headers:{'X-Art-Meta':encodeURIComponent(JSON.stringify(values))}
  });
  await cacheOriginal({...await res.json(),scope:entry.scope,blob:entry.blob});
}
async function api(scope,path,options={}){
  const res=await fetch(endpoint+path,{...options,cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+scope,...options.headers}});
  if (!res.ok) {
    const message=await res.json().catch(()=>({}));
    throw Object.assign(Error(message.error || 'Artwork service is unavailable. Try again.'),{status:res.status});
  }
  return res;
}
export async function connectLibrary(code,create=false){
  const scope=code.replace(/[\s-]/g,'').toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(scope)) throw Error('Paste the full library code from the other phone.');
  await api(scope,create?'/create':'/items',create?{method:'POST'}:{});
  localStorage.setItem(pref,scope);
  if(active!==scope) reset(scope);
  refreshSharedArt().catch(()=>{});
}
export function newCode(){
  return Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
}
async function refresh(scope) {
  if(!hydrated){
    await visit('items',scope,row=>{if (scope===active){addLocal(row);}});
    if (scope!==active) return;
    hydrated=true;
    if(known.size) window.dispatchEvent(new Event('shared-art-updated'));
  }
  // Advance the cursor only through consecutive, successfully cached originals.
  let more;
  do {
    const page=await (await api(scope,'/items?after='+cursor)).json();
    more=page.more;
    for(const item of page.items) {
      if(scope!==active) return;
      if((known.get(item.id)?.seq || 0)<item.seq){
        const existing=await readEntry('items',scope,item.id);
        const blob=existing?.blob || await (await api(scope,'/items/'+item.id)).blob();
        await cacheOriginal({...item,scope,blob});
      }
      if(scope!==active) return;
      cursor=item.seq;
    }
  } while(more && scope===active);
}
export function refreshSharedArt(){
  const scope=libraryCode();if(!scope) return Promise.resolve();
  if(scope!==active) reset(scope);
  if(pending?.scope===scope) return pending.promise;
  const task={scope};pending=task;
  task.promise=refresh(scope).finally(()=>{if(pending===task)pending=null;});return task.promise;
}

export async function publishEntry(row){
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await row.blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
  const {kind,category,name,textArea}=row;
  const res=await api(row.scope,'/items/'+hash,{
    method:'POST',headers:{'Content-Type':'image/png','X-Art-Meta':encodeURIComponent(JSON.stringify({kind,category,name,textArea}))},body:row.blob
  });
  const record=await res.json();
  const saved={...record,scope:row.scope,blob:row.blob};
  await cacheOriginal(saved);
  await deleteEntry('queue',row.scope,row.id);
  return record;
}
