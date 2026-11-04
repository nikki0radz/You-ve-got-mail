// Exercise the packaged composer with the Android preview's CSP and data-only bridge.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const root=path.resolve(process.argv[2]||'.');
  const native=await fs.readFile(path.join(__dirname,'../android/src/uk/co/pigeonpost/mail/DesignMode.java'),'utf8');
  const csp=native.match(/"Content-Security-Policy","([^"]+)"/)[1];
  const origin='https://appassets.androidplatform.net',errors=[],other=[];
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:390,height:782},deviceScaleFactor:2.75,isMobile:true});
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());if(u.origin!==origin){other.push(u.origin);return route.abort();}
      const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
      const mime={html:'text/html',mjs:'text/javascript',js:'text/javascript',json:'application/json',css:'text/css',png:'image/png',webp:'image/webp',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2'};
      try{await route.fulfill({body:await fs.readFile(file),contentType:mime[file.split('.').pop()]||'application/octet-stream',headers:{'Content-Security-Policy':csp}});}
      catch{await route.fulfill({status:404,body:''});}
    });
    await page.addInitScript(()=>{
      let current={paired:true,revision:'',draft:null,metrics:{width:390,height:782},error:''};
      window.PigeonDesign={state:()=>JSON.stringify(current),close:()=>{window.wasClosed=true;},refresh:()=>{
        current={...current,draft:{id:'b6e1a3ca-1',name:'Phone preview',screen:'postcard-composer',appVersion:'0.1.8',layout:{styles:{row:{gap:18,equal:'equal'},ready:{background:'#39774b'},note:{color:'#113355',background:'url(https://invalid.example/x)',evil:'alert(1)'}},copies:[]}}};
        window.dispatchEvent(new Event('pigeon-design-update'));
      }};
    });
    await page.goto(origin+'/design/composer.html?phone=1');
    const dialog=page.locator('#parcel-shop[open]'),note=dialog.locator('[data-tool=note]');
    await note.waitFor({timeout:15000});
    await dialog.getByText('No saved draft yet.').waitFor();
    await dialog.getByRole('button',{name:'Refresh draft'}).click();await dialog.getByText(/Phone preview/).waitFor();
    const values=await note.evaluate(n=>[getComputedStyle(n).color,getComputedStyle(n).backgroundImage]);
    assert.equal(values[0],'rgb(17, 51, 85)');assert(!values[1].includes('invalid.example'));
    const row=await dialog.locator('.studio-tools').evaluate(el=>{
      const [note,sticker]=[el.querySelector('[data-tool=note]'),el.querySelector('[data-tool=second]')].map(n=>n.getBoundingClientRect());
      return {gap:sticker.left-note.right,sameRow:Math.abs(note.top-sticker.top)<1};
    });
    assert(row.sameRow);assert(Math.abs(row.gap-18)<1);
    assert.equal(await dialog.locator('[data-tool=ready]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(57, 119, 75)');
    // The same CSP must also allow the photo picker's local Blob URL.
    await dialog.locator('[data-file=main]').setInputFiles({name:'preview.png',mimeType:'image/png',buffer:await fs.readFile(path.join(__dirname,'../tests/fixtures/invitation/approved-320.png'))});
    await dialog.getByText('Fit your picture',{exact:true}).waitFor();await dialog.getByRole('button',{name:/Happy with this/}).click();
    await dialog.getByRole('button',{name:'Edit picture'}).waitFor();
    await dialog.getByRole('button',{name:'Close Design Mode'}).click();assert(await page.evaluate(()=>window.wasClosed));
    assert.deepEqual(errors,[]);assert.deepEqual(other,[]);
    console.log('Bundled Android preview: opened offline, refreshed a structured draft, rejected external CSS, closed.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
