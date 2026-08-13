const RELOAD_FLAG_PREFIX = "stale-bundle-reload:";
const CACHE_BUSTER = "_v";

let reloadInProgress = false;

export async function fetchServerVersion(): Promise<string | null> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("version" in payload)) return null;
    return typeof payload.version === "string" ? payload.version : null;
  } catch {
    return null;
  }
}

async function purgeOriginCaches() {
  try {
    if (!("caches" in window)) return;
    const names = await caches.keys();
    await Promise.allSettled(names.map((name) => caches.delete(name)));
  } catch {
    // A network-only reload remains the primary recovery path.
  }
}

export async function forceFreshBuild(serverVersion: string) {
  if (reloadInProgress) return;

  const url = new URL(window.location.href);
  if (url.searchParams.get(CACHE_BUSTER) === serverVersion) return;

  const flag = `${RELOAD_FLAG_PREFIX}${serverVersion}`;
  try {
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
  } catch {
    // The URL marker is the fallback loop guard when storage is unavailable.
  }

  reloadInProgress = true;
  await purgeOriginCaches();

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    await registration?.update();
  } catch {
    // Best effort; the unique navigation still bypasses stale HTML.
  }

  url.searchParams.set(CACHE_BUSTER, serverVersion);
  window.location.replace(url.toString());
}

export function stripBuildMarker() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(CACHE_BUSTER)) return;
    url.searchParams.delete(CACHE_BUSTER);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Cosmetic cleanup only.
  }
}

export async function runStartupVersionCheck() {
  const serverVersion = await fetchServerVersion();
  if (serverVersion && serverVersion !== __APP_BUILD_VERSION__) {
    await forceFreshBuild(serverVersion);
    return false;
  }
  stripBuildMarker();
  return true;
}

function serviceWorkersAllowed() {
  if (!import.meta.env.PROD || window.self !== window.top) return false;
  const hostname = window.location.hostname;
  return !(
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev") ||
    new URL(window.location.href).searchParams.get("sw") === "off"
  );
}

export async function registerUpdateWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (!serviceWorkersAllowed()) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((registration) => registration.active?.scriptURL.endsWith("/sw.js"))
        .map((registration) => registration.unregister()),
    );
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  } catch {
    // version.json remains the primary update channel.
  }
}