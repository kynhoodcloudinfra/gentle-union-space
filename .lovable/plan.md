
## Root cause

`ravimkm` (phone `9043562641`) has **2,500 points, 0 submissions**:

```
leaderboard: total_score=2500, streak=1, month=2026-07, last_played=2026-07-15
submissions: 0 rows
```

The leaderboard table has fully permissive RLS:

- `Anyone can insert leaderboard` (INSERT, check `true`)
- `Anyone can update leaderboard` (UPDATE, using `true`)

And the client writes scores directly (`QuizModal.tsx`, `UserContext.tsx`, `Index.tsx` — 10+ call sites). Anyone with the public anon key can open devtools / curl and PATCH any leaderboard row to any `total_score` without ever submitting an answer. No trigger validates that `total_score` matches actual submissions. That is what happened here — the score was written straight to the row, bypassing the quiz flow entirely.

The `submissions` table is safe by comparison (INSERT-only, no UPDATE/DELETE), so it is the trustworthy source of truth.

## Fix

Move scoring server-side and stop trusting client writes to `leaderboard`.

### 1. Clean up the tampered row

Reset `ravimkm` to the score derived from his actual submissions (0 pts, since he has none). Do it as a single UPDATE inside the migration.

### 2. Derive leaderboard from submissions via trigger

New security-definer function `public.recompute_leaderboard_for(phone text)`:
- Aggregates that user's `submissions` grouped by `month` (YYYY-MM in IST).
- For each month row, computes `total_score` using the existing rule (150 / 125 / 100 based on `time_taken_seconds`, 0 if incorrect) and `streak` from consecutive IST days ending at the latest `last_played_date`.
- UPSERTs the matching `(phone_number, month)` leaderboard row. Never writes an arbitrary caller-supplied score.
- Preserves identity fields (`name`, `display_name`, `kyn_username`, `avatar_id`, `profile_image_url`) — takes them from the latest submission, or leaves existing values if a row already exists.

Add `AFTER INSERT ON submissions` trigger that calls `recompute_leaderboard_for(NEW.phone_number)`. This makes the leaderboard a projection of `submissions`; it cannot drift.

Also add a one-shot `recompute_leaderboard_all()` and run it once inside the migration to correct any other tampered rows.

### 3. Lock down direct leaderboard writes

Replace the permissive policies:

- Drop `Anyone can insert leaderboard` and `Anyone can update leaderboard`.
- Keep `Anyone can read leaderboard` (public leaderboard UI needs it).
- Revoke `INSERT, UPDATE, DELETE` from `anon` and `authenticated`; keep `SELECT`. Keep `ALL` for `service_role` so the trigger (SECURITY DEFINER) and admin tools still work.

Identity-only fields users legitimately change (avatar, display_name, kyn_username, profile_image_url) need a narrow path:

- New security-definer function `public.update_leaderboard_identity(p_phone text, p_display_name text, p_kyn_username text, p_avatar_id int, p_profile_image_url text)` — updates only those columns across all month rows for that phone. Never touches `total_score` / `streak` / `last_played_date`.
- Grant EXECUTE to `anon, authenticated`.

### 4. Update client code

- Replace every client `leaderboard.update({ total_score, streak, ... })` / `leaderboard.insert(...)` in `QuizModal.tsx`, `UserContext.tsx`, `Index.tsx` with either:
  - nothing (score updates now happen automatically via the submissions trigger), or
  - a call to `update_leaderboard_identity` RPC for avatar / display name / kyn_username changes.
- Keep the existing `submissions.insert(...)` — that is now the sole way to earn points.
- Admin `LeaderboardTab` is read-only already; no change.

### 5. Verify

- Migration re-runs `recompute_leaderboard_all()`; `ravimkm` returns to 0.
- Manual check via psql: try `UPDATE leaderboard SET total_score = 9999 WHERE phone_number = '...'` as anon (should fail).
- Play through a quiz in the preview, confirm score appears on the leaderboard (via the trigger, not a client write).
- Confirm avatar / display name change still works through the new RPC.

## Out of scope

- Rate-limiting submissions (a separate concern — currently anyone can spam correct answers if they know them; that's a different fix).
- Auth / login (project intentionally has none per memory).
- Backfilling `players_since_jun1` beyond what its existing trigger already handles (its `rebuild` function reads from `submissions`, so it self-corrects on next insert).

## Technical notes

- Functions use `SECURITY DEFINER SET search_path = public` per project convention.
- Scoring rule mirrors `rebuild_players_since_jun1` exactly (150 ≤10s, 125 ≤20s, else 100).
- Streak logic: consecutive IST calendar days with at least one submission ending at max submission date; reset to 1 if latest gap > 1 day.
- Migration order: create functions → create trigger → drop old policies → revoke grants → run recompute → done.
