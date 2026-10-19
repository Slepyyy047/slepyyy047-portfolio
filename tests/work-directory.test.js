import test from 'node:test';
import assert from 'node:assert/strict';
import { portfolio } from '../content.js';
import { normalizeCategory, filterProjects, categoryUrl, initWorkDirectory } from '../work-directory.js';

const { projects, workCategories: categories } = portfolio;

test('published businesses appear only in the right category', () => {
  assert.deepEqual(filterProjects(projects, categories, 'retail').map(p => p.id), ['lampera']);
  assert.deepEqual(filterProjects(projects, categories, 'barber').map(p => p.id), ['barberlab']);
  assert.deepEqual(filterProjects(projects, categories, 'coffee'), []);
  assert.deepEqual(filterProjects(projects, categories, 'other'), []);
  assert.equal(new Set(categories.map(c => c.id)).size, categories.length);
  for (const project of projects) assert.notEqual(normalizeCategory(project.categoryId, categories), 'all');
});

test('missing or invalid category links show all works without mutating portfolio data', () => {
  for (const value of [null, '', 'all', 'unknown', '<script>']) {
    const result = filterProjects(projects, categories, value);
    assert.deepEqual(result, projects);
    assert.notEqual(result, projects);
    result.pop();
    assert.equal(projects.length, 2);
  }
});

test('new businesses without an assigned known category remain discoverable under other businesses', () => {
  const future = [{ id: 'new' }, { id: 'another', categoryId: 'new-direction' }];
  assert.deepEqual(filterProjects(future, categories, 'other'), future);
  assert.deepEqual(filterProjects(future, categories, 'coffee'), []);
});

test('category URLs preserve direct navigation and cannot inject extra query parameters', () => {
  assert.equal(categoryUrl('all'), '/works');
  for (const category of categories) {
    const url = new URL(categoryUrl(category.id), 'https://portfolio.example');
    assert.equal(url.pathname, '/works');
    assert.equal(url.searchParams.get('category'), category.id);
  }
  const crafted = new URL(categoryUrl('coffee&redirect=https://example.com'), 'https://portfolio.example');
  assert.equal(crafted.searchParams.has('redirect'), false);
});

test('directory traps Tab in both directions and restores focus and previous scroll state', () => {
  const previousDocument = globalThis.document;
  const fakeDocument = { body: { style: { overflow: 'clip' } }, activeElement: null };
  function control() {
    const handlers = {};
    return { handlers, addEventListener(type, handler) { handlers[type] = handler; }, focus() { fakeDocument.activeElement = this; }, getClientRects() { return [{}]; } };
  }
  const opener = control(), close = control(), lastLink = control();
  const dialog = {
    ...control(), open: false,
    querySelector() { return close; },
    querySelectorAll() { return [close, lastLink]; },
    showModal() { this.open = true; },
    close() { this.open = false; this.handlers.close(); },
  };
  try {
    globalThis.document = fakeDocument;
    initWorkDirectory(dialog, { querySelectorAll() { return [opener]; } });
    opener.handlers.click();
    assert.equal(dialog.open, true);
    assert.equal(fakeDocument.body.style.overflow, 'hidden');
    assert.equal(fakeDocument.activeElement, close);
    let prevented = 0;
    lastLink.focus();
    dialog.handlers.keydown({ key: 'Tab', shiftKey: false, preventDefault() { prevented++; } });
    assert.equal(fakeDocument.activeElement, close);
    dialog.handlers.keydown({ key: 'Tab', shiftKey: true, preventDefault() { prevented++; } });
    assert.equal(fakeDocument.activeElement, lastLink);
    assert.equal(prevented, 2);
    close.handlers.click();
    assert.equal(dialog.open, false);
    assert.equal(fakeDocument.body.style.overflow, 'clip');
    assert.equal(fakeDocument.activeElement, opener);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
