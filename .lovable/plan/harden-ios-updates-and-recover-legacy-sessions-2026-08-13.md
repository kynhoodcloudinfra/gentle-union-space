# Harden iOS updates and recover legacy sessions

## Confirmed diagnosis

The live production domain is already serving the current deployment correctly:

- `/` returns `Cache-Control: no-cache, must-revalidate, max-age=0` and the current hashed JavaScript bundle.
- `/version.json` returns `Cache-Control: no-store`.
- `/sw.js` returns `Cache-Control: no-cache`, contains revision 3, and the deployed bundle contains the current stale-version guard.

The reported “Raaja Riddle / What’s the prize?” screen comes from a build that predates `useStaleBundleGuard` and service-worker registration. An iOS tab that is still executing that old JavaScript has no version poll, update listener, or worker that newer code can invoke. A server or new deployment cannot inject code into an already-loaded browser document, so that exact frozen tab cannot be remotely force-refreshed through application code. It must undergo one real navigation—closing/reopening the tab, reopening the link, or a manual refresh—before the current self-healing system can take control.

## Implementation plan

### 1. Replace competing reload mechanisms with one coordinated updater

Create a single update coordinator shared by the React guard and service worker:

- The service worker will announce an available update to clients instead of unconditionally navigating every tab during `activate`.
- The page guard will own the actual cache-busted navigation and maintain a per-version one-shot lock.
- Deduplicate simultaneous `version.json`, focus, pageshow, online, and worker-update events.
- Preserve the current URL parameters and hash while applying the temporary build marker.

This removes the current race between `client.navigate()` and `location.replace()` that can cause two overlapping reloads on iOS.

### 2. Move update protection ahead of React startup

Add a small, dependency-free bootstrap that runs before the application bundle mounts:

- Fetch the no-store build manifest immediately.
- Compare the deployed build with a build ID embedded in the document.
- Purge Cache Storage and update/unregister obsolete workers when mismatched.
- Navigate once to a cache-busted URL before loading the main React application.
- Continue into React normally when versions match or the device is offline.

The existing React hook remains a runtime/resume fallback, but future deployments no longer depend on React successfully mounting before update recovery begins.

### 3. Make the service worker update protocol deterministic

Revise `public/sw.js` to:

- Continue bypassing HTTP cache for document navigations.
- Purge old Cache Storage entries during activation.
- send a versioned `UPDATE_READY` message to controlled clients rather than independently reloading them.
- Accept an explicit `SKIP_WAITING`/update-check message from the page coordinator.
- Avoid automatic navigation loops across multiple tabs.

Bump the worker revision so currently controlled clients receive the new protocol.

### 4. Keep verified production cache policy as the transport layer

Retain and verify these deployment requirements after publishing:

- HTML: `no-cache, must-revalidate, max-age=0`
- Build manifest and service worker: `no-store` or `no-cache`
- Hashed `/assets/*`: long-lived `immutable`

Remove wording that treats HTML meta cache directives as the primary protection; the verified HTTP response headers are authoritative.

### 5. Add a practical one-time recovery path for pre-guard users

Because the legacy tab cannot be reached programmatically, provide a short recovery URL using a never-before-used query parameter, for example:

`https://how-to-name-it.kynhood.com/?refresh=20260813`

Opening that link performs the required new navigation and loads the current document. Share it once with affected iOS users and ask them to close the old in-app tab first. After that first load, the new bootstrap and worker protect subsequent releases automatically.

### 6. Verify real iOS lifecycle scenarios

Validate the implementation against:

- Fresh Safari navigation with no worker.
- Existing controlled tab across a simulated deployment/version change.
- Background and foreground return.
- bfcache `pageshow` restoration.
- Multiple open tabs receiving one update without loops.
- Offline return followed by reconnect.
- WhatsApp-style fresh link opening, where worker/session storage may be ephemeral.

Also confirm the temporary cache-buster is removed after startup, URL identity parameters remain intact, and only one navigation occurs per deployed build.

## Expected outcome

- Existing users who already have any guard-enabled build are moved to new deployments through one coordinated, cache-busted navigation.
- Future first loads detect mismatches before React starts.
- iOS resume, bfcache, online recovery, and multi-tab updates no longer race or loop.
- The small group still frozen on the pre-guard “Raaja Riddle” build receives a one-time recovery link; no web implementation can remotely execute a refresh inside those already-loaded legacy documents.
