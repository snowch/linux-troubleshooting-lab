import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url)).replace(/\/$/, '');
const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript',
  '.mjs':'application/javascript', '.json':'application/json', '.wasm':'application/wasm',
  '.webp':'image/webp', '.ico':'image/x-icon', '.png':'image/png', '.woff2':'font/woff2', '.c':'text/plain', '.h':'text/plain' };
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) throw Error();
    const info = await stat(file);
    if (!info.isFile()) throw Error();
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('File not found');
  }
}).listen(Number(process.env.PORT || 4173), '0.0.0.0');
