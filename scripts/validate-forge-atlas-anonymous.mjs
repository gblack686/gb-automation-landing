// Run against a production build or the live website, with no auth fixture.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.FORGE_ATLAS_BASE || 'http://127.0.0.1:5198';
const output='artifacts/forge-atlas-validation';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'})});
const page=await browser.newPage();
const errors=[],privateRequests=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{
 if (/\.s3\.[a-z0-9-]+\.amazonaws\.com/.test(request.url()) || request.postData()?.includes('forgeAtlasRead')) privateRequests.push(new URL(request.url()).hostname);
});
try {
 await page.goto(base+'/atlas/artist-packet-expert');
 await page.waitForURL(url=>url.pathname==='/login',{timeout:30000});
 assert.equal(new URL(page.url()).searchParams.get('next'),'/atlas/artist-packet-expert');
 assert.equal(await page.locator('iframe[title="Artist Packet Expert Atlas"]').count(),0);
 assert.deepEqual(privateRequests,[]);
 assert.deepEqual(errors,[]);
 const result={ok:true,base,checks:['Production anonymous navigation redirects to login with return path','No private document or Atlas API request before authentication','No browser errors']};
 await writeFile(output+'/anonymous.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
} finally {await browser.close();}
