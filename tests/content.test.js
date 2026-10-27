import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { safeUrl, safeImage, validEmail, escapeHtml } from '../utils.js';
import { portfolio } from '../content.js';

test('external links exclude empty, relative and executable URLs', () => {
  for (const value of ['', null, undefined, '#', '/work', 'javascript:alert(1)', 'data:text/html,hello', 'tg://user']) assert.equal(safeUrl(value), null);
  assert.equal(safeUrl('https://example.com/work'), 'https://example.com/work');
});
test('image paths support local assets and reject executable sources', () => {
  assert.equal(safeImage('assets/work.webp'), 'assets/work.webp');
  assert.equal(safeImage('javascript:alert(1)'), null);
  assert.equal(safeImage('data:image/svg+xml,<svg/>'), null);
});
test('email validation excludes header and query injection', () => {
  assert.equal(validEmail('hello@example.com'), 'hello@example.com');
  for (const value of [null, '', 'name', 'a@b', 'a@b.com?bcc=other@example.com', 'a@b.com\r\nBCC:x@y.com']) assert.equal(validEmail(value), null);
});
test('editable text cannot become HTML', () => assert.equal(escapeHtml('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;'));
test('provided projects use their live links and supplied screenshot assets', async () => {
  assert.deepEqual(portfolio.projects.map(({ id, title, liveUrl, cover }) => ({ id, title, liveUrl, cover })), [
    { id: 'mono-barber', title: 'MONO BARBER', liveUrl: 'https://mono-barber-xi.vercel.app/#home', cover: 'assets/mono-barber.webp' },
    { id: 'luxe', title: 'LUXE Hair Studio', liveUrl: 'https://luxe-hair-studio-ruddy.vercel.app/uk', cover: 'assets/luxe.webp' },
    { id: 'velune', title: 'VELUNE', liveUrl: 'https://velune-theta.vercel.app/', cover: 'assets/velune.webp' },
    { id: 'krykhta', title: 'КРИХТА', liveUrl: 'https://krykhta-patisserie.vercel.app/', cover: 'assets/krykhta.webp' },
    { id: 'lampera', title: 'LAMPERA', liveUrl: 'https://lampera.base44.app', cover: 'assets/lampera.webp' },
    { id: 'barberlab', title: 'BARBERLAB', liveUrl: 'https://barberlab-busk.vercel.app', cover: 'assets/barberlab.webp' },
  ]);
  assert.ok(portfolio.projects.every(project => !project.placeholder && !project.role && !project.sourceUrl));
  for (const project of portfolio.projects) {
    assert.ok(safeUrl(project.liveUrl));
    assert.equal(safeImage(project.cover), project.cover);
    const asset = await readFile(new URL(`../${project.cover}`, import.meta.url));
    assert.equal(asset.toString('ascii', 0, 4), 'RIFF');
    assert.equal(asset.toString('ascii', 8, 12), 'WEBP');
  }
});
test('provided contact and channel links are valid and project identities stay unique', () => {
  assert.equal(portfolio.contacts.email, null);
  assert.equal(portfolio.contacts.telegram, 'https://t.me/foxyredCEO');
  assert.ok(safeUrl(portfolio.contacts.telegram));
  assert.equal(portfolio.channel.name, 'Мій Telegram-канал');
  assert.equal(portfolio.channel.url, 'https://t.me/+GW8PM4mr1_4zYThh');
  assert.ok(safeUrl(portfolio.channel.url));
  assert.equal(new Set(portfolio.projects.map(project => project.id)).size, portfolio.projects.length);
});
