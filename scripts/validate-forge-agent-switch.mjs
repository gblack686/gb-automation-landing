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
page.on('pageerror', error => errors.push(error.message));
await page.route('**/src/lib/forgeAtlasClient.js*', route => route.fulfill({contentType:'application/javascript',body:`export async function readAtlas(view,query={},agent_id=null){return (await fetch('/__atlas_switch_fixture',{method:'POST',body:JSON.stringify({view,query,agent_id})})).json()}`}));
await page.route('**/__atlas_switch_fixture', route => {
 const {view,agent_id} = route.request().postDataJSON();
 if (view === 'agents') return route.fulfill({json:{agents:[
  {agent_id:'artist-packet-expert',display_name:'Artist Packet Expert',config_sha256:'bf142e4e937a53701b4a27b02d90068ee0c8f73636f123dd97a56a661e3040e5'},
  {agent_id:'youtube-intel',display_name:'YouTube Intelligence',config_sha256:youtubeConfigSha}
 ]}});
 if (view === 'document' && docs[agent_id]) return route.fulfill({json:{url:s3(agent_id),sha256:createHash('sha256').update(docs[agent_id]).digest('hex'),bytes:docs[agent_id].length,agent_id,tenant_id:'gbautomation'}});
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
 assert.equal(youtubeSha,'815a38c05d0ba45d5f89ac66766ec8091d87c689d6f7c4e4d1f2467551b94846');
 await page.getByRole('combobox',{name:'Registered agents'}).selectOption('artist-packet-expert');
 await page.locator('iframe[title="Artist Packet Expert Atlas"]').waitFor();
 assert.equal(new URL(page.url()).pathname,'/atlas/artist-packet-expert');
 assert.deepEqual(errors,[]);
 console.log('Artist to YouTube switch, package digest, binding and report frame policy passed');
} finally { await browser.close(); }
