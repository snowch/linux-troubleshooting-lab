import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildOffline} from './offline.mjs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
// Shared controls are source assets, included in the verified immutable release.
for (const name of ['offline.mjs','header-controls.mjs','header-controls.LICENSE.txt','release-contract.mjs','release-metadata.mjs','media-range.mjs','runtime-recovery.mjs','runtime-recovery.css','app-status.css','experiment-state.mjs','course-shell.mjs','course-shell.css','guest-files.mjs','material-symbols.mjs','material-symbols.css'])
  await cp(at('../src/' + name), new URL(name, dist));
await cp(at('../src/icons/'), new URL('icons/', dist), { recursive: true });
await cp(at('../runtime/README.md'), new URL('NOTICE.md', dist));
await cp(at('../runtime/packages.tsv'), new URL('runtime/packages.tsv', dist));
const dirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();
const commit=process.env.COURSE_COMMIT || (dirty?null:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
const release=await buildOffline(fileURLToPath(dist), {commit,date:commit?execFileSync('git',['show','-s','--format=%cs',commit],{encoding:'utf8'}).trim():null});
console.log(`Built ${course.title}: ${release.files.length} verified files, ${(release.bytes/1e6).toFixed(1)} MB`);
