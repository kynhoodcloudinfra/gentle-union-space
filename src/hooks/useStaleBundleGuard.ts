import { useEffect } from 'react';
import {
  fetchServerVersion,
  forceFreshBuild,
  stripCurrentBuildMarker,
} from '@/lib/updateCoordinator';

const CHECK_INTERVAL_MS = 60 * 1000;

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

    stripCurrentBuildMarker();
    let checkInProgress = false;

    const check = async () => {
      if (cancelled || document.hidden || checkInProgress) return;
      checkInProgress = true;
      const serverVersion = await fetchServerVersion();
      if (cancelled) {
        checkInProgress = false;
        return;
      }
      if (serverVersion && serverVersion !== __APP_BUILD_VERSION__) {
        await forceFreshBuild(serverVersion);
        checkInProgress = false;
        return;
      }
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        await reg?.update();
      } catch {
        // Best-effort — the version.json check above is the real guard.
      }
      checkInProgress = false;
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) check();
    };
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_READY') check();
    };

    // Check on load, whenever the tab regains focus or the window is focused,
    // whenever the page is restored from bfcache, when connectivity returns,
    // and periodically while open.
    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    navigator.serviceWorker?.addEventListener('message', onWorkerMessage);
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      navigator.serviceWorker?.removeEventListener('message', onWorkerMessage);
      clearInterval(interval);
    };
  }, []);
}
