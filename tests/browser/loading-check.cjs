// node tests/browser/loading-check.cjs <playwright-module> <browser-executable>
const { chromium } = require(process.argv[2]);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
      '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png'
    }[path.extname(file)] || 'application/octet-stream');
    response.end(data);
  });
});

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/`;
    browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });

    // Hold app scripts until the browser has discovered and loaded the hero.
    let releaseScripts;
    const scriptsHeld = new Promise(resolve => { releaseScripts = resolve; });
    await page.route('**/src/**/*.js*', async route => {
      await scriptsHeld;
      await route.continue();
    });
    const navigation = page.goto(base);
    try {
      await page.waitForFunction(() => {
        const hero = document.querySelector('.hero-cover-frame img');
        return hero && hero.complete && hero.naturalWidth > 0;
      });
      assert.equal(await page.evaluate(() => !!window.CATBTI_RUNTIME), false);
    } finally { releaseScripts(); }
    await navigation;
    await page.unroute('**/src/**/*.js*');

    // Two offscreen native-lazy images must not starve the next priority image.
    const loaded = await page.evaluate(async () => {
      const sources = ['assets/images/cats/profiles/boss-dabidou.jpg',
        'assets/images/cats/profiles/salt-bohe.jpg', 'assets/images/cats/gallery/danta.jpg'];
      const images = sources.map(() => {
        const image = document.createElement('img');
        image.loading = 'lazy';
        image.style.cssText = 'position:absolute;top:100000px;width:100px;height:100px';
        document.body.append(image);
        return image;
      });
      const loads = images.map((image, index) => window.CATBTI_RUNTIME.loadImageElement(
        image, sources[index], { priority: index === 2 ? 'high' : 'idle' }
      ));
      let timeout;
      const result = await Promise.race([Promise.all(loads), new Promise(resolve => {
        timeout = setTimeout(() => resolve('queue stalled'), 5000);
      })]);
      clearTimeout(timeout);
      images.forEach(image => image.remove());
      return result;
    });
    assert.deepEqual(loaded, [true, true, true]);

    await page.locator('#startButton').click();
    for (let index = 0; index < 9; index++) {
      const previous = await page.locator('#questionTitle').textContent();
      await page.locator('.option-button').first().click();
      await page.waitForFunction(text => document.body.dataset.view === 'result' ||
        document.querySelector('#questionTitle').textContent !== text, previous);
    }
    await page.waitForSelector('#resultView.is-active');
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + '?result=LOVE-U');
      await page.locator('.perfect-ending-card').scrollIntoViewIfNeeded();
      assert.match(await page.locator('#perfectEndingTitle').textContent(), /猫咪的旮啦game/);
      assert.match(await page.locator('.perfect-ending-card p').textContent(), /5元商品区减1元，并领一张小卡/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const card = page.locator('.perfect-ending-card');
      const cardBox = await card.boundingBox();
      for (const selector of ['h3', 'p', 'img']) {
        const box = await card.locator(selector).boundingBox();
        assert.ok(box.x >= cardBox.x && box.x + box.width <= cardBox.x + cardBox.width + 2);
      }
      if (width === 390 && process.env.CATBTI_SCREENSHOT) {
        await card.screenshot({ path: process.env.CATBTI_SCREENSHOT });
      }
      await page.locator('#resultGalleryButton').click();
      await page.locator('[data-cat-index]').first().click();
      await page.waitForSelector('#catDialog[open]');
      await page.locator('#dialogClose').click();
    }
    for (const query of ['?result=QUEEN', '?result=LOVE-U&surprise=1',
      '?result=LOVE-U&transition=1&fate=hit', '?result=LOVE-U&transition=1&fate=miss']) {
      await page.goto(base + query);
      await page.waitForSelector('#resultView.is-active', { timeout: 15000 });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: early hero, image queue, quiz, mobile/desktop copy, gallery and effect previews.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
