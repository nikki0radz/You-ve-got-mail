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
      {name:'Cutout',group:'Photos',points:[[.45,.34],[.23,.16],[.01,.01]],pixels:[blue,orange,clear]},
      {name:'Inset',group:'Photos',points:[[.72,.37],[.45,.4],[.96,.12]],pixels:[blue,orange,orange]},
      {name:'Postcard proof',group:'Postcards',points:[[.45,.35],[.96,.35]],pixels:[blue,orange]},
      {name:'Postcard proof',group:'Postcards',withoutPhoto:true,points:[[.45,.35],[.96,.35]],pixels:[orange,orange]}
    ]){
      await page.evaluate(group=>window.openFixture(group),sample.group);
      await page.locator('[data-grid]').click();
      await page.getByRole('button',{name:'Edit '+sample.name,exact:true}).click();
      await page.locator('#parcel-shop [data-upload]').waitFor();
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
    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
    console.log('Cutout and opaque shared frames, photo-only and text-only postcards, placement colours and final PNG pixels passed.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
