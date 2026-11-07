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
    for(const [group,num,selector] of [['Recipient',2,'.recipient-choice'],['Now / Later',5,'.timing-options']]){
      await preview.locator(selector).evaluate(el=>el.scrollIntoView({block:'center'}));
      await page.getByRole('button',{name:new RegExp('^'+group+' · '+num+' · ')}).click();
    }
    assert.equal(await preview.locator('.timing-options').getAttribute('data-review-look'),'deliverytime-5');
    assert.equal(await preview.locator('.recipient-choice').getAttribute('data-review-look'),'recipient-2');
    assert.deepEqual(errors,[]);
    console.log('Five choices per target, persisted exports, independent recipient and timing, shared placement and frame upload passed.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
