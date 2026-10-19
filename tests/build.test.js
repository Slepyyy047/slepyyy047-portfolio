import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const build = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8' });
assert.equal(build.status, 0, build.stderr || build.stdout);

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }))).flat();
}

test('production output contains only allowlisted runtime files and used image assets', async () => {
  const files = (await filesUnder(dist)).map(path => relative(dist, path).replaceAll('\\', '/')).sort();
  const expected = [
    'app.js',
    'assets/barberlab.webp', 'assets/favicon.svg', 'assets/lampera.webp', 'assets/portrait.webp',
    'content.js', 'index.html', 'letters.js', 'motion.js', 'styles.css',
    'utils.js', 'wave.js', 'wordmark.js', 'works/index.html', 'work-directory.js', 'town.css', 'assets/business-quarter.svg',
  ].sort();
  assert.deepEqual(files, expected);
});

test('HTML routes use deterministic cache versions for entry files and image URLs', async () => {
  for (const file of ['index.html', 'works/index.html']) {
    const html = await readFile(join(dist, file), 'utf8');
    const versions = [...html.matchAll(/[?&]v=([a-f0-9]{12})/g)].map(match => match[1]);
    assert.ok(versions.length >= 7, `${file} should version css, app and image references`);
    assert.equal(new Set(versions).size, 1, `${file} should use one build version`);
    assert.match(html, /href="\/styles\.css\?v=/);
    assert.match(html, /href="\/town\.css\?v=/);
    assert.match(html, /src="\/app\.js\?v=/);
    assert.match(html, /src="\/assets\/lampera\.webp\?v=[a-f0-9]{12}"/);
    assert.match(html, /src="\/assets\/barberlab\.webp\?v=[a-f0-9]{12}"/);
  }
});

test('module imports resolve to versioned files in the production output', async () => {
  const names = ['app.js', 'content.js', 'wordmark.js', 'wave.js', 'motion.js', 'letters.js', 'utils.js', 'work-directory.js'];
  const jsFiles = await Promise.all(names.map(async name => [name, await readFile(join(dist, name), 'utf8')]));
  const versionSet = new Set();
  for (const [name, source] of jsFiles) {
    for (const match of source.matchAll(/from\s*['"](\.\/([^?'"/]+\.js))\?v=([a-f0-9]{12})['"]/g)) {
      assert.ok(names.includes(match[2]), `${name} imports non-runtime module ${match[2]}`);
      versionSet.add(match[3]);
    }
    assert.doesNotMatch(source, /from\s*['"]\.\/[^?'"/]+\.js['"]/);
  }
  assert.equal(versionSet.size, 1);
  assert.equal(await readFile(join(dist, 'works/index.html'), 'utf8'), await readFile(join(dist, 'index.html'), 'utf8'));
});

test('Vercel serves the static build with revalidation and baseline security headers', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
  assert.equal(config.framework, null);
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
  assert.equal(config.cleanUrls, true);
  const headers = config.headers[0].headers;
  assert.ok(headers.some(({ key, value }) => key === 'Cache-Control' && value.includes('must-revalidate')));
  assert.ok(headers.some(({ key, value }) => key === 'X-Content-Type-Options' && value === 'nosniff'));
  assert.ok(headers.some(({ key, value }) => key === 'Referrer-Policy' && value === 'strict-origin-when-cross-origin'));
});
