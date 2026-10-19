import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { portfolio } from '../content.js';
import { WAVE_DURATION_MS } from '../wave.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const checks = [], base = process.env.TEST_URL || 'http://localhost:4173';
await mkdir('artifacts', { recursive: true });
const pause = ms => page.waitForTimeout(ms);
async function noOverflow(width) {
  await page.setViewportSize({ width, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}: ${page.url()}`);
}
async function revealPreview(container, index = 0) {
  const card = page.locator(`${container} [data-card="${index}"]`);
  const trigger = card.locator('.project-open');
  assert.equal(await card.evaluate(e => e.classList.contains('is-sealed')), true);
  await trigger.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#project-dialog').evaluate(d => d.open), false);
  assert.equal(await card.evaluate(e => e.classList.contains('is-revealed')), true);
  assert.equal(await card.locator('.project-details').isVisible(), true);
  await pause(950);
  assert.equal(await card.locator('.project-veil').isVisible(), false);
  return trigger;
}
async function dialogCheck(container) {
  const trigger = await revealPreview(container);
  await trigger.click();
  assert.equal(await page.locator('#project-dialog').evaluate(d => d.open), true);
  assert.equal(await page.locator('.dialog-close').evaluate(e => e === document.activeElement), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog')), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog')), true);
  await page.keyboard.press('Escape');
  await pause(300);
  assert.equal(await page.locator('#project-dialog').evaluate(d => d.open), false);
  assert.equal(await trigger.evaluate(e => e === document.activeElement), true);
}
try {
  assert.equal((await page.goto(base)).status(), 200);
  await page.waitForFunction(() => document.querySelector('.wordmark')?.dataset.slicing === 'ready');
  await pause(800);
  assert.match(await page.title(), /Slepyyy047/);
  assert.equal(await page.locator('#works-page').isVisible(), false);
  assert.equal(await page.locator('#contact-methods a, #channel-link a').count(), 2);
  assert.equal(await page.locator('#contact-methods a').getAttribute('href'), 'https://t.me/slp_studying');
  assert.equal(await page.locator('#channel-link a').getAttribute('href'), 'https://t.me/+GW8PM4mr1_4zYThh');
  for (const project of portfolio.projects) {
    assert.equal(await page.locator(`#all-projects a[href="${new URL(project.liveUrl).href}"]`).count(), 1);
  }
  assert.equal(await page.evaluate(() => document.body.innerText.replace(document.querySelector('#about').innerText, '').includes('Данило')), false);
  assert.ok(await page.locator('.wordmark-static').evaluate(e => parseFloat(getComputedStyle(e).fontSize)) >= 40);
  assert.equal(await page.evaluate(() => !!(document.querySelector('#about').compareDocumentPosition(document.querySelector('#selected-works')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
  checks.push('Larger wordmark, About before projects, identity and exact project/Telegram links');
  const waveState = () => page.locator('.wave-letter').evaluateAll(letters => letters.map(e => ({opacity: Number(getComputedStyle(e).opacity), filter: getComputedStyle(e).filter, transform: e.style.transform})));
  const crisp = await waveState();
  assert.ok(crisp.length > 15 && crisp.every(s => s.opacity === 1 && s.filter === 'none'));
  assert.equal(await page.locator('#intro-title').getAttribute('aria-label'), 'Сайти, які відчуваються.');
  await page.mouse.wheel(0,40);
  await pause(500);
  const wave = await waveState();
  assert.ok(wave.some(s => s.opacity > 0 && s.opacity < 1 && s.filter.startsWith('blur')));
  assert.ok(wave[0].opacity < wave.at(-1).opacity);
  await page.screenshot({path:'artifacts/scroll-wave.png'});
  // A single 40px wheel input must finish the whole effect by itself.
  await pause(WAVE_DURATION_MS);
  assert.ok((await waveState()).every(s => s.opacity === 0));
  await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
  await pause(WAVE_DURATION_MS + 150);
  assert.deepEqual(await waveState(), crisp);
  checks.push('Single small wheel gesture completes the wave, reverse restores it, and heading has one accessible name');
  assert.equal(await page.locator('.nature-photo').evaluate(img => img.complete && img.naturalWidth > 0), true);
  const landscapeBounds = await page.locator('.intro-landscape').boundingBox();
  await page.mouse.move(landscapeBounds.x + landscapeBounds.width * .8, landscapeBounds.y + landscapeBounds.height * .4);
  await pause(650);
  const natureRight = await page.locator('.nature-scene').evaluate(e => parseFloat(e.style.getPropertyValue('--scene-x')));
  assert.ok(natureRight > 2 && natureRight <= 9);
  await page.mouse.move(landscapeBounds.x + landscapeBounds.width * .2, landscapeBounds.y + landscapeBounds.height * .4);
  await pause(650);
  assert.ok(await page.locator('.nature-scene').evaluate(e => parseFloat(e.style.getPropertyValue('--scene-x'))) < -2);
  assert.deepEqual(await page.locator('.intro-landscape').boundingBox(), landscapeBounds);
  await page.mouse.move(700, 20);
  await pause(700);
  assert.equal(await page.locator('.nature-scene').getAttribute('data-motion'), 'ready');
  checks.push('Nature photo loads locally; pointer depth moves both directions, settles and causes no layout shift');

  const box = await page.locator('.wordmark').boundingBox();
  await page.evaluate(() => {
    const c = document.querySelector('.wordmark canvas');
    window.__wordBase = [...c.getContext('2d').getImageData(0, 0, c.width, c.height).data];
  });
  const differences = async () => page.evaluate(() => {
    const c = document.querySelector('.wordmark canvas'), data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const counts = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i] - window.__wordBase[i]) + Math.abs(data[i+3] - window.__wordBase[i+3]) > 8) {
        const x = (i / 4) % c.width;
        counts[Math.min(2, Math.floor(x / c.width * 3))]++;
      }
    }
    return counts;
  });
  const slices = [];
  for (const fraction of [.2, .5, .8]) {
    await page.mouse.move(box.x + box.width * fraction, box.y + box.height / 2);
    await pause(700);
    slices.push(await differences());
  }
  assert.ok(slices[0][0] > 20 && slices[0][0] > slices[0][2] * 3, JSON.stringify(slices));
  assert.ok(slices[1][1] > 20, JSON.stringify(slices));
  assert.ok(slices[2][2] > 20 && slices[2][2] > slices[2][0] * 3, JSON.stringify(slices));
  assert.deepEqual(await page.locator('.wordmark').boundingBox(), box);
  await page.locator('.wordmark').screenshot({ path: 'artifacts/wordmark-active.png' });
  await page.mouse.move(700, 700);
  await pause(1000);
  assert.deepEqual(await differences(), [0, 0, 0]);
  assert.equal(await page.locator('.wordmark').getAttribute('data-slicing'), 'ready');
  checks.push({ wordmark: 'Real canvas pixels: left/middle/right locality, fixed bounds and exact return', changedPixelsByThird: slices });

  const directoryButton = page.locator('#selected-works [data-open-directory]');
  await directoryButton.click();
  assert.equal(await page.locator('#work-directory').evaluate(d => d.open), true);
  assert.equal(await page.locator('.directory-option').count(), portfolio.workCategories.length);
  assert.equal(await page.locator('.directory-close').evaluate(e => e === document.activeElement), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#work-directory').evaluate(d => d.open), false);
  assert.equal(await directoryButton.evaluate(e => e === document.activeElement), true);
  await directoryButton.click();
  await page.locator('#work-directory a[href="/works"]').click();
  await page.waitForURL('**/works');
  assert.equal(await page.locator('#works-page').isVisible(), true);
  assert.equal(await page.locator('#home-page').isVisible(), false);
  assert.equal(await page.locator('#all-projects article').count(), portfolio.projects.length);
  await page.reload();
  await dialogCheck('#all-projects');
  assert.equal((await page.goto(base + '/works/')).status(), 200);
  assert.equal(await page.locator('#works-page').isVisible(), true);
  checks.push('Town directory, Escape and focus restore, /works direct entry and project dialogs');
  for (const category of portfolio.workCategories) {
    await page.goto(base + '/works?category=' + category.id);
    const expected = portfolio.projects.filter(project => project.categoryId === category.id);
    assert.equal(await page.locator('#all-projects article').count(), expected.length);
    assert.equal(await page.locator('.work-filter[aria-current="true"]').getAttribute('href'), '/works?category=' + category.id);
    if (!expected.length) assert.equal(await page.locator('.gallery-empty').isVisible(), true);
    else assert.equal(await page.locator('#all-projects h3').first().textContent().then(text => text.includes(expected[0].title)), true);
  }
  await page.goto(base + '/works?category=unknown');
  assert.equal(await page.locator('#all-projects article').count(), portfolio.projects.length);
  checks.push('All category routes, counts, active filter, honest empty states and invalid-category fallback');
  for (const route of ['/', '/works']) {
    await page.goto(base + route);
    for (const width of [320, 390, 560, 768, 1024, 1440]) await noOverflow(width);
  }
  checks.push('Home/gallery responsive overflow at 320, 390, 560, 768, 1024 and 1440px');
  await page.goto(base);
  for (const [width,height] of [[640,360],[812,375],[320,568]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
    assert.equal(await page.evaluate(() => {
      const section=document.querySelector('.intro-landscape'),stage=document.querySelector('.hero-stage');
      return section.offsetHeight >= stage.offsetHeight && document.querySelector('#selected-works').getBoundingClientRect().top >= stage.getBoundingClientRect().bottom;
    }), true, `short-viewport hero overlap at ${width}x${height}`);
  }
  checks.push('Short portrait/landscape viewports preserve hero bounds without section overlap');

  await page.goto(base);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/#about');
  await pause(900);
  assert.equal(await page.evaluate(() => {
    const target = document.querySelector('#about').getBoundingClientRect().top + scrollY - 18;
    const expected = Math.min(target, document.documentElement.scrollHeight - innerHeight);
    return Math.abs(scrollY - expected) < 5;
  }), true);
  await page.locator('.header a[href="/#contact"]').click();
  await pause(900);
  assert.equal(await page.locator('#contact').isVisible(), true);
  checks.push('Compact mobile navigation and actual section anchor scrolling');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('.wordmark')?.dataset.slicing === 'ready');
  const reducedBox = await page.locator('.wordmark').boundingBox();
  await page.mouse.move(reducedBox.x + 60, reducedBox.y + 24);
  await pause(150);
  assert.equal(await page.locator('.wordmark').getAttribute('data-slicing'), 'ready');
  assert.equal(await page.locator('.intro-main').evaluate(e => getComputedStyle(e).animationName), 'none');
  assert.equal(await page.locator('.nature-scene').getAttribute('data-motion'), 'static');
  assert.equal(await page.locator('.nature-scene').evaluate(e => parseFloat(e.style.getPropertyValue('--scene-x'))), 0);
  await page.evaluate(() => scrollTo({top:250,behavior:'instant'}));
  await pause(200);
  assert.ok((await waveState()).every(s => s.opacity === 1 && s.filter === 'none'));
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touchPage = await touch.newPage();
  await touchPage.goto(base);
  await touchPage.locator('.wordmark').tap();
  await touchPage.waitForFunction(() => document.querySelector('.wordmark')?.dataset.slicing === 'ready');
  assert.equal(await touchPage.locator('.wordmark').getAttribute('data-slicing'), 'ready');
  assert.equal(await touchPage.locator('.nature-scene').getAttribute('data-motion'), 'static');
  await touch.close();
  checks.push('System reduced motion and real touch context static wordmark');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(base);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(async () => { const imgs=[...document.querySelectorAll('img')]; imgs.forEach(i=>i.loading='eager'); await Promise.all(imgs.map(i=>i.decode().catch(()=>{}))); });
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('visible')));
  await pause(800);
  await page.screenshot({ path: 'artifacts/redesign-desktop.png' });
  await page.screenshot({ path: 'artifacts/redesign-full.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/redesign-mobile.png' });
  await page.screenshot({ path: 'artifacts/redesign-mobile-full.png', fullPage: true });
  await page.goto(base + '/works');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await pause(700);
  await page.screenshot({ path: 'artifacts/redesign-works.png', fullPage: true });

  const fixture = structuredClone(portfolio);
  fixture.contacts.email = 'test@example.com';
  fixture.contacts.telegram = 'https://example.com/telegram';
  fixture.channel = { name: 'Тестовий канал', platform: 'Telegram', url: 'https://example.com/channel' };
  fixture.projects[0] = { ...fixture.projects[0], placeholder: false, cover: './assets/missing.webp', liveUrl: 'https://example.com/project', sourceUrl: 'javascript:alert(1)', role: 'Дизайн і розробка', screenshots: [{ src: './assets/danylo.png', alt: 'Тестовий екран' }, 'assets/missing-2.webp'] };
  await page.route('**/content.js', route => route.fulfill({ contentType: 'text/javascript', body: `export const portfolio = ${JSON.stringify(fixture)}` }));
  await page.goto(base + '/works/');
  await page.locator('#copy-email').click();
  await page.waitForFunction(() => document.querySelector('#toast').textContent === 'Email скопійовано');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), fixture.contacts.email);
  assert.equal(await page.locator('#channel-link a').getAttribute('href'), fixture.channel.url);
  await revealPreview('#all-projects');
  await page.locator('#all-projects .project-open[data-project="0"]').click();
  await pause(300);
  assert.equal(await page.locator('#dialog-content a').count(), 1);
  assert.match(await page.locator('#dialog-content').innerText(), /ЗОБРАЖЕННЯ НЕДОСТУПНЕ/);
  assert.match(await page.locator('#dialog-content').innerText(), /Дизайн і розробка/);
  assert.equal(await page.locator('.dialog-gallery img').first().evaluate(e => e.naturalWidth > 0), true);
  await page.keyboard.press('Escape');
  checks.push('Fixture: actual clipboard, channel/contacts, valid URLs only, contribution and gallery assets on /works/');
  await page.route('**/assets/portrait.webp', route => route.abort());
  await page.route('**/assets/alpine-landscape*.webp', route => route.abort());
  await page.goto(base);
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.locator('.portrait-fallback').waitFor();
  assert.equal(await page.locator('.portrait-fallback').getAttribute('role'), 'img');
  assert.equal(await page.locator('.nature-scene').evaluate(e => e.classList.contains('image-unavailable')), true);
  checks.push('Broken cover/screenshot/portrait fallback states');
  assert.deepEqual(errors, []);
  assert.equal(await readFile('works/index.html', 'utf8'), await readFile('index.html', 'utf8'));
  checks.push('No uncaught browser errors; static-host /works/index.html matches app shell');
  await writeFile('artifacts/browser-results.json', JSON.stringify({ checks, errors }, null, 2));
  for (const check of checks) console.log('PASS', typeof check === 'string' ? check : JSON.stringify(check));
} finally { await browser.close(); }

