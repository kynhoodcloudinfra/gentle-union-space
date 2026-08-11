import { useEffect } from 'react';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function isStale(): Promise<boolean> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const { version } = await res.json();
    return typeof version === 'string' && version !== __APP_BUILD_VERSION__;
  } catch {
    // Network hiccup or offline — don't reload on a guess.
    return false;
  }
}

/**
 * Some users end up stuck on a stale cached JS bundle indefinitely (browser
 * or intermediary HTTP cache holding an old index.html/bundle pair), so
 * server-side redeploys never reach them. This polls a small no-store
 * version.json against the version baked into the currently running bundle,
 * and force-reloads once — bypassing the cache — the moment they diverge.
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

    const check = async () => {
      if (cancelled || document.hidden) return;
      if (await isStale()) {
        window.location.reload();
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

    // Check on load, whenever the tab regains focus, whenever the page is
    // restored from bfcache, and periodically while open.
    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', onPageShow);
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('pageshow', onPageShow);
      clearInterval(interval);
    };
  }, []);
}
