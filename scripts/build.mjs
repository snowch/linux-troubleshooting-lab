import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { course } from '../content/course.mjs';

const dist = new URL('../dist/', import.meta.url);
function at(path) { return new URL(path, import.meta.url); }

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const template = await readFile(at('../src/index.html'), 'utf8');
await writeFile(new URL('index.html', dist), template.replaceAll('{{title}}', course.title));
await cp(at('../src/style.css'), new URL('style.css', dist));
await cp(at('../src/lab.mjs'), new URL('lab.mjs', dist));
await cp(at('../content/course.mjs'), new URL('course.mjs', dist));
await cp(at('../runtime/files/'), new URL('runtime/', dist), { recursive: true });
await cp(at('../examples/'), new URL('examples/', dist), { recursive: true });
await cp(at('../assets/fonts/'), new URL('fonts/', dist), { recursive: true });
const entries = (await readdir(dist, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => entry.parentPath.slice(dist.pathname.length) + '/' + entry.name)
  .map(path => path.replace(/^\//, '')).sort();
const hash = createHash('sha256');
const worker = await readFile(at('../src/offline.template.js'), 'utf8');
hash.update(worker);
for (const path of entries) {
  hash.update(path + '\0');
  hash.update(await readFile(new URL(path, dist)));
}
const version = hash.digest('hex').slice(0, 20);
await writeFile(new URL('offline.js', dist), worker
  .replace('__VERSION__', version).replace('__FILES__', JSON.stringify(entries)));
console.log(`Built ${course.title} (${entries.length} offline assets)`);
