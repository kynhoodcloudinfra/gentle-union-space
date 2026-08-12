# Force stale iOS sessions onto the latest version

Some iOS users still see an old build (old "Raaja Riddle" home screen with the "What's the prize?" card). The app already has a version guard and a service worker, but on iOS a few gaps let an old session survive.

## What's happening

1. When the guard detects a version mismatch it calls a plain `window.location.reload()`. On iOS/WebKit that reload can still be served the cached `index.html`, so the same old bundle loads again — potentially in a loop that never updates.
2. The service worker only bypasses the HTTP cache for navigations. Users whose tab was opened before the worker was installed, or who never got an update check, keep running the old JS.
3. The version check runs at most every 5 minutes and on visibility/bfcache restore; a user who keeps the app open in an in-app browser (WhatsApp) may sit on stale JS in between.

## The fix

**1. Cache-busting reload instead of plain reload**
When a version mismatch is detected, navigate to the current URL with a fresh `?_v=<serverVersion>` cache-buster (then strip it from the address bar after load) so the browser must fetch a new `index.html`. Guard with a one-shot session flag so a genuinely broken deploy can't cause an infinite reload loop.

**2. Purge caches and unregister stale workers before reloading**
Before the reload, delete every Cache Storage bucket owned by this origin's app worker and force `registration.update()`, so nothing stale can be re-served.

**3. Bump the service worker revision and make it self-heal**
Bump `SW_REVISION` in `public/sw.js` so every returning browser sees a byte-different worker and re-runs install/activate — which already claims clients and re-navigates open tabs. Add cache purging to its `activate` step.

**4. Tighten the detection cadence**
Check on every `visibilitychange` to visible (already), on `pageshow` (already), on `focus`, on `online`, and shorten the interval from 5 minutes to 60 seconds. The request is a few hundred bytes, so this is cheap.

**5. Verify what the live site actually serves**
Fetch the published URL fresh (no cache) and confirm the served HTML references the current bundle hash and current `version.json`, so we know the problem is client-side caching and not a stale deploy artifact.

## Technical details

- `src/hooks/useStaleBundleGuard.ts` — replace `window.location.reload()` with a cache-busting `location.replace(url + ?_v=)`, add cache purge, add `focus`/`online` listeners, `CHECK_INTERVAL_MS` 5 min to 60 s, add a `sessionStorage` loop guard.
- `public/sw.js` — bump `SW_REVISION` to 3, delete origin caches in `activate` before claiming/navigating clients.
- `src/main.tsx` — registration stays as-is (`updateViaCache: 'none'`).
- No backend, data, or UI changes.

## What users will see

An iOS user on an old build gets pulled onto the current version within about a minute of opening or returning to the app, without needing to clear Safari data. Users already on the latest version notice nothing.
