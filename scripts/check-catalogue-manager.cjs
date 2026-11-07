const assert=require('node:assert/strict');
const {randomBytes,createHash}=require('node:crypto');
const {chromium}=require('playwright');

(async()=>{
  const base=new URL(process.argv[2]||'http://localhost:3000/');
  assert(['localhost','127.0.0.1'].includes(base.hostname));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  try{
    const page=await browser.newPage({viewport:{width:384,height:751},serviceWorkers:'block'});
    const code=Array.from(randomBytes(32),n=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[n%32]).join('');
    let categories=['Uncategorised','Notes','Photo frames','Flowers','Postcards','Pigeons','Love notes','Reminders'].map((name,i)=>({id:i+1,name}));
    const items=new Map(),files=new Map(),errors=[],unexpected=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route(/^https?:/,async route=>{
      const req=route.request(),u=new URL(req.url()),path=u.pathname.slice('/api/catalogue/'.length);
      if(u.origin!==base.origin){return route.abort();}
      if(!u.pathname.startsWith('/api/catalogue/'))return route.continue();
      const result=(json,status=200)=>route.fulfill({status,json});
      const id=path.split('/')[1];
      if(req.method()==='GET'&&path==='items')return result({items:[...items.values()],categories,more:false});
      if(req.method()==='GET'&&path.startsWith('files/'))return route.fulfill({contentType:'image/png',body:files.get(id)});
      if(req.method()!=='POST')return result({},405);
      if(req.headers().authorization!=='Bearer '+code)return result({error:'Invalid owner code.'},403);
      if(path==='unlock')return result({ok:true});
      if(path.startsWith('files/')){
        const bytes=req.postDataBuffer();
        if(createHash('sha256').update(bytes).digest('hex')!==id)return result({error:'Unexpected data.'},400);
        files.set(id,bytes);items.set(id,{id,kind:'sticker',category:'Uncategorised',tags:[],name:'',width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),seq:1});
        return result(items.get(id));
      }
      const body=req.postDataJSON();
      if(path==='categories'){
        if(body.action==='create')categories.push({id:categories.length+1,name:body.name});
        if(body.action==='rename')categories.find(c=>c.name===body.from).name=body.name;
        if(body.action==='delete')categories=categories.filter(c=>c.name!==body.from);
        return result({ok:true});
      }
      if(path.startsWith('items/')){
        const old=items.get(id);
        if(old.seq!==body.seq)return result({error:'Stale'},409);
        items.set(id,{...old,...body,seq:old.seq+1});return result(items.get(id));
      }
      if(path==='bulk'){
        for(const target of body.ids){
          if(body.action==='delete')items.delete(target);
          else{
            const old=items.get(target);old.category=body.category||old.category;old.kind=body.kind||old.kind;old.seq++;
            if(body.tags)old.tags=body.tags;
          }
        }
        return result({ok:true});
      }
      unexpected.push(path);return result({},404);
    });
    await page.goto(base.href);
    await page.locator('[data-action=tab][data-id=settings]').click();
    await page.locator('[data-action=art-uploads]').click();
    const manager=page.locator('#art-upload'),action=name=>manager.locator('[data-art='+name+']');
    assert.equal(await action('choose').count(),0);
    await manager.getByLabel('Owner code').fill('WRONG');
    await manager.getByRole('button',{name:'Unlock manager'}).click();
    await manager.getByText('Invalid owner code.').waitFor();
    await manager.getByLabel('Owner code').fill(code);
    await manager.getByRole('button',{name:'Unlock manager'}).click();
    await manager.getByText('Main library · 221 pictures').waitFor();
    await action('categories').click();
    await manager.locator('[data-create] input').fill('Sample frames');await manager.getByRole('button',{name:'Create category'}).click();
    await manager.locator('[data-category-edit] select').selectOption('Sample frames');
    await manager.locator('[data-category-edit] input').fill('Keepsakes');
    await manager.getByRole('button',{name:'Rename',exact:true}).click();
    await manager.locator('[data-category-edit] option[value=Keepsakes]').waitFor({state:'attached'});
    await action('cancel-edit').click();
    const pngs=await page.evaluate(()=>['#3388cc','#ee5522'].map(colour=>{
      const c=document.createElement('canvas');c.width=1500;c.height=850;const ctx=c.getContext('2d');ctx.fillStyle=colour;ctx.fillRect(0,0,c.width,c.height);
      return c.toDataURL().split(',')[1];
    }));
    const originals=pngs.map(s=>Buffer.from(s,'base64'));
    const ids=originals.map(b=>createHash('sha256').update(b).digest('hex'));
    await manager.locator('[data-png]').setInputFiles(originals.map((buffer,i)=>({name:'art-'+i+'.png',mimeType:'image/png',buffer})));
    await manager.getByText('2 of 2 uploaded.').waitFor();
    await manager.getByText('Main library · 223 pictures').waitFor();
    for(let i=0;i<ids.length;i++)assert.deepEqual(files.get(ids[i]),originals[i]);
    await manager.locator('[data-filter]').selectOption('Uncategorised');
    await action('select').click();await action('page-select').click();
    await manager.locator('[data-dest]').selectOption('Keepsakes');
    await manager.locator('[data-bulk-tags]').fill('artwork, test');
    await action('move').click();
    await manager.getByText('Pictures updated.').waitFor();
    for(const id of ids){assert.equal(items.get(id).category,'Keepsakes');assert.deepEqual(items.get(id).tags,['artwork','test']);}
    await manager.locator('[data-filter]').selectOption('Keepsakes');
    await manager.locator('[data-item="'+ids[0]+'"]').click();
    await manager.locator('[data-name]').fill('Blue mail');await manager.locator('[data-tags]').fill('ocean, summer');
    await action('save-edit').click();await manager.getByText('Picture updated.').waitFor();
    await manager.locator('[data-search]').fill('summer');
    assert.deepEqual(await manager.locator('[data-item]').evaluateAll(els=>els.map(e=>e.dataset.item)),[ids[0]]);
    await manager.locator('[data-search]').fill('');await action('select').click();await action('page-select').click();
    page.once('dialog',d=>d.accept());await action('delete').click();
    await manager.getByText('Pictures deleted.').waitFor();await manager.getByText('No pictures match this view.').waitFor();
    assert.equal(items.size,0);
    await action('lock').click();await manager.getByLabel('Owner code').waitFor();
    assert.equal(await manager.locator('[data-png]').count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
    console.log('Mock owner authentication, category creation/rename, original batch uploads, bulk move, tag search, bulk deletion and re-lock passed.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
