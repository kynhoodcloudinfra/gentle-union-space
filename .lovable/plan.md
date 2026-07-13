## 1. Fix "Read aloud" — `NotSupportedError: no supported source`

**Root cause:** `supabase.functions.invoke` inspects the response `Content-Type`; for `audio/mpeg` the current SDK returns the payload as **text/JSON-decoded**, so wrapping it in `new Blob([data], { type: 'audio/mpeg' })` produces bytes that are no longer a valid MP3 → `<audio>` throws `NotSupportedError`. The edge function itself returns valid MP3 (confirmed via curl).

**Fix in `src/components/ReadAloudButton.tsx`:** stop using `supabase.functions.invoke` for this binary endpoint. Call the function URL directly with `fetch` and read `response.blob()` so the raw MP3 bytes reach `<audio>` intact.

- Build URL from `import.meta.env.VITE_SUPABASE_URL` + `/functions/v1/tts-question`.
- Send `Authorization: Bearer <VITE_SUPABASE_PUBLISHABLE_KEY>` and `apikey` headers.
- Check `response.ok`; on failure, surface `response.text()` in the toast.
- Keep the per-question blob-URL cache and idle/loading/playing state machine unchanged.

## 2. Pause timer when the question isn't visible; resume on reopen

Applies to **all** question types and every user. The countdown must not tick while the quiz modal is closed or the tab is hidden.

**Edits in `src/components/QuizModal.tsx`:**
- Replace the single `startTime` number with a `remainingSeconds` state (initialised to 45 when a fresh question loads).
- Drive `FilmStripTimer` with `duration={remainingSeconds}` and `isRunning={open && !document.hidden && !result && !!question}`.
- On every tick from the timer, mirror the current remaining seconds back into state so closing/reopening resumes from that exact value.
- Compute `time_taken_seconds` submitted to the DB as `45 - remainingSeconds` (rounded to 0.1s) instead of `(Date.now() - startTime)/1000`, so pausing doesn't inflate the elapsed time and the existing score tiers stay accurate.
- Listen to `document.visibilitychange` and force a re-render so the `isRunning` prop flips when the tab is backgrounded/foregrounded.

**Edits in `src/components/FilmStripTimer.tsx`:**
- Accept an optional `onTick?: (secondsLeft: number) => void` and call it each second so the parent can persist `remainingSeconds`.
- Guard the `setTimeout` with `isRunning` (already partly done) and clear the timeout when `isRunning` flips to false so no stray tick fires while paused.
- Do **not** reset `timeLeft` to `duration` on every `duration` change — only when a *new question id* mounts. The parent already remounts the timer via `key={question.id}`, so keep the reset effect but make it a no-op when the incoming `duration` matches the current `timeLeft` (prevents the reopen from snapping back to 45).

**How reopen works:** `Index.tsx` opens the modal via the "Today's Puzzle" card; when `open` flips true, `isRunning` becomes true and the timer resumes from the saved `remainingSeconds`. No extra plumbing needed on the Index page.

**Timeout still fires correctly:** when `remainingSeconds` reaches 0, `FilmStripTimer` calls `onExpire`, which still routes to `submitAnswer('(timed out)')`.

## 3. Files touched

- `src/components/ReadAloudButton.tsx` — swap `supabase.functions.invoke` for direct `fetch` + `response.blob()`.
- `src/components/QuizModal.tsx` — `remainingSeconds` state, visibility-aware `isRunning`, elapsed-time computed from remaining.
- `src/components/FilmStripTimer.tsx` — `onTick` callback, only reset on genuine duration change, clear timeout when paused.

No DB, edge function, or scoring-tier changes.
