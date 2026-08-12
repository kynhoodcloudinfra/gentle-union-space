import { useEffect } from 'react';

const CHECK_INTERVAL_MS = 60 * 1000;
const RELOAD_FLAG_PREFIX = 'stale-bundle-reload:';

async function fetchServerVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { version } = await res.json();
    return typeof version === 'string' ? version : null;
  } catch {
    // Network hiccup or offline — don't reload on a guess.
    return null;
  }
}

async function purgeCaches() {
  try {
    if (!('caches' in window)) return;
    const names = await caches.keys();
    await Promise.allSettled(names.map((n) => caches.delete(n)));
  } catch {
    // Best effort.
  }
}

/**
 * A plain location.reload() is not enough on iOS/WebKit — it can be served
 * the very same cached index.html, which re-loads the identical stale bundle
 * (potentially forever). Navigating to a URL the browser has never seen
 * (?_v=<serverVersion>) forces a real network fetch of the HTML document.
 * The marker is stripped from the address bar once the fresh bundle boots.
 */
async function forceFreshLoad(serverVersion: string) {
  const flag = `${RELOAD_FLAG_PREFIX}${serverVersion}`;
  try {
    // One-shot per server version: a genuinely broken deploy must not put
    // clients into an endless reload loop.
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, '1');
  } catch {
    // Private mode / storage blocked — proceed anyway, the ?_v marker in the
    // URL still prevents an immediate second pass for the same version.
    if (new URL(window.location.href).searchParams.get('_v') === serverVersion) return;
  }

  await purgeCaches();
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
  } catch {
    // Best effort.
  }

  const url = new URL(window.location.href);
  url.searchParams.set('_v', serverVersion);
  window.location.replace(url.toString());
}

function stripCacheBuster() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('_v')) return;
    url.searchParams.delete('_v');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch {
    // Ignore.
  }
}

/**
 * Some users end up stuck on a stale cached JS bundle indefinitely (browser
 * or intermediary HTTP cache holding an old index.html/bundle pair), so
 * server-side redeploys never reach them. This polls a small no-store
 * version.json against the version baked into the currently running bundle,
 * and force-navigates to a cache-busted URL the moment they diverge.
 * Also nudges the browser to check public/sw.js for an update on the same
 * cadence — browsers only do this roughly once every 24h on their own.
 *
 * iOS Safari in particular tends to restore an already-open tab from its
 * back-forward cache (bfcache) — a frozen in-memory snapshot — instead of
 * doing a real reload when the app is backgrounded/switched away from and
 * returned to. That bypasses the network entirely, so it skips HTTP
 * headers, this hook's own setInterval (paused while frozen), and even a
 * registered service worker's update check. visibilitychange is documented
 * as unreliable for catching this specific case on iOS; the correct signal
 * is the pageshow event's persisted flag, which fires exactly when a page
 * is restored from bfcache rather than freshly loaded.
 */
export function useStaleBundleGuard() {
  useEffect(() => {
    let cancelled = false;

    stripCacheBuster();

    const check = async () => {
      if (cancelled || document.hidden) return;
      const serverVersion = await fetchServerVersion();
      if (cancelled) return;
      if (serverVersion && serverVersion !== __APP_BUILD_VERSION__) {
        await forceFreshLoad(serverVersion);
        return;
      }
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        await reg?.update();
      } catch {
        // Best-effort — the version.json check above is the real guard.
      }
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) check();
    };

    // Check on load, whenever the tab regains focus or the window is focused,
    // whenever the page is restored from bfcache, when connectivity returns,
    // and periodically while open.
    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      clearInterval(interval);
    };
  }, []);
}
