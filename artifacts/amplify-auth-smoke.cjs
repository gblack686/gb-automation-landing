const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('https://master.d1qefy5a1kauhs.amplifyapp.com/ops/observability/traces', {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  await page.getByLabel(/email/i).fill(process.env.SMOKE_EMAIL);
  await page.getByRole('textbox', { name: /^password$/i }).fill(process.env.SMOKE_PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.getByText('Trace Browser').waitFor({ timeout: 90000 });
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('Source:') && !text.includes('Source: static (loading)');
  }, { timeout: 90000 }).catch(() => {});

  const body = await page.locator('body').innerText();
  const sourceLine = (body.split('\n').find((line) => line.includes('Source:')) || '').trim();
  const screenshot = path.resolve('artifacts/amplify-observability-authenticated.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await browser.close();

  console.log(JSON.stringify({
    traceBrowserVisible: body.includes('Trace Browser'),
    observationTreeVisible: body.includes('Observation Tree'),
    sourceLine,
    consoleErrors: errors.slice(0, 5),
    screenshot,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
