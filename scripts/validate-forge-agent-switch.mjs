import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const base = process.env.FORGE_ATLAS_BASE || 'http://127.0.0.1:5196';
const youtubePath = process.env.FORGE_YOUTUBE_HTML;
if (!youtubePath) throw Error('FORGE_YOUTUBE_HTML is required');
const youtube = await readFile(youtubePath);
const youtubeSha = createHash('sha256').update(youtube).digest('hex');
const youtubeConfigSha = '4e835524a45dacf2eb509b51809ca09ca2f805a28c57807acaf8a9eaba5389c7';
const artist = Buffer.from('<!doctype html><html><head></head><body><script>const x="forge-atlas.request.v1"</script><h1>Artist fixture</h1></body></html>');
const docs = {'artist-packet-expert': artist, 'youtube-intel': youtube};
const s3 = id => `https://fixture-bucket.s3.us-east-1.amazonaws.com/gbautomation/${id}/index.html`;
const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
const page = await browser.newPage({viewport:{width:1440,height:900}});
const errors = [];
page.on('pageerror', error => errors.push(error.stack || error.message));
await page.route('**/src/lib/forgeAtlasClient.js*', route => route.fulfill({contentType:'application/javascript',body:`export async function readAtlas(view,query={},agent_id=null){return (await fetch('/__atlas_switch_fixture',{method:'POST',body:JSON.stringify({view,query,agent_id})})).json()} export async function expertChat(){return {enabled:false}}`}));
await page.route('**/__atlas_switch_fixture', route => {
 const {view,agent_id,query} = route.request().postDataJSON();
 if (view === 'agents') return route.fulfill({json:{agents:[
  {agent_id:'artist-packet-expert',display_name:'Artist Packet Expert',config_sha256:'bf142e4e937a53701b4a27b02d90068ee0c8f73636f123dd97a56a661e3040e5'},
  {agent_id:'youtube-intel',display_name:'YouTube Intelligence',config_sha256:youtubeConfigSha}
 ]}});
 if (view === 'document' && docs[agent_id]) return route.fulfill({json:{url:s3(agent_id),sha256:createHash('sha256').update(docs[agent_id]).digest('hex'),bytes:docs[agent_id].length,agent_id,tenant_id:'gbautomation'}});
 if (view === 'approvalSnapshot') return route.fulfill({json:{mode:'live_read_only',workflows:[],connection:{tenant:'gbautomation',writes_enabled:false,review_host:'web'}}});
 if (view === 'schedule') return route.fulfill({json:{schema_version:'forge-schedule.v1',agent_id,profile:agent_id==='youtube-intel'?'expert-gbautomation-youtube-intel':agent_id,date:query.date,timezone:'America/Los_Angeles',captured_at:new Date().toISOString(),source:'Hermes profile jobs.json',coverage:'Exact profile',jobs:[]}});
 return route.fulfill({json:{}});
});
await page.route('https://fixture-bucket.s3.us-east-1.amazonaws.com/**', route => {
 const id = route.request().url().split('/')[4];
 return route.fulfill({contentType:'text/html',body:docs[id],headers:{'Access-Control-Allow-Origin':base}});
});
try {
 await page.goto(base+'/atlas/artist-packet-expert');
 await page.locator('iframe[title="Artist Packet Expert Atlas"]').waitFor();
 await page.getByRole('combobox',{name:'Registered agents'}).selectOption('youtube-intel');
 const frame = page.locator('iframe[title="YouTube Intelligence Atlas"]');
 await frame.waitFor();
 assert.equal(new URL(page.url()).pathname,'/atlas/youtube-intel');
 assert.equal(await page.getByRole('link',{name:'YouTube health'}).getAttribute('href'),'/workshop');
 const content = await frame.getAttribute('srcdoc');
 assert(content.includes(`"agent_id": "youtube-intel"`));
 assert(content.includes(`"config_sha256": "${youtubeConfigSha}"`));
 assert(content.includes("frame-src 'self' about: blob: https://6ab9d13b0b89b5644e56270a--gbautoxyz.netlify.app"));
 assert.equal(youtubeSha,process.env.FORGE_YOUTUBE_SHA || '815a38c05d0ba45d5f89ac66766ec8091d87c689d6f7c4e4d1f2467551b94846');
 if (process.env.FORGE_YOUTUBE_SHA) {
  assert(content.includes('id="schedule-data"'));
  assert.equal(await frame.contentFrame().locator('#window-schedule').count(),1);
  await frame.contentFrame().locator('#schedule-status').getByText('0 jobs').waitFor({state:'attached'});
 }
 await page.getByRole('combobox',{name:'Registered agents'}).selectOption('artist-packet-expert');
 await page.locator('iframe[title="Artist Packet Expert Atlas"]').waitFor();
 assert.equal(new URL(page.url()).pathname,'/atlas/artist-packet-expert');
 if (process.env.FORGE_YOUTUBE_SHA) {
  const tampered = youtube.toString().replace(/(<script id="schedule-data"[^>]*>)(.*?)(<\/script>)/s,(_,open,json,close) => {
   const value=JSON.parse(json);value.profile='artist-packet-expert';return open+JSON.stringify(value)+close;
  });
  docs['youtube-intel']=Buffer.from(tampered);
  await page.getByRole('combobox',{name:'Registered agents'}).selectOption('youtube-intel');
  await page.getByRole('button',{name:'Retry',exact:true}).waitFor();
  assert.equal(await page.locator('iframe').count(),0);
 }
 assert.deepEqual(errors,[]);
 console.log('Artist to YouTube switch, package digest, binding and report frame policy passed');
} finally { await browser.close(); }
