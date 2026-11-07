const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
  const base=new URL(process.argv[2]||'http://localhost:3000/');
  assert(['localhost','127.0.0.1'].includes(base.hostname));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  try{
    const context=await browser.newContext({viewport:{width:384,height:751},serviceWorkers:'block'});
    const errors=[],writes=[];let manifest=[];
    await context.route('**/api/catalogue/**',route=>{
      if(route.request().method()!=='GET')writes.push(route.request().method());
      const after=new URL(route.request().url()).searchParams.get('after')||'';
      const list=manifest.filter(item=>item.id>after).sort((a,b)=>a.id.localeCompare(b.id,'en-US'));
      return route.fulfill({json:{items:list.slice(0,200),more:list.length>200,categories:[]}});
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base.href);
    const records=await page.evaluate(async()=>{
      const {catalogueRecords,catalogueThumbnail,catalogueImage}=await import('./shop/catalogue.mjs');
      const rows=await catalogueRecords({includeHidden:true});
      const samples=rows.filter(r=>!r.design.master);
      const representative=samples.find(r=>r.design.artClip)||samples[0];
      const shot=await catalogueImage(representative.design);
      return {ids:rows.map(r=>r.id),records:rows.map(({id,name,category})=>({id,name,category})),
        allThumbnails:rows.every(r=>/<(img|svg)\b/.test(catalogueThumbnail(r.design))),
        source:[shot.width,shot.height],expected:[representative.width,representative.height],sprites:samples.length};
    });
    assert.equal(records.ids.length,221);assert.equal(new Set(records.ids).size,221);assert(records.allThumbnails&&records.sprites>0);
    assert.deepEqual(records.source,records.expected);
    const frame=records.records.find(item=>item.name==='Instant print'),second=records.records.find(item=>item.name==='Tape deck');
    manifest=[{id:frame.id,category:'Keepsakes',name:'Renamed frame',seq:1},{id:second.id,hidden:true,seq:1,category:'Photo frames'}];
    const note=records.records.find(item=>item.category==='Notes');
    manifest.push({id:note.id,category:'Frames',name:'Renamed note',kind:'sticker',textArea:null,seq:1});
    const refresh=()=>page.evaluate(async()=>{const {refreshAfterWrite}=await import('./shop/main-art.mjs');await refreshAfterWrite();});
    await refresh();
    const tile=page.locator('#home-wheel .category-reel button[aria-label$="keepsakes"]').first();
    await tile.waitFor({state:'attached'});
    const view=await page.evaluate(async()=>{
      const api=await import('./shop/catalogue.mjs'),list=await api.catalogueRecords(),all=await api.catalogueRecords({includeHidden:true});
      const row=list.find(r=>r.name==='Renamed frame');
      return {visible:list.length,all:all.length,removed:list.some(r=>r.name==='Tape deck'),kind:row.kind,
        category:row.design.category,thumbnail:api.catalogueThumbnail(row.design),
        note:list.find(r=>r.name==='Renamed note').design};
    });
    assert.equal(view.visible,220);assert.equal(view.all,221);assert(!view.removed);assert.equal(view.kind,'frame');
    assert.equal(view.note.category,'shared/Frames');assert.equal(view.note.deliveryKind,'a note');assert(view.note.notePaper&&view.note.textBox);
    assert.equal(view.category,'shared/Keepsakes');assert(view.thumbnail.includes('wheel-031.webp'));

    for(const audience of ['app','reply','guest']){
      if(audience==='guest')await page.goto(new URL('guest.html?preview=1',base).href);
      if(audience==='guest'){
        await page.locator('#accept').click();
        await page.locator('#steps .category-reel button[aria-label$="keepsakes"]').first().waitFor({state:'attached'});
      }
      await page.evaluate(async audience=>{
        const {openShop}=await import('./shop/shop.mjs');
        await openShop(()=>{},'shared/Keepsakes',audience==='guest'?true:{studio:true,curated:audience==='reply'});
      },audience);
      await page.getByRole('button',{name:/Use Renamed frame/}).click();
      await page.locator('[data-upload]').waitFor();
      await page.evaluate(()=>document.querySelector('#parcel-shop').close());
      await page.locator('#parcel-shop').waitFor({state:'hidden'});
    }
    // Deleting a category's final item must update the open picker.
    await page.evaluate(async()=>{const {openShop}=await import('./shop/shop.mjs');await openShop(()=>{},'shared/Keepsakes',true);});
    manifest=records.records.map(({id,category})=>({id,category,hidden:true,seq:2}));
    await refresh();
    await page.locator('#parcel-shop .empty-library').waitFor();
    assert.equal(await page.locator('#parcel-shop .frame-use').count(),0);
    await page.evaluate(()=>document.querySelector('#parcel-shop').close());
    await page.locator('#steps .wheel .caption').filter({hasText:'No artwork'}).waitFor();
    await page.goto(base.href);
    await page.locator('#home-wheel .caption').filter({hasText:'No artwork'}).waitFor();
    await page.evaluate(async()=>{const {openReplyShop}=await import('./shop/shop.mjs');await openReplyShop(()=>{});});
    await page.locator('#parcel-shop .caption').filter({hasText:'No artwork'}).waitFor();
    assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
    console.log('221 stable builtin IDs, cropped thumbnails, public changes across app/guest/reply and fully empty catalogue passed.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
