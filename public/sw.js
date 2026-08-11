// Deliberately caches nothing via the Cache API. Two jobs:
//  1. The moment a browser discovers a newer copy of this file (forcing a
//     new install/activate cycle), take over every open tab immediately
//     and reload them — so a deploy reaches already-open sessions instead
//     of leaving them stuck running whatever JS they loaded with.
//  2. For every real navigation, force the network layer to bypass the
//     browser's own HTTP disk cache (cache: 'reload') instead of trusting
//     Cache-Control alone — iOS/WebKit has documented history of reusing a
//     cached HTML response on navigation even when told not to.
// Bump SW_REVISION on meaningful changes to this file so browsers see it as
// "new" and re-run the install/activate cycle.
const SW_REVISION = 2;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if ('navigate' in client) client.navigate(client.url);
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // only top-level page loads
  event.respondWith(
    fetch(event.request, { cache: 'reload' }).catch(() => fetch(event.request))
  );
});
