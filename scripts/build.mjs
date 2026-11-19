import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { course } from '../content/course.mjs';
import { walkthroughs } from '../content/walkthroughs.mjs';

const dist = new URL('../dist/', import.meta.url);
function at(path) { return new URL(path, import.meta.url); }

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const template = await readFile(at('../src/index.html'), 'utf8');
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const sections = Map.groupBy(course.lessons, lesson => lesson.section);
const outline = [...sections].map(([section, lessons]) =>
  `<section><h3>${escape(section)}</h3><ul>${lessons.map(lesson =>
    `<li><a href="#${escape(lesson.id)}">${escape(lesson.title)}</a></li>`
  ).join('')}</ul></section>`
).join('\n');
const fields = { ...course.overview, title: course.title, firstLesson: course.lessons[0].id };
const html = template.replace(/{{([a-zA-Z]+)}}/g, (_, key) =>
  key === 'outline' ? outline : escape(fields[key])
);
await writeFile(new URL('index.html', dist), html);
for (const name of ['cover.webp', 'favicon.ico', 'apple-touch-icon.png'])
  await cp(at('../assets/' + name), new URL(name, dist));
const tutorials = {};
for (const lesson of course.lessons) {
  const guide = walkthroughs[lesson.id];
  if (!guide?.goal || !guide.look || !guide.edit || guide.steps?.length < 2)
    throw Error('Incomplete walkthrough for ' + lesson.id);
  if (!['variant', 'command'].includes(guide.edit)) throw Error('Invalid exercise control for ' + lesson.id);
  const steps = guide.steps;
  for (const {heading, text, code} of steps)
    if (!heading || !text || !code || !lesson.command.includes(code))
      throw Error('Invalid command excerpt for ' + lesson.id + ': ' + code);
  tutorials[lesson.id] = { ...guide, steps };
}
await writeFile(new URL('walkthroughs.mjs', dist), 'export const tutorials = ' + JSON.stringify(tutorials) + ';\n');
await cp(at('../src/style.css'), new URL('style.css', dist));
await cp(at('../src/lab.mjs'), new URL('lab.mjs', dist));
await cp(at('../content/course.mjs'), new URL('course.mjs', dist));
await cp(at('../content/references.mjs'), new URL('references.mjs', dist));
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
