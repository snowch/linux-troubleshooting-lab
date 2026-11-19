const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = 'linux-course:' + self.registration.scope + ':' + VERSION;
const COMPLETE = new URL('__offline_complete__', self.registration.scope).href;
let downloading;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function complete(cache) {
  if (!await cache.match(COMPLETE)) return false;
  const keys = new Set((await cache.keys()).map(request => request.url));
  return FILES.every(path => keys.has(new URL(path, self.registration.scope).href));
}

async function download() {
  const cache = await caches.open(CACHE);
  await cache.delete(COMPLETE);
  for (const path of FILES) {
    const url = new URL(path, self.registration.scope);
    if (await cache.match(url)) continue;
    const result = await fetch(url, { cache: 'reload' });
    if (!result.ok) throw Error('Could not download ' + path);
    await cache.put(url, result);
  }
  await cache.put(COMPLETE, new Response(VERSION));
  for (const key of await caches.keys())
    if (key.startsWith('linux-course:' + self.registration.scope + ':') && key !== CACHE)
      await caches.delete(key);
}

self.addEventListener('message', event => {
  const port = event.ports[0];
  if (!port || !['status', 'download'].includes(event.data)) return;
  event.waitUntil((async () => {
    try {
      if (event.data === 'download') {
        port.postMessage({ message: 'Downloading the course and Linux guest. Keep this page open.' });
        downloading ??= download().finally(() => { downloading = undefined; });
        await downloading;
      }
      const saved = await complete(await caches.open(CACHE));
      port.postMessage({ done: true, saved, message: saved ? 'This course and its Linux guest are saved on this device.' : '' });
    } catch (error) {
      port.postMessage({ done: true, saved: false, message: error.message + '. You can retry the download.' });
    }
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  const relative = url.href.slice(self.registration.scope.length);
  const path = request.mode === 'navigate' && ['', 'index.html'].includes(url.pathname.slice(new URL(self.registration.scope).pathname.length))
    ? 'index.html' : relative;
  if (!FILES.includes(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (await cache.match(COMPLETE)) {
      const saved = await cache.match(new URL(path, self.registration.scope));
      if (saved) return saved;
    }
    try {
      return await fetch(request);
    } catch (error) {
      // A downloaded previous release remains usable while the replacement is incomplete.
      for (const key of (await caches.keys()).reverse()) {
        if (!key.startsWith('linux-course:' + self.registration.scope + ':') || key === CACHE) continue;
        const previous = await caches.open(key);
        if (!await previous.match(COMPLETE)) continue;
        const fallback = await previous.match(new URL(path, self.registration.scope));
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
