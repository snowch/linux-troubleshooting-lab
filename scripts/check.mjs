import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { course } from '../content/course.mjs';
import { references } from '../dist/references.mjs';

const dist = new URL('../dist/', import.meta.url);
const content = await readFile(new URL('offline.js', dist), 'utf8');
const match = /^const FILES = (.+);$/m.exec(content);
assert(match, 'generated offline asset list');
const offlinePaths = new Set(JSON.parse(match[1]));
const guest = JSON.parse(await readFile(new URL('runtime/parts.json', dist), 'utf8'));
let bytes = 0;
for (const name of guest.parts) {
  bytes += (await stat(new URL('runtime/' + name, dist))).size;
  assert(offlinePaths.has('runtime/' + name), name + ' must be saved offline');
}
assert.equal(bytes, guest.bytes);
for (const path of ['index.html', 'style.css', 'lab.mjs', 'course.mjs', 'walkthroughs.mjs', 'references.mjs', 'runtime/libv86.mjs',
  'runtime/v86.wasm', 'runtime/vmlinuz-virt', 'runtime/parts.json',
  'runtime/seabios.bin', 'runtime/vgabios.bin', 'fonts/plex-sans.woff2', 'fonts/plex-mono-400.woff2'])
  assert(offlinePaths.has(path), path + ' must be saved offline');
for (const name of course.assets) {
  assert(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name), 'invalid guest asset name');
  assert(offlinePaths.has('examples/' + name), name + ' must be saved offline');
}
for (const image of ['cover.webp', 'favicon.ico', 'apple-touch-icon.png'])
  assert(offlinePaths.has(image), image + ' must be saved offline');
const html = await readFile(new URL('index.html', dist), 'utf8');
assert(html.includes('href="#' + course.lessons[0].id + '"'), 'overview links to the first lesson');
assert(!html.includes('{{'), 'overview placeholders must be rendered');
const ids = new Set();
for (const lesson of course.lessons) {
  assert(!ids.has(lesson.id), 'duplicate lesson ID');
  ids.add(lesson.id);
  const entries = references[lesson.id];
  assert(Array.isArray(entries) && entries.length >= 2, lesson.id + ': expected API references');
  const urls = new Set();
  for (const { title, url, note } of entries) {
    assert(typeof title === 'string' && title.trim(), lesson.id + ': reference title');
    assert(typeof note === 'string' && note.trim(), lesson.id + ': offline reference note');
    assert.equal(new URL(url).protocol, 'https:', lesson.id + ': reference URL');
    assert(!urls.has(url), lesson.id + ': duplicate reference link: ' + url);
    urls.add(url);
  }
  for (const key of ['section', 'title', 'intro', 'question', 'task', 'hint', 'explanation', 'transfer', 'command'])
    assert(typeof lesson[key] === 'string' && lesson[key].trim(), lesson.id + ': ' + key);
  assert(/^strace\s/m.test(lesson.command), 'starter command invokes strace');
}
assert.equal(Object.keys(references).length, ids.size, 'one reference list per lesson');
console.log(`Checked ${ids.size} lessons and ${offlinePaths.size} offline assets`);
