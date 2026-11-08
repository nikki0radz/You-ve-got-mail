const assert = require('node:assert/strict');
const {chromium} = require('playwright');

async function installFixtures(page) {
  return page.evaluate(async () => {
    const {openShop} = await import('./shop/shop.mjs');
    const canvas = document.createElement('canvas');
    canvas.width=240; canvas.height=160;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#dc6e42'; ctx.fillRect(0,0,240,160);
    const opaque=canvas.toDataURL();
    ctx.clearRect(0,0,240,160); ctx.fillRect(12,8,216,144);
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.ellipse(108,55,58,35,0,0,2*Math.PI); ctx.fill();
    const cutout=canvas.toDataURL();
    const defaults={width:240,height:160};
    const records=[
      {...defaults,id:'hole',name:'Cutout',category:'Photo frames',kind:'frame',src:cutout},
      {...defaults,id:'rectangle',name:'Inset',category:'Photo frames',kind:'frame',src:opaque,photoArea:{x:.56,y:.12,w:.33,h:.52}},
      {...defaults,id:'manualcard',name:'Manual postcard',category:'Postcards',kind:'postcard',src:opaque,photoArea:{x:.12,y:.16,w:.32,h:.45},textArea:{x:.5,y:.2,w:.42,h:.6,rotation:0}},
      {...defaults,id:'postcard',name:'Postcard proof',category:'Postcards',kind:'postcard',src:opaque,textArea:{x:.1,y:.65,w:.8,h:.23,rotation:0}}
    ];
    window.openFixture=async group=>{
      window.parcelProof=null;
      await openShop((src,name,category)=>{window.parcelProof={src,name,category};},group,{studio:true});
    };
    window.inspectArt=(canvas,area,points)=>{
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const [x,y,w,h]=area;
      function at(px,py) {
        return Array.from(ctx.getImageData(Math.floor((x+px*w)*canvas.width),Math.floor((y+py*h)*canvas.height),1,1).data);
      }
      let ink=0;
      for(let j=66;j<88;j++)for(let i=12;i<88;i++){
        const [r,g,b,a]=at(i/100,j/100);
        if(a>220&&r<90&&g<110&&b<90)ink++;
      }
      return {pixels:points.map(([px,py])=>at(px,py)),ink};
    };
    window.checkStock=async(element,{points,box})=>{
      await element.decode();
      const actual=document.createElement('canvas');actual.width=240;actual.height=160;
      actual.getContext('2d').drawImage(element,0,0,240,160);
      const stock=new Image();stock.src='assets/guest/wheel-031.webp';await stock.decode();
      const [x,y,w,h]=box.map((value,i)=>value*(i%2?160:240));
      const scale=Math.max(w/141,h/120);
      const expected=document.createElement('canvas');expected.width=240;expected.height=160;
      expected.getContext('2d').drawImage(stock,25,29,141,120,x+(w-141*scale)/2,y+(h-120*scale)/2,141*scale,120*scale);
      const actualCtx=actual.getContext('2d'),expectedCtx=expected.getContext('2d');
      let error=0,samples=0;
      // The inner third is well inside both the ellipse and rectangular masks.
      for(let j=.34;j<=.67;j+=.04)for(let i=.34;i<=.67;i+=.04){
        const u=Math.round(x+i*w),v=Math.round(y+j*h);
        const a=actualCtx.getImageData(u,v,1,1).data,b=expectedCtx.getImageData(u,v,1,1).data;
        for(let c=0;c<3;c++){error+=Math.abs(a[c]-b[c]);samples++;}
      }
      return {error:error/samples,pixels:window.inspectArt(actual,[0,0,1,1],points).pixels};
    };
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='#258ae4';ctx.fillRect(0,0,240,160);
    return {records,photo:canvas.toDataURL().split(',')[1]};
  });
}

