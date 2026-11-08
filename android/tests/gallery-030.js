localStorage.setItem('pigeon.main-art.owner','off-device-test-only');
const originalFetch=window.fetch.bind(window),checks=[];
const qaShow=s=>{
 let note=document.getElementById('qa-note');if(!note){note=document.createElement('p');note.id='qa-note';}
 (document.querySelector('dialog[open]')||document.body).append(note);
 note.textContent=s;
};
window.fetch=async (url,opts={})=>{
 const u=new URL(url,location.href);
 if(u.origin===location.origin)return originalFetch(url,opts);
 if(u.pathname==='/api/catalogue/items')return Response.json({items:[],categories:[{id:1,name:'Uncategorised'}],more:false});
 if(u.pathname.startsWith('/api/catalogue/files/')&&opts.method==='POST'){
  const blob=opts.body,bytes=await blob.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const id=u.pathname.split('/').pop();if(id!==hash)throw Error('Artwork bytes changed while preparing batch.');
  checks.push(hash);localStorage.setItem('qa-batch',JSON.stringify(checks));
  return Response.json({id,kind:'sticker',category:'Uncategorised',name:'',seq:1});
 }
 throw Error('Offline QA fixture');
};
document.addEventListener('DOMContentLoaded',()=>{
 let last='';
 setInterval(()=>{const batch=JSON.parse(localStorage.getItem('qa-batch')||'[]');if(batch.length!==2)return;
  const feedback=document.querySelector('.art-feedback');if(!feedback || !feedback.textContent.includes('2 of 2 uploaded'))return;
  if(last===String(batch))return;last=String(batch);qaShow('Verified batch '+batch.slice().sort().join(' '));
  const single=document.createElement('input');single.type='file';single.accept='image/*';single.hidden=true;
  single.onchange=async()=>{const f=single.files[0];if(f)qaShow('Verified single '+f.type+' '+(await f.arrayBuffer()).byteLength);};
  const b=document.createElement('button');b.textContent='Check single photo';b.onclick=()=>single.click();
  document.getElementById('qa-note').after(b,single);
 },200);
});
