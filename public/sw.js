// Deliberately caches nothing via the Cache API. Three jobs:
//  1. Announce an update to open clients without racing the page's own
//     versioned, loop-protected navigation.
//  2. Purge any Cache Storage buckets left behind on this origin, so no
//     stale HTML/JS can be re-served from them.
//  3. For every real navigation, force the network layer to bypass the
//     browser's own HTTP disk cache (cache: 'reload') instead of trusting
//     Cache-Control alone — iOS/WebKit has documented history of reusing a
//     cached HTML response on navigation even when told not to.
// Bump SW_REVISION on meaningful changes to this file so browsers see it as
// "new" and re-run the install/activate cycle.
const SW_REVISION = 4;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.map((name) => caches.delete(name)));
      } catch {
        // Best effort — navigation bypass below is the real guard.
      }
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'UPDATE_READY', revision: SW_REVISION });
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === 'CHECK_UPDATE') {
    event.waitUntil(self.registration.update());
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // only top-level page loads
  event.respondWith(
    fetch(event.request, { cache: 'reload' }).catch(() => fetch(event.request))
  );
});
