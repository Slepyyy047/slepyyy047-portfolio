import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const sourceFiles = [
  'index.html', 'works/index.html', 'styles.css', 'app.js', 'content.js', 'wordmark.js',
  'wave.js', 'motion.js', 'letters.js', 'utils.js', 'work-directory.js', 'town.css',
];
const assets = [
  'assets/portrait.webp', 'assets/lampera.webp', 'assets/barberlab.webp',
  'assets/favicon.svg', 'assets/business-quarter.svg',
];

const digest = createHash('sha256');
for (const file of [...sourceFiles, ...assets]) digest.update(file).update(await readFile(join(root, file)));
const version = digest.digest('hex').slice(0, 12);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of [...sourceFiles, ...assets]) {
  const destination = join(output, file);
  await mkdir(dirname(destination), { recursive: true });
  let contents = await readFile(join(root, file));
  if (file.endsWith('.html')) {
    contents = Buffer.from(contents.toString('utf8')
      .replace(/(href="\/(?:styles|town)\.css|src="\/app\.js)(")/g, `$1?v=${version}$2`)
      .replace(/(href="\/assets\/[^"?]+|src="\/assets\/[^"?]+)(")/g, `$1?v=${version}$2`)
      .replace(/(\/assets\/[^\s",]+\.(?:webp|svg))(?=\s|,)/g, `$1?v=${version}`));
  } else if (file.endsWith('.js')) {
    contents = Buffer.from(contents.toString('utf8')
      .replace(/(from\s*['"])(\.\/[^'"]+\.js)(['"])/g, `$1$2?v=${version}$3`));
  }
  await writeFile(destination, contents);
}

const bytes = (await Promise.all([...sourceFiles, ...assets].map(async file => (await readFile(join(output, file))).byteLength)))
  .reduce((total, size) => total + size, 0);
console.log(`Built dist/ (${version}) — ${[...sourceFiles, ...assets].length} files, ${(bytes / 1024).toFixed(1)} KiB`);