(async()=>{
  const base=new URL(process.argv[2]||'http://localhost:3000/');
  assert(['localhost','127.0.0.1'].includes(base.hostname),'This test requires a local fixture server');
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  try{
    const page=await browser.newPage({viewport:{width:384,height:751}});
    const errors=[],unexpected=[];let catalogue=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route(/^https?:/,route=>{
      const url=new URL(route.request().url());
      const headers={'Access-Control-Allow-Origin':'*'};
      if(url.pathname==='/api/catalogue/items'&&route.request().method()==='GET')
        return route.fulfill({json:{items:catalogue.map(({src,...meta})=>meta),categories:[],more:false},headers});
      if(url.pathname.startsWith('/api/catalogue/files/')&&route.request().method()==='GET'){
        const item=catalogue.find(record=>record.id===url.pathname.split('/').at(-1));
        return route.fulfill({status:item?200:404,body:item?Buffer.from(item.src.split(',')[1],'base64'):'',contentType:'image/png',headers});
      }
      // Exercise offline fallbacks for the optional web font.
      if(url.hostname==='fonts.googleapis.com'&&url.pathname==='/css2'&&route.request().method()==='GET')
        return route.fulfill({contentType:'text/css',body:''});
      if(url.origin!==base.origin||url.pathname.startsWith('/api/')){
        unexpected.push(url.pathname);return route.abort();
      }
      return route.continue();
    });
    await page.goto(base.href);
    await page.locator('#home-wheel .category-reel').waitFor();
    const fixtures=await installFixtures(page);
    catalogue=fixtures.records.map((item,i)=>({...item,id:(i+1).toString().repeat(64),seq:1,tags:[],hidden:false}));
    await page.evaluate(async()=>{const {refreshMainArt}=await import('./shop/main-art.mjs');await refreshMainArt();});
    const photo={name:'test-photo.png',mimeType:'image/png',buffer:Buffer.from(fixtures.photo,'base64')};
    const blue=[37,138,228,255],orange=[220,110,66,255],clear=[0,0,0,0];
    for(const sample of [
      {name:'Cutout',group:'Photos',box:[50/240,20/160,116/240,70/160],points:[[.45,.34],[.23,.16],[.01,.01]],pixels:[blue,orange,clear]},
      {name:'Inset',group:'Photos',box:[.56,.12,.33,.52],points:[[.72,.37],[.45,.4],[.96,.12]],pixels:[blue,orange,orange]},
      {name:'Manual postcard',group:'Postcards',box:[.12,.16,.32,.45],points:[[.27,.38],[.6,.4],[.96,.12]],pixels:[blue,orange,orange]},
      {name:'Postcard proof',group:'Postcards',points:[[.45,.35],[.96,.35]],pixels:[blue,orange]},
      {name:'Postcard proof',group:'Postcards',withoutPhoto:true,points:[[.45,.35],[.96,.35]],pixels:[orange,orange]}
    ]){
      await page.evaluate(group=>window.openFixture(group),sample.group);
      await page.locator('[data-grid]').click();
      const tile=page.getByRole('button',{name:'Edit '+sample.name,exact:true});
      async function checkSample(container){
        if(!sample.box)return;
        const stock=container.locator('img[src^="data:image/"]').first();
        await stock.waitFor();
        const snapshot=await stock.evaluate((el,sample)=>window.checkStock(el,sample),sample);
        assert(snapshot.error<18,sample.name+' must show the stock cat inside its opening (mean error '+snapshot.error+')');
        // Outside the opening retain the printed artwork and any transparent margin.
        for(let i=1;i<sample.points.length;i++)for(let c=0;c<4;c++)
          assert(Math.abs(snapshot.pixels[i][c]-sample.pixels[i][c])<=4,sample.name+' preview changed the area outside the photo');
      }
      await tile.scrollIntoViewIfNeeded();await checkSample(tile);await tile.click();
      await page.locator('#parcel-shop [data-upload]').waitFor();
      await checkSample(page.locator('#parcel-shop'));
      const skip=page.getByRole('button',{name:'Continue without a photo'});
      if(sample.withoutPhoto)await skip.click();
      else {
        assert.equal(await skip.count(),sample.group==='Postcards'?1:0);
        await page.locator('#parcel-shop input[type=file]').setInputFiles(photo);
        await page.locator('.crop-window canvas').waitFor();
        await page.locator('[data-ok]').click();
      }
      const art=page.locator('[data-layer=art] canvas');
      await art.waitFor();
      if(sample.withoutPhoto) {
        await page.getByLabel('Write on this design').fill('A note for you');
        await page.waitForFunction(()=>window.inspectArt(document.querySelector('[data-layer=art] canvas'),[0,0,1,1],[]).ink>12);
      }
      const preview=await art.evaluate((el,points)=>window.inspectArt(el,[0,0,1,1],points),sample.points);
      assert.deepEqual(preview.pixels,sample.pixels,sample.name+' placement preview');
      const bounds=await page.locator('[data-layer=art]').evaluate(el=>{
        const layer=el.getBoundingClientRect(),screen=el.closest('.sample-phone').getBoundingClientRect();
        return [(layer.x-screen.x)/screen.width,(layer.y-screen.y)/screen.height,layer.width/screen.width,layer.height/screen.height];
      });
      await page.locator('[data-tool=ready]').click();
      await page.waitForFunction(()=>!!window.parcelProof);
      const proof=await page.evaluate(async ({bounds,points})=>{
        const {name,category,src}=window.parcelProof,img=new Image();img.src=src;await img.decode();
        const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
        canvas.getContext('2d').drawImage(img,0,0);
        return {name,category,size:[img.width,img.height],...window.inspectArt(canvas,bounds,points)};
      },{bounds,points:sample.points});
      assert.deepEqual(proof.size,[1440,2688]);assert.equal(proof.name,sample.name);assert.equal(proof.category,sample.group);
      assert.deepEqual(proof.pixels,sample.pixels,sample.name+' final PNG');
      if(sample.withoutPhoto)assert(proof.ink>12,'Postcard words must appear in the final PNG');
    }
    const intact=await page.evaluate(async records=>{
      const {catalogueRecords,catalogueImage}=await import('./shop/catalogue.mjs');
      const rows=await catalogueRecords();
      for(const {name,src} of records){
        const image=await catalogueImage(rows.find(row=>row.name===name).design);
        const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
        c.getContext('2d').drawImage(image,0,0);if(c.toDataURL()!==src)return name;
      }
      return true;
    },fixtures.records);
    assert.equal(intact,true,'Original artwork must stay intact through preview and export');
    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
    console.log('Stock cat previews, original PNGs, personal-photo placement and final PNG pixels passed for shared frames and postcards.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
