// Start npm run dev, then run this script with Playwright and Chromium installed.
// CHROMIUM_PATH can select a system Chromium. Pass a site root to check another build.
// The two reference cards were rendered from approved commit 12bcd7d at device scale 1.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

async function check(browser, url, width) {
  const page = await browser.newPage({viewport:{width, height:900}, deviceScaleFactor:1});
  try {
    await page.goto(url);
    const bird = page.locator('.invitation .courier');
    await bird.evaluate(image => image.decode());
    await page.evaluate(() => document.fonts.ready);
    const image = await page.locator('.guest').screenshot();
    const reference = await fs.readFile(path.join(__dirname,'../tests/fixtures/invitation','approved-'+width+'.png'));
    const result = await page.evaluate(async ([expected, actual]) => {
      async function decode(base64) {
        const img = new Image();
        img.src = 'data:image/png;base64,' + base64;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img,0,0);
        return {width:img.width, height:img.height, pixels:ctx.getImageData(0,0,img.width,img.height).data};
      }
      const [a,b] = await Promise.all([expected,actual].map(decode));
      if (a.width!==b.width || a.height!==b.height) return {sizeIssue:[a.width,a.height,b.width,b.height]};
      let changed = 0;
      for (let i=0; i<a.pixels.length; i+=4) {
        if ([0,1,2].some(c=>Math.abs(a.pixels[i+c]-b.pixels[i+c])>28)) changed++;
      }
      const bird = document.querySelector('.courier').getBoundingClientRect();
      const card = document.querySelector('.guest').getBoundingClientRect();
      const title = document.querySelector('.invitation h1');
      return {
        changed:changed/(a.width*a.height),
        centreDelta:Math.abs((bird.left+bird.width/2)-(card.left+card.width/2)),
        lines:title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)
      };
    }, [reference.toString('base64'),image.toString('base64')]);
    assert.ok(!result.sizeIssue,'Card dimensions differ at '+width+': '+result.sizeIssue);
    assert.ok(result.changed<.015,'Invitation changed at '+width+'px: '+(100*result.changed).toFixed(2)+'%');
    assert.ok(result.centreDelta<1 && Math.abs(result.lines-2)<.05,'Check courier position and two-line heading');
    await page.locator('#decline').click();
    await page.locator('#back').click();
    await page.locator('#accept').click();
    await page.locator('#steps .wheel').waitFor();
    console.log(width+'px invitation passed ('+(100*result.changed).toFixed(3)+'% changed pixels)');
  } finally { await page.close(); }
}
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined});
  const url = new URL('guest.html?preview=1',process.argv[2] || 'http://127.0.0.1:3000/').href;
  try { for (const width of [320,430]) await check(browser,url,width); }
  finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
