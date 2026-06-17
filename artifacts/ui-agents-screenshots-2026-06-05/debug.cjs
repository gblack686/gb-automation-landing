const { chromium } = require('playwright');
(async () => {
  const port = 5174;
  const base = `http://127.0.0.1:${port}/mini-apps/ui-agents/index.html`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  page.on('console', msg => console.log(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));
  page.on('requestfailed', req => console.log(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`));
  page.on('response', res => { if (res.status() >= 400) console.log(`[response:${res.status()}] ${res.url()}`); });
  await page.goto(`${base}#/gbautomation/site/gallery/features/agentic-systems-v1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  console.log('url', page.url());
  console.log('title', await page.title());
  console.log('body', JSON.stringify((await page.locator('body').innerText()).slice(0, 1000)));
  await page.screenshot({ path: 'artifacts/ui-agents-screenshots-2026-06-05/debug-static-index.png', fullPage: true });
  await browser.close();
})();
