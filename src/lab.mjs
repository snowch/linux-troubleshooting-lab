import { course } from './course.mjs';

const $ = id => document.getElementById(id);
const source = $('source');
const variant = $('variant');
const evidence = $('evidence');
const terminal = $('terminal');
const command = $('command');
const status = $('runtime-status');
const shellOutput = $('shell-output');
const runButton = $('run');
const encoder = new TextEncoder();
let decoder = new TextDecoder();
const serialByte = new Uint8Array(1);
const key = 'linux-lab:' + course.slug + ':';
const drafts = new Map();
const draftMessages = new Map();
const latestRuns = new Map();
const earlierRuns = new Map();
let lesson;
let vm, activeRun, guestReady = false, resetting = false, line = '', shellText = '';
let runNumber = 0, storageReadUnavailable = false;

function read(keyName) {
  try { return localStorage.getItem(key + keyName); }
  catch { storageReadUnavailable = true; return null; }
}
function save(keyName, value) {
  try { localStorage.setItem(key + keyName, value); return true; }
  catch { return false; }
}
function remove(keyName) {
  try { localStorage.removeItem(key + keyName); return true; }
  catch { return false; }
}
function theme(value) {
  document.documentElement.dataset.theme = value;
  $('theme').textContent = value === 'dark' ? 'Light theme' : 'Dark theme';
}
theme(read('theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('theme').onclick = () => {
  const value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  theme(value);
  save('theme', value);
};

function draftKey(field) { return lesson.id + '/' + field; }
function draftValue(field, fallback) {
  const name = draftKey(field);
  return drafts.get(name) ?? read(name) ?? fallback;
}
function showWorkStatus() {
  const commandMessage = draftMessages.get(draftKey('command')) ?? (storageReadUnavailable
    ? 'The browser could not read saved work. You can work in this tab and download a copy before leaving.' : '');
  setText($('command-status'), commandMessage);
  setText($('evidence-status'), draftMessages.get(draftKey('evidence')) ?? '');
  setText($('case-status'), draftMessages.get(draftKey('variant')) ?? '');
  $('restore').hidden = source.value === lesson.command;
}
function writeDraft(field, value, label) {
  const name = draftKey(field);
  drafts.set(name, value);
  const saved = save(name, value);
  draftMessages.set(name, saved ? (field === 'variant' ? '' : label + ' saved in this browser.') :
    'The browser could not save your ' + label.toLowerCase() + '. Keep working in this tab or download a copy before leaving.');
  showWorkStatus();
}
source.oninput = () => {
  writeDraft('command', source.value, 'Trace command');
  showRun();
};
evidence.oninput = () => writeDraft('evidence', evidence.value, 'Notes');
variant.onchange = () => {
  writeDraft('variant', variant.value, 'Case selection');
  $('earlier-run').open = false;
  showRun();
};
$('restore').onclick = () => {
  if (!confirm('Replace your edited trace command with the starter command for this lesson? Your notes stay in place.')) return;
  const name = draftKey('command');
  const removed = remove(name);
  if (removed) drafts.delete(name);
  else drafts.set(name, lesson.command);
  source.value = lesson.command;
  draftMessages.set(name, removed ? 'Starter command restored.' :
    'Starter command restored in this tab. The browser could not remove the saved edit, which may return when you reopen the lesson.');
  showWorkStatus();
  showRun();
  source.focus({ preventScroll: true });
};
$('download-work').onclick = () => {
  const copy = [lesson.title, 'Case: ' + caseLabel(variant.value), '', 'Trace command', source.value,
    '', 'Trace evidence and diagnosis', evidence.value].join('\n') + '\n';
  const url = URL.createObjectURL(new Blob([copy], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.download = lesson.id + '-troubleshooting.txt';
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const picker = $('lesson-picker');
let group;
for (const item of course.lessons) {
  if (group?.label !== item.section) {
    group = document.createElement('optgroup');
    group.label = item.section;
    picker.append(group);
  }
  group.append(new Option(item.title, item.id));
}
picker.onchange = () => { location.hash = picker.value; };

function showLesson(index) {
  lesson = course.lessons[index];
  document.title = lesson.title + ' · ' + course.title;
  for (const [id, field] of Object.entries({
    'lesson-title':'title', section:'section', intro:'intro', question:'question', 'look-for':'evidence',
    instructions:'instructions', task:'task', hint:'hint', explanation:'explanation',
    transfer:'transfer'
  })) $(id).textContent = lesson[field] ?? course[field];
  const reference = $('reference');
  reference.href = lesson.reference[1];
  reference.textContent = lesson.reference[0];
  picker.value = lesson.id;
  $('next-lesson').replaceChildren();
  for (const [other, label] of [[course.lessons[index - 1], 'Previous'], [course.lessons[index + 1], 'Next']]) {
    if (!other) continue;
    const link = document.createElement('a');
    link.href = '#' + other.id;
    link.textContent = label + ' · ' + other.title;
    $('next-lesson').append(link);
  }
  source.value = draftValue('command', lesson.command);
  source.scrollTop = 0;
  source.scrollLeft = 0;
  evidence.value = draftValue('evidence', '');
  variant.value = draftValue('variant', 'broken') === 'fixed' ? 'fixed' : 'broken';
  $('earlier-run').open = false;
  showWorkStatus();
  showRun();
}
function showRoute(moveFocus = false) {
  const index = course.lessons.findIndex(item => '#' + item.id === location.hash);
  const inLesson = index >= 0;
  const pickerFocused = document.activeElement === picker;
  $('overview').hidden = inLesson;
  $('lesson-navigation').hidden = !inLesson;
  $('workbench').hidden = !inLesson;
  if (inLesson) void showLesson(index);
  else {
    lesson = undefined;
    document.title = course.title;
  }
  if (moveFocus) {
    if (!inLesson || !pickerFocused)
      $(inLesson ? 'lesson-title' : 'overview-title').focus({preventScroll: true});
    $('main').scrollIntoView();
  }
}
document.querySelector('.skip-link').onclick = event => {
  event.preventDefault();
  $('main').focus();
};
addEventListener('hashchange', () => {
  if (location.hash !== '#main') showRoute(true);
});
let repaint = 0;
showRoute();
function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}
function caseLabel(caseValue) {
  return caseValue === 'fixed' ? 'Repaired' : 'Failing';
}
function outputKey(item, caseValue) {
  return item.id + '/' + caseValue;
}
function paint() {
  if (!repaint) repaint = requestAnimationFrame(() => {
    repaint = 0;
    showOutput();
  });
}
function output(element, text) {
  const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 40;
  setText(element, text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ''));
  if (nearBottom) element.scrollTop = element.scrollHeight;
}
function showOutput() {
  const run = lesson && latestRuns.get(outputKey(lesson, variant.value));
  const liveLine = run && run === activeRun && run.capture ? line : '';
  output(terminal, run ? (run.text + liveLine || (run === activeRun ? 'Waiting for Linux output…' : 'This run produced no output.')) :
    'Choose Run in Linux to see the trace for this case.');
  output(shellOutput, shellText + (!activeRun?.submitted ? line : '') || 'Linux is off.');
}
function runSource(run) {
  const command = run.trace === run.lesson.command.trim() ? 'the starter trace command' : 'an edited trace command';
  return 'Run ' + run.number + ' used the ' + caseLabel(run.caseValue) + ' case and ' + command + '.';
}
function showRun() {
  if (!lesson) return;
  const name = outputKey(lesson, variant.value);
  const run = latestRuns.get(name);
  const earlier = earlierRuns.get(name);
  const provenance = $('result-source');
  provenance.hidden = !run;
  if (run) setText(provenance, runSource(run) + (run.trace !== source.value.trim() ?
    ' The trace command has changed since this run.' : ''));
  $('earlier-run').hidden = !earlier;
  if (earlier) {
    setText($('earlier-source'), runSource(earlier));
    setText($('earlier-output'), earlier.text);
  }
  const busy = Boolean(activeRun || resetting);
  const message = resetting ? 'Resetting Linux…' : activeRun && activeRun !== run ?
    'A run is active in ' + activeRun.lesson.title + ', ' + caseLabel(activeRun.caseValue) + ' case.' :
    run?.message ?? (guestReady ? 'Linux is ready' : 'Linux is off');
  setText(status, message);
  if (busy) runButton.setAttribute('aria-disabled', 'true');
  else runButton.removeAttribute('aria-disabled');
  const stop = $('stop');
  stop.hidden = !(activeRun?.controller || activeRun?.submitted);
  stop.disabled = activeRun?.controller?.signal.aborted ?? false;
  setText(stop, activeRun?.controller ? 'Stop loading Linux' : 'Interrupt run');
  const shellReady = guestReady && !busy;
  command.disabled = !shellReady;
  $('shell').querySelector('button').disabled = !shellReady;
  $('shell-stop').disabled = !shellReady;
  $('restart').disabled = !guestReady || resetting || Boolean(activeRun && !activeRun.submitted);
  showOutput();
}
function runMessage(run, message) {
  run.message = message;
  showRun();
}
function complete(run, message, finished = false) {
  run.finished = finished;
  activeRun = undefined;
  line = '';
  runMessage(run, message);
}
function receive(byte) {
  const run = activeRun;
  if (byte === 10) {
    const completed = line;
    line = '';
    if (run && completed === run.startMarker) {
      run.capture = true;
    } else if (run && completed === run.commandMarker) {
      run.commandStarted = true;
    } else if (run && completed.startsWith(run.resultMarker) && /^\d+$/.test(completed.slice(run.resultMarker.length))) {
      const exit = completed.slice(run.resultMarker.length);
      if (run.interrupt && (exit === '130' || exit === '143')) complete(run, 'Run interrupted');
      else if (!run.commandStarted) complete(run, 'Fixture setup exited with status ' + exit);
      else if (exit === '0') complete(run, 'Command finished with exit status 0', true);
      else complete(run, 'Command exited with status ' + exit, true);
    } else if (run?.capture) {
      run.text = (run.text + completed + '\n').slice(-32000);
    } else if (!run?.submitted) {
      shellText = (shellText + completed + '\n').slice(-16000);
    }
  } else if (byte === 8) {
    line = line.slice(0, -1);
  } else if (byte !== 13 && (byte >= 32 || byte === 9 || byte === 27)) {
    serialByte[0] = byte;
    line = (line + decoder.decode(serialByte, { stream: true })).slice(-5000);
    if (run?.interrupt && line === '~ # ') complete(run, 'Run interrupted');
  }
  paint();
}

async function initrd(run, signal) {
  const response = await fetch('./runtime/parts.json', { signal });
  if (!response.ok) throw Error('Could not open the Linux guest manifest');
  const { parts, bytes } = await response.json();
  const image = new Uint8Array(bytes);
  // The image builder writes fixed 16 MiB parts, with a shorter final part.
  // Stream into the final buffer so overlapping requests do not duplicate the image.
  const partSize = 16 * 1024 * 1024;
  if (parts.length !== Math.ceil(bytes / partSize)) throw Error('Invalid Linux guest manifest');
  let loaded = 0, progress = -1;
  async function loadPart(name, index) {
    const start = index * partSize;
    const end = Math.min(start + partSize, bytes);
    let offset = start;
    const part = await fetch('./runtime/' + name, { signal });
    if (!part.ok) throw Error('Could not load Linux guest file ' + name);
    function append(chunk) {
      if (offset + chunk.length > end) throw Error('Invalid Linux guest file ' + name);
      image.set(chunk, offset);
      offset += chunk.length;
      loaded += chunk.length;
      const percent = Math.floor(100 * loaded / bytes);
      if (percent !== progress) {
        progress = percent;
        runMessage(run, 'Loading Linux image · ' + progress + '%');
      }
    }
    if (part.body?.getReader) {
      const reader = part.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          append(value);
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      append(new Uint8Array(await part.arrayBuffer()));
    }
    if (offset !== end) throw Error('Incomplete Linux guest file ' + name);
  }
  const batchSize = 3;
  for (let index = 0; index < parts.length; index += batchSize) {
    await Promise.all(parts.slice(index, index + batchSize).map((name, offset) =>
      loadPart(name, index + offset)));
  }
  return image.buffer;
}

async function bootLinux(run, signal) {
  shellText = '';
  line = '';
  decoder = new TextDecoder();
  paint();
  const [{ V86 }, image] = await Promise.all([import('./runtime/libv86.mjs'), initrd(run, signal)]);
  signal.throwIfAborted();
  runMessage(run, 'Booting Linux');
  vm = new V86({
    wasm_path: './runtime/v86.wasm',
    bios: { url: './runtime/seabios.bin' },
    vga_bios: { url: './runtime/vgabios.bin' },
    bzimage: { url: './runtime/vmlinuz-virt' },
    initrd: { buffer: image },
    cmdline: 'console=ttyS0,115200 rdinit=/init rootfstype=ramfs nokaslr panic=1 quiet',
    memory_size: 768 * 1024 * 1024, filesystem: {},
    disable_keyboard: true, disable_mouse: true, autostart: true
  });
  await new Promise((resolve, reject) => {
    let recent = '';
    const timeout = setTimeout(() => finish(new Error('Linux did not reach its shell. Try running again.')), 300000);
    const cancel = () => finish(signal.reason);
    function finish(error) {
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
      vm.remove_listener('serial0-output-byte', listener);
      if (error) reject(error); else resolve();
    }
    function listener(byte) {
      recent = (recent + String.fromCharCode(byte)).slice(-200);
      if (recent.includes('LAB_EXCHANGE_FAILED')) finish(Error('Linux could not mount the editor file share.'));
      if (recent.includes('LAB_READY') && recent.includes('~ # ')) finish();
    }
    signal.addEventListener('abort', cancel, { once: true });
    vm.add_listener('serial0-output-byte', receive);
    vm.add_listener('serial0-output-byte', listener);
  });
  runMessage(run, 'Loading trace tools');
  for (const name of course.assets) {
    const response = await fetch('./examples/' + name, { signal });
    if (!response.ok) throw Error('Could not load ' + name);
    await vm.create_file('strace-' + name, new Uint8Array(await response.arrayBuffer()));
  }
  signal.throwIfAborted();
  guestReady = true;
}

runButton.onclick = async () => {
  if (!lesson || activeRun || resetting) return;
  const trace = source.value.trim();
  if (!trace) {
    setText(status, 'Enter a trace command');
    source.focus();
    return;
  }
  const caseValue = variant.value;
  const number = ++runNumber;
  const marker = '__LAB_RUN_' + number;
  const run = { lesson, caseValue, trace, number, text: '',
    startMarker: marker + '_START__', commandMarker: marker + '_COMMAND__', resultMarker: marker + '_EXIT__' };
  const name = outputKey(lesson, caseValue);
  const earlier = latestRuns.get(name);
  if (earlier?.finished) earlierRuns.set(name, earlier);
  $('earlier-run').open = false;
  latestRuns.set(name, run);
  activeRun = run;
  terminal.scrollTop = 0;
  runMessage(run, guestReady ? 'Preparing the case' : 'Loading Linux');
  try {
    if (!guestReady) {
      run.controller = new AbortController();
      showRun();
      await bootLinux(run, run.controller.signal);
      run.controller = undefined;
    }
    const prefix = 'run-' + number + '-';
    const work = '/tmp/strace-lab/case-' + number;
    const scriptName = '/exchange/' + prefix + 'exercise.sh';
    const setup = [
      'set -e',
      `trap 'rm -f ${scriptName}; rm -rf ${work}' EXIT`,
      'trap "exit 130" INT TERM',
      `printf '\n${run.startMarker}\n'`,
      'export LAB_WORK=' + work,
      'export LAB_VARIANT=' + caseValue,
      'export LAB_BIN=/tmp/strace-lab/bin',
      '. /exchange/strace-prepare.sh',
      'export PATH="$LAB_BIN:$PATH"',
      `printf '\n${run.commandMarker}\n'`,
      'set +e',
      '(',
      trace,
      ')'
    ];
    const script = setup.join('\n') + '\n';
    await vm.create_file(prefix + 'exercise.sh', encoder.encode(script));
    run.submitted = true;
    runMessage(run, 'Running in Linux');
    vm.serial0_send(`sh ${scriptName}; printf '\\n${run.resultMarker}%s\\n' "$?"\n`);
  } catch (error) {
    const cancelled = run.controller?.signal.aborted;
    run.controller?.abort();
    run.controller = undefined;
    if (vm) await vm.destroy().catch(() => {});
    vm = undefined;
    guestReady = false;
    run.text = cancelled ? '' : error.message;
    complete(run, cancelled ? 'Linux startup stopped. Run again to restart.' : 'Could not start the run');
  }
};

$('stop').onclick = () => {
  if (activeRun?.controller) {
    activeRun.controller.abort();
    runMessage(activeRun, 'Stopping Linux startup…');
    return;
  }
  if (!vm || !activeRun?.submitted) return;
  activeRun.interrupt = true;
  runMessage(activeRun, 'Interrupt sent to Linux');
  vm.serial0_send('\x03');
};
$('shell-stop').onclick = () => vm?.serial0_send('\x03');
$('restart').onclick = async () => {
  if (!guestReady || resetting || !confirm('Reset Linux and discard its temporary files? Commands and notes are kept.')) return;
  resetting = true;
  if (activeRun) complete(activeRun, 'Run ended when Linux was reset');
  const old = vm;
  vm = undefined;
  guestReady = false;
  showRun();
  try {
    await old.destroy();
    shellText = 'Linux has been reset. Choose Run in Linux to start it again.\n';
  } catch (error) {
    shellText = 'Could not finish resetting Linux: ' + error.message;
  } finally {
    resetting = false;
    line = '';
    showRun();
  }
};
$('shell').onsubmit = event => {
  event.preventDefault();
  if (!guestReady || activeRun || resetting || !command.value.trim()) return;
  vm.serial0_send(command.value + '\n');
  command.value = '';
};

const offline = $('offline');
const offlineStatus = $('offline-status');
function showOffline(message) {
  offlineStatus.textContent = message;
  offlineStatus.hidden = !message;
}
function ask(worker, type, handle) {
  const channel = new MessageChannel();
  channel.port1.onmessage = event => {
    handle(event.data);
    if (event.data.done) channel.port1.close();
  };
  worker.postMessage(type, [channel.port2]);
}
offline.disabled = true;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./offline.js').then(async () => {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active;
    ask(worker, 'status', result => {
      offline.disabled = result.saved;
      if (result.saved) {
        offline.textContent = 'Available offline';
        showOffline('This course and its Linux guest are saved on this device.');
      }
    });
    offline.onclick = async () => {
      offline.disabled = true;
      showOffline('Preparing the offline download…');
      try { await navigator.storage?.persist?.(); } catch { /* browser chooses */ }
      ask(worker, 'download', result => {
        showOffline(result.message);
        if (!result.done) return;
        offline.disabled = result.saved;
        if (result.saved) offline.textContent = 'Available offline';
      });
    };
  }).catch(() => showOffline('Offline downloads are unavailable in this browser.'));
} else {
  showOffline('Offline downloads require a browser with service workers.');
}
