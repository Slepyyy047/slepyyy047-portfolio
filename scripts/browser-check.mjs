import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { portfolio } from '../content.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const base = process.env.TEST_URL || 'http://localhost:4173';
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function directoryCheck(button) {
  await button.click();
  assert.equal(await page.locator('#work-directory').evaluate(d => d.open), true);
  assert.equal(await page.locator('.directory-option').count(), portfolio.workCategories.length);
  const last = page.locator('.directory-footnote a');
  await last.focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.directory-close').evaluate(e => e === document.activeElement), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#work-directory').evaluate(d => d.open), false);
  assert.equal(await button.evaluate(e => e === document.activeElement), true);
}
try {
  assert.equal((await page.goto(base)).status(), 200);
  await page.locator('.wave-letter').first().waitFor();
  assert.equal(await page.locator('#intro-title').getAttribute('aria-label'), 'PORTFOLIO');
  assert.equal(await page.locator('#home-page [data-open-directory]').count(), 1);
  assert.equal(await page.locator('.preview-toggle').count(), 0);
  assert.equal(await page.locator('.preview-group:first-child .hero-preview').count(), portfolio.projects.length);
  assert.equal(await page.locator('#portrait-image').evaluate(e => e.complete && e.naturalWidth > 0), true);
  assert.equal(await page.locator('.button-particles i').count(), 12);
  const track = page.locator('.preview-track');
  await page.locator('.hero-preview-rail').hover();
  const before = await track.evaluate(e => getComputedStyle(e).transform);
  await page.waitForTimeout(300);
  assert.equal(await track.evaluate(e => getComputedStyle(e).animationPlayState), 'running');
  assert.notEqual(await track.evaluate(e => getComputedStyle(e).transform), before);
  assert.equal(await page.locator('#contact-methods a').getAttribute('href'), portfolio.contacts.telegram);
  await directoryCheck(page.locator('.works-cta'));
  for (const category of portfolio.workCategories) {
    await page.goto(base + '/works?category=' + category.id);
    assert.equal(await page.locator('#all-projects article').count(), portfolio.projects.filter(p => p.categoryId === category.id).length);
  }
  await page.goto(base + '/works');
  const trigger = page.locator('.project-open').first();
  await trigger.click();
  assert.equal(await page.locator('.project-card').first().evaluate(e => e.classList.contains('is-revealed')), true);
  await trigger.click();
  assert.equal(await page.locator('#project-dialog').evaluate(d => d.open), true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  assert.equal(await trigger.evaluate(e => e === document.activeElement), true);
  for (const route of ['/', '/works']) {
    await page.goto(base + route);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Overflow: ' + route + ' ' + width);
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  assert.equal(await track.evaluate(e => getComputedStyle(e).animationName), 'none');
  await directoryCheck(page.locator('.works-cta'));
  assert.equal(await readFile('index.html', 'utf8'), await readFile('works/index.html', 'utf8'));
  assert.deepEqual(errors, []);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/redesign-monochrome-red.png', fullPage: true });
  console.log('PASS: hero, continuous marquee, six categories, spoilers, dialogs, responsive layout and reduced motion');
} finally { await browser.close(); }
