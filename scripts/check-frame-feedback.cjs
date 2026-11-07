const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const base=process.argv[2]||'http://localhost:3000/';
  try{
    const page=await browser.newPage({viewport:{width:384,height:751}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);
    await page.locator('[data-action=tab][data-id=settings]').click();
    const toggle=page.getByRole('switch',{name:'Design mode'});
    const frame=page.frameLocator('iframe[title="Paused app screen"]');
    await toggle.click();
    const options=frame.getByRole('group',{name:'Settings buttons design options'});
    assert.deepEqual(await options.locator('button').allTextContents(),['1','2','3','4','5']);
    await options.getByRole('button',{name:/Settings buttons 4/}).click();
    await toggle.click();await page.reload();
    await page.locator('[data-action=tab][data-id=settings]').click();
    await page.locator('.post-settings[data-review-look=settingsbuttons-4]').waitFor();
    assert.equal(await page.locator('.element-numbers').count(),0);
    await page.locator('[data-action=tab][data-id=inbox]').click();
    await toggle.click();
    await frame.getByRole('button',{name:/Inbox layout 3/}).click();
    await page.evaluate(()=>window.Pigeon={saveReview:data=>window.exportedReview=JSON.parse(data)});
    await page.getByRole('button',{name:'Export design'}).click();
    const exported=await page.evaluate(()=>window.exportedReview);
    const choices=Object.assign({},...exported.views.map(v=>v.choices));
    assert.equal(choices['frame-feedback-settingsbuttons-01'].number,4);
    assert.equal(choices['frame-feedback-mailbox-01'].number,3);
    assert.equal(exported.preferences['pigeon-style-frame-feedback-settingsbuttons-01'],4);
    await page.goto(base+'design/page.html?preview=1&page=frames');
    await page.waitForFunction(()=>!!window.designSurface);
    await page.evaluate(()=>window.designSurface.configure({editing:false,layout:{styles:{}}}));
    await page.locator('[data-upload]').waitFor();
    await page.locator('#parcel-shop input[type=file]').setInputFiles(path.join(__dirname,'../tests/fixtures/invitation/approved-320.png'));
    await page.locator('[data-ok]').click();
    await page.getByLabel('Add a note (optional)').fill('Test note');
    await page.locator('[data-layer=note] canvas').waitFor();
    assert.equal(await page.locator('[data-tool=second]').count(),0);
    await page.getByRole('button',{name:'Edit framed photo'}).click();
    await page.locator('[data-cancel]').click();
    const note=page.getByLabel('Add a note (optional)');
    assert.equal(await note.inputValue(),'Test note');
    await page.locator('[data-layer=note]').click();
    await page.getByRole('button',{name:'Delete note'}).click();
    assert.equal(await note.inputValue(),'');
    await note.fill('Signed, sealed, delivered.');
    await page.locator('.note-tools summary').click();
    await page.locator('.note-tools').getByRole('button',{name:'Coiny',exact:true}).click();
    await page.locator('[data-tool=ready]').click();
    await page.locator('.dispatch-timing').waitFor();
    await page.locator('#later').click();
    assert.equal(await page.locator('#later').getAttribute('aria-pressed'),'true');
    await page.goto(base+'design/page.html?preview=1&page=pigeons');
    await page.getByLabel('Add a note (optional)').waitFor();
    assert.equal(await page.locator('[data-upload],[data-tool=second]').count(),0);
    await page.setViewportSize({width:1250,height:950});
    await page.goto(base+'design/index.html?page=recipient');
    const preview=page.frameLocator('iframe').first();
    await preview.locator('.recipient-choice').waitFor();
    for(const [group,num,selector] of [['Send to',2,'.recipient-choice'],['Now / Later',5,'.timing-options']]){
      await preview.locator(selector).evaluate(el=>el.scrollIntoView({block:'center'}));
      await page.getByRole('button',{name:new RegExp('^'+group+' · '+num+' · ')}).click();
    }
    assert.equal(await preview.locator('.timing-options').getAttribute('data-review-look'),'whenticks-5');
    assert.equal(await preview.locator('.recipient-choice').getAttribute('data-review-look'),'sendrow-2');
    for(const [screen,selector,label,num,look] of [
      ['inbox','.people-heading','Your people',6,'peoplebar-6'],
      ['library','.frame-card','Carousel width',2,'railwidth-2'],
      ['library','.frame-name','Design name font',3,'catalogfont-3'],
      ['posted','.post-receipt>strong','Parcel title font',5,'receiptfont-5'],
      ['placementPostcard','.note-question','Optional note heading',5,'notetitle-5']]){
      await page.goto(base+'design/index.html?page='+screen);
      await preview.locator(selector).evaluate(el=>el.scrollIntoView({block:'center'}));
      await page.getByRole('button',{name:new RegExp('^'+label+' · '+num+' · ')}).click();
      assert.equal(await preview.locator(selector).getAttribute('data-review-look'),look);
    }
    await page.goto(base+'design/page.html?preview=1&page=placementPostcard');
    await page.waitForFunction(()=>!!window.designSurface);
    await page.evaluate(()=>window.designSurface.configure({editing:false,layout:{styles:{}}}));
    const words=page.getByLabel('Write on this design');
    await words.fill('A postcard for you');
    const height=await words.evaluate(el=>el.offsetHeight);
    await words.fill('A much longer postcard. '.repeat(5));
    assert.equal(await words.evaluate(el=>el.offsetHeight),height);
    await page.goto(base+'design/page.html?preview=1&page=recipient');
    await page.locator('.recipient-avatar').first().waitFor();
    assert.equal(await page.locator('.timing-options').getAttribute('data-review-look'),'whenticks-3');
    const positions=await page.locator('.recipient-choice').evaluate(el=>{
      const label=el.querySelector('label').getBoundingClientRect(),people=el.querySelector('.recipient-people').getBoundingClientRect();
      return [label.right,people.left];
    });
    assert(positions[0]<=positions[1]);
    // A small mask can locate the ink, but the proof must keep the source pixels.
    const resolution=await page.evaluate(async()=>{
      const {fitPreview}=await import('./shop/preview-image.mjs');
      const src=document.createElement('canvas');src.width=1440;src.height=2688;
      src.getContext('2d').fillRect(70,700,1240,1000);
      const img=new Image();document.body.append(img);img.src=src.toDataURL();
      await fitPreview(img);await img.decode();return [img.naturalWidth,img.naturalHeight];
    });
    assert(resolution[0]>=1240&&resolution[0]<1280&&resolution[1]>=1000);
    assert.deepEqual(errors,[]);
    console.log('Five choices per target, persisted exports, independent recipient and timing, shared placement and frame upload passed.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
