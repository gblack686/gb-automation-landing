const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const port = 5175;
const base = `http://127.0.0.1:${port}/mini-apps/ui-agents/index.html`;
const outDir = path.resolve('artifacts/ui-agents-screenshots-2026-06-05');
fs.mkdirSync(outDir, { recursive: true });
for (const file of fs.readdirSync(outDir)) {
  if (file.endsWith('.png') || file.endsWith('.log') || file === 'manifest.json' || file === 'capture-warnings.txt') {
    fs.rmSync(path.join(outDir, file), { force: true });
  }
}

const shots = [
  ['00-workspace-overview', '#/gbautomation/site', 'GBAutomation'],
  ['01-hero-video-hero', '#/gbautomation/site/gallery/hero/hero-v1', 'AI that builds'],
  ['02-hero-exact-site-match', '#/gbautomation/site/gallery/hero/hero-v2-exact', 'Build smarter'],
  ['03-portfolio-sliding', '#/gbautomation/site/gallery/portfolio/portfolio-v1', 'Trusted by industry leaders'],
  ['04-portfolio-tailwind', '#/gbautomation/site/gallery/portfolio/portfolio-v2-tailwind', 'AI Agent Portfolio'],
  ['05-features-agentic-systems', '#/gbautomation/site/gallery/features/agentic-systems-v1', 'Agentic systems'],
  ['06-features-owned-stack', '#/gbautomation/site/gallery/features/owned-stack-v1', 'Your AI systems'],
  ['07-automation-loop-transcript-to-pr', '#/gbautomation/site/gallery/automation-loop/transcript-to-pr-v1', 'From transcript'],
  ['08-hermes-dedicated-ai-companion', '#/gbautomation/site/gallery/hermes/dedicated-ai-companion-v1', 'dedicated AI companion'],
  ['09-team-session-ai-team-hour', '#/gbautomation/site/gallery/team-session/ai-team-hour-v1', 'Your AI team'],
  ['10-process-90-day-roadmap', '#/gbautomation/site/gallery/process/ninety-day-roadmap-v1', 'practical roadmap'],
  ['11-pricing-three-tier', '#/gbautomation/site/gallery/pricing/pricing-v1', 'Investment'],
  ['12-testimonials-trust-stack', '#/gbautomation/site/gallery/testimonials/trust-stack-v1', 'Trust signals'],
  ['13-contact-consultation', '#/gbautomation/site/gallery/contact/consultation-v1', 'Tell us where work gets stuck'],
  ['14-about-operator-story', '#/gbautomation/site/gallery/about/operator-story-v1', 'Built by operators'],
  ['15-insights-index', '#/gbautomation/site/gallery/blog/insights-index-v1', 'Writing that shows'],
  ['16-roi-calculator', '#/gbautomation/site/gallery/calculator/roi-calculator-v1', 'business case'],
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  const failures = [];

  for (const [name, hash, text] of shots) {
    const url = `${base}${hash}`;
    const file = path.join(outDir, `${name}.png`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
    try { await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10000 }); }
    catch { failures.push(`${name}: did not find text "${text}"`); }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: file, fullPage: true });
  }

  await browser.close();
  const manifest = shots.map(([name, hash, text]) => ({ file: `${name}.png`, url: `${base}${hash}`, expectedText: text }));
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ created: '2026-06-05', manifest }, null, 2));
  if (failures.length) fs.writeFileSync(path.join(outDir, 'capture-warnings.txt'), failures.join('\n'));
})();
