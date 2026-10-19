import test from 'node:test';
import assert from 'node:assert/strict';
import { portfolio } from '../content.js';
import { normalizeCategory, filterProjects, categoryUrl } from '../work-directory.js';

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
