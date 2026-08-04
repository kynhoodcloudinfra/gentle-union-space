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
 */
export function useStaleBundleGuard() {
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (cancelled || document.hidden) return;
      if (await isStale()) {
        window.location.reload();
      }
    };

    // Check on load, whenever the tab regains focus, and periodically while open.
    check();
    document.addEventListener('visibilitychange', check);
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', check);
      clearInterval(interval);
    };
  }, []);
}
