import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { portfolio } from '../content.js';
import { WAVE_DURATION_MS } from '../wave.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const base=process.env.TEST_URL||'http://localhost:4173';
const errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
await mkdir('artifacts',{recursive:true});
async function directoryCheck(button){
  await button.click();
  assert.equal(await page.locator('#work-directory').evaluate(d=>d.open),true);
  assert.equal(await page.locator('.directory-option').count(),portfolio.workCategories.length);
  const last=page.locator('.directory-footnote a');
  await last.focus();await page.keyboard.press('Tab');
  assert.equal(await page.locator('.directory-close').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await last.evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#work-directory').evaluate(d=>d.open),false);
  assert.equal(await button.evaluate(e=>e===document.activeElement),true);
}
try{
  assert.equal((await page.goto(base)).status(),200);
  await page.waitForFunction(()=>document.querySelector('.wordmark')?.dataset.slicing==='ready');
  assert.equal(await page.locator('#service-grid article').count(),portfolio.services.length);
  assert.equal(await page.locator('.hero-preview').count(),portfolio.projects.length);
  assert.equal(await page.locator('#contact-methods a').getAttribute('href'),portfolio.contacts.telegram);
  assert.equal(await page.locator('#channel-link a').getAttribute('href'),portfolio.channel.url);
  assert.equal(await page.locator('#intro-title').getAttribute('aria-label'),portfolio.headline.replaceAll('\n',' '));
  const wave=()=>page.locator('.wave-letter').evaluateAll(list=>list.map(e=>Number(getComputedStyle(e).opacity)));
  assert.ok((await wave()).every(v=>v===1));
  await page.mouse.wheel(0,40);await page.waitForTimeout(500);
  assert.ok((await wave()).some(v=>v>0&&v<1));
  await page.waitForTimeout(WAVE_DURATION_MS);
  assert.ok((await wave()).every(v=>v===0));
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(WAVE_DURATION_MS+100);
  assert.ok((await wave()).every(v=>v===1));
  checks.push('Real services, supplied contacts, accessible hero and single-gesture timed wave');
  await directoryCheck(page.locator('.intro-actions [data-open-directory]'));
  await directoryCheck(page.locator('.hero-preview-one'));
  await directoryCheck(page.locator('.district-open'));
  checks.push('Hero, preview and portfolio category menu; Tab loop, Escape and focus restoration');
  for(const category of portfolio.workCategories){
    await page.goto(base+'/works?category='+category.id);
    const expected=portfolio.projects.filter(p=>p.categoryId===category.id);
    assert.equal(await page.locator('#all-projects article').count(),expected.length);
    assert.equal(await page.locator('.work-filter[aria-current="true"]').getAttribute('href'),'/works?category='+category.id);
    if(!expected.length)assert.equal(await page.locator('.gallery-empty').isVisible(),true);
  }
  await page.goto(base+'/works?category=unknown');
  assert.equal(await page.locator('#all-projects article').count(),portfolio.projects.length);
  const project=page.locator('#all-projects [data-card="0"]');
  const trigger=project.locator('.project-open');
  await trigger.click();
  assert.equal(await page.locator('#project-dialog').evaluate(d=>d.open),false);
  assert.equal(await project.evaluate(e=>e.classList.contains('is-revealed')),true);
  await trigger.click();
  assert.equal(await page.locator('#project-dialog').evaluate(d=>d.open),true);
  await page.keyboard.press('Escape');await page.waitForTimeout(250);
  assert.equal(await page.locator('#project-dialog').evaluate(d=>d.open),false);
  assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
  checks.push('All category routes and honest empty states; reveal then project dialog');
  for(const route of ['/','/works','/works?category=coffee']){
    await page.goto(base+route);
    for(const width of [320,390,560,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Overflow '+width+' '+route);
    }
  }
  checks.push('Responsive home, gallery and empty state at 320–1440px');
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);
  await page.mouse.wheel(0,40);await page.waitForTimeout(100);
  assert.ok((await wave()).every(v=>v===1));
  await directoryCheck(page.locator('.intro-actions [data-open-directory]'));
  checks.push('Reduced motion preserves visible content and working menu');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('**/assets/portrait.webp',route=>route.abort());
  await page.goto(base+'/#about');await page.locator('.portrait-fallback').waitFor();
  await page.unroute('**/assets/portrait.webp');
  for(const [width,height,name]of [[1440,1000,'desktop'],[390,844,'mobile']]){
    await page.setViewportSize({width,height});await page.goto(base);
    await page.waitForTimeout(900);
    await page.screenshot({path:'artifacts/reference-redesign-'+name+'.png'});
    await page.locator('.intro-actions [data-open-directory]').click();
    await page.screenshot({path:'artifacts/reference-directory-'+name+'.png'});
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);
  assert.equal(await readFile('works/index.html','utf8'),await readFile('index.html','utf8'));
  await writeFile('artifacts/browser-results.json',JSON.stringify({checks,errors},null,2));
  for(const check of checks)console.log('PASS',check);
}finally{await browser.close();}
