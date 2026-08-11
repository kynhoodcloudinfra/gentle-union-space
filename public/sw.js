// Deliberately caches nothing. Its only job: the moment a browser discovers
// a newer copy of this file (which forces a new install/activate cycle),
// take over every open tab immediately and reload them — so a deploy
// reaches already-open sessions instead of leaving them stuck running
// whatever JS they loaded with. Bump SW_REVISION on meaningful changes to
// this file so browsers see it as "new" and re-run the cycle.
const SW_REVISION = 1;

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
