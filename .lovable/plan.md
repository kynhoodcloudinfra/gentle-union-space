
# Fix scoring + leaderboard visibility

## Root causes (both confirmed against live data)

**A. Leaderboard has duplicate rows per user (1,121 rows for 602 distinct phones).**
- `UserContext.setDisplayName` / `setKynUsername` insert a row with **no `month`** (defaults to `''`) on signup.
- `QuizModal.submitAnswer` later inserts/updates by `(phone_number, month=YYYY-MM)`, creating a **second** row per month.
- Result: every returning user has an empty-month row + one row per month they played. 602 empty-month rows exist.

**B. Home leaderboard silently truncates at PostgREST's default 1000-row limit.**
- `Index.tsx` and `LeaderboardTab.tsx` do `.from('leaderboard').select(...)` with no `.range()` or `.limit()`.
- With 1,121 rows the last ~121 rows are dropped. Users whose only surviving row lands beyond row 1000 disappear from the board — this is why **8939951237** (and others like them) don't show up even though they scored 450.

**C. Historical scores don't match current scoring rules.**
- 40+ users have `leaderboard.total_score` off by ±50/±75 from what current rules would award. Scoring tiers changed at some point (e.g. MCQ ≤10s went 100 → 150), but old rows kept the old score. Some rows also carry stray +50 from an earlier bonus that no longer exists.

## Fix (one migration + small code changes)

### 1. Data migration (one-shot, via `supabase--migration`)
Runs inside a single transaction so the board is never in a half-fixed state.

```text
a. Recompute every user's score from `submissions` using the current rules:
     MCQ  correct: ≤10s→150, ≤20s→100, else 50
     TEXT correct: ≤20s→150, ≤40s→125, else 100
   Grouped by (phone_number, month).

b. Recompute streak from the distinct set of submission dates
   (IST day, consecutive days ending at max date).

c. DELETE FROM leaderboard;  -- wipe duplicates + empty-month rows

d. Re-INSERT one row per (phone_number, month) with:
     total_score, streak, last_played_date, name, display_name,
     kyn_username, avatar_id, profile_image_url
   (profile fields taken from the most recent prior row per phone).

e. Add UNIQUE(phone_number, month) so duplicates can never come back.
   Also backfill month='<current>' on any row created via signup
   (there won't be any after step c, but the constraint enforces it going forward).
```

Users with correct submissions but no leaderboard entry (edge case) get created here; users with 0 correct answers get a zero row so their profile stays intact.

### 2. Stop creating empty-month rows (code)
In `src/contexts/UserContext.tsx`, the two `leaderboard.insert(...)` calls in `setDisplayName` and `setKynUsername` add `month: getCurrentMonth()`. Import `getCurrentMonth` from `@/lib/supabase`. No other behavior changes.

### 3. Fix leaderboard truncation (code)
`Index.tsx` `loadData()` and `admin/LeaderboardTab.tsx` fetch: add an explicit page loop (`.range(0,999)` then `.range(1000,1999)` until empty) so all rows are returned regardless of table size. Client-side aggregation by `phone_number` stays as-is, so the "sum across months" behavior for total score is preserved.

### 4. Leave `QuizModal.submitAnswer` scoring formula untouched
It already matches the recomputation rules. Once step 1 aligns history and step 2 blocks new empty-month rows, every future submission stays consistent.

## What the user will see afterwards
- `8939951237` (and every similar user) appears on the leaderboard at their true rank.
- Every player's total matches the sum of what their correct submissions are worth today.
- No more duplicate/empty-month rows; the DB constraint blocks regressions.

## Files touched
- **New migration** — recompute + dedupe + unique constraint (needs your approval before it runs)
- `src/contexts/UserContext.tsx` — add `month` on signup inserts
- `src/pages/Index.tsx` — paginated leaderboard fetch
- `src/components/admin/LeaderboardTab.tsx` — paginated leaderboard fetch

## Credit estimate
Small: **~4–6 credits total** (1 migration approval + 3 file edits + a verification query). No edge functions, no new dependencies.
