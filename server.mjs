import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const port = Number(process.env.PORT || 4173);
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const page = ['/', '/works', '/works/'].includes(url.pathname) ? '/index.html' : url.pathname;
    const path = resolve(root, '.' + decodeURIComponent(page));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || !types[extname(path)]) {
      res.writeHead(404).end('Not found'); return;
    }
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)], 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Portfolio: http://localhost:${port}`));
