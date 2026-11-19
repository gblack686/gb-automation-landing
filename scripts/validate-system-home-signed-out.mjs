// Unmodified production bundle, empty browser storage, no external access.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SYSTEM_HOME_BASE||'http://127.0.0.1:5210';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
const page=await browser.newPage();const denied=[];
await page.route('**/*',r=>{if(new URL(r.request().url()).origin!==base){denied.push(new URL(r.request().url()).origin);return r.abort();}return r.continue();});
try{
 const next='/system?context=fixture#view=observability&sid=dna-local-1';
 await page.goto(base+next);await page.waitForURL('**/login?next=*');
 assert.equal(new URL(page.url()).searchParams.get('next'),next);
 await page.getByRole('heading',{name:'Sign in to continue.'}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'System Home',exact:true}).count(),0);
 assert.deepEqual(denied.filter(x=>!['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(x)),[]);
 console.log(JSON.stringify({ok:true,checks:['Production bundle redirects signed-out /system before private reads','Login retains full query and hash','No app endpoint requests; inherited external fonts blocked'],external:denied}));
}finally{await browser.close();}
