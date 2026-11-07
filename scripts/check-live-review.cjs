const {chromium}=require('playwright'), assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:360,height:800},hasTouch:true,isMobile:true});
 page.on('pageerror',e=>console.error('PageError',e));
 const base=process.argv[2] || 'http://127.0.0.1:3000/';
 await page.goto(base+'guest.html?preview=1');
 const toggle=page.getByRole('switch',{name:'Design mode'}), frame=page.frameLocator('iframe[title="Paused app screen"]');
 await toggle.click();await frame.locator('#accept').click();
 assert(await page.locator('#accept').isVisible());
 await page.getByPlaceholder('What would you change here?').fill('More space above the button');
 await page.getByRole('button',{name:'Use #dbc6d4'}).click();
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await toggle.click();
 assert.equal(await page.locator('#accept').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(219, 198, 212)');
 await page.reload();assert.equal(await page.locator('#accept').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(219, 198, 212)');
 await toggle.click();await frame.locator('#accept').click();
 assert.equal(await page.locator('textarea[placeholder]').inputValue(),'More space above the button');
 await page.getByRole('button',{name:'Original',exact:true}).click();
 assert.notEqual(await frame.locator('#accept').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(219, 198, 212)');
 await toggle.click();await page.locator('#decline').click();await toggle.click();await frame.locator('#back').click();
 await page.getByPlaceholder('What would you change here?').fill('Back button note');
 await page.getByRole('button',{name:'Done',exact:true}).click();
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Export design'}).click();
 const file=await dl;const json=JSON.parse(await fs.readFile(await file.path()));assert.equal(json.views.length,2);
 assert(json.views.every(v=>v.layout.elements.length>4));assert(!JSON.stringify(json).includes('preview=1'));
 await page.goto(base);await page.locator('[data-id=settings][data-action=tab]').click();
 await toggle.click();await frame.locator('[data-section=delivery] summary').click();
 await page.getByPlaceholder('What would you change here?').fill('Settings note');await toggle.click();
 await page.locator('[data-section=account] summary').click();await page.locator('[data-action=profile]').click();
 await toggle.click();await frame.locator('#social-flow h2').click();await page.getByPlaceholder('What would you change here?').fill('Profile note');await toggle.click();
 await page.locator('#social-flow [data-x]').click();
 await page.locator('[data-id=home][data-action=tab]').click(); await toggle.click(); await frame.locator('.wheel-paper h3').click();await page.locator('.target').selectOption({label:'Carousel background'});
 await page.getByRole('button',{name:'Use #a1c6bc'}).click();await toggle.click();
 assert.equal(await page.locator('.wheel-paper').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(161, 198, 188)');
 console.log('Passed review, persistence, reset, multi-screen export, nested dialogs and carousel on phone viewport');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
