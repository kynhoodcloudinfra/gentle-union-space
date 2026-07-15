## Goal

Add a new table in the cloud database that lists every player who has played at least one quiz on or after **June 1, 2026 (IST)**, along with their name, phone number, and the total points they've earned from that date onward.

Note on the trade-off: you picked "leaderboard (simpler)" as the source but "sum of points earned since Jun 1" as the score. Those don't match — `leaderboard.total_score` is cumulative across all time and isn't date-scoped. To honor the score choice, this plan computes points from `submissions` (the only date-stamped source), which is still simple because scoring is deterministic.

## New table: `public.players_since_jun1`

Columns:
- `phone_number` (primary key)
- `name` — latest known display_name / name
- `kyn_username` — for reference
- `points_since_jun1` — integer, sum of scoring-rule points from correct submissions on/after 2026-06-01 IST
- `quizzes_played` — count of submissions in that window
- `correct_count` — count of correct submissions in that window
- `first_played_at`, `last_played_at` — timestamps in the window
- `updated_at`

Scoring rule applied per correct submission (matching existing app rule):
- `time_taken_seconds ≤ 10` → 150
- `≤ 20` → 125
- otherwise → 100
- incorrect → 0

## How it stays fresh

A database function `refresh_players_since_jun1()` recomputes the whole table from `submissions` where `submitted_at >= '2026-06-01' AT TIME ZONE 'Asia/Kolkata'`. It's called by a trigger on `submissions` after insert, so the table stays in sync automatically. It can also be run manually anytime.

## Access

- RLS enabled, permissive read/insert/update (matches the rest of this project — no auth).
- Standard GRANTs to `anon`, `authenticated`, `service_role` so the Data API can reach it.

## Out of scope

- No admin UI for this table in this change (you asked for the table itself, in the cloud). If you later want a viewer/export tab in Admin, we can add that as a follow-up.
- No backfill of historical points before June 1 — by design.

## Technical details

```text
CREATE TABLE public.players_since_jun1 (
  phone_number text PRIMARY KEY,
  name text NOT NULL,
  kyn_username text,
  points_since_jun1 integer NOT NULL DEFAULT 0,
  quizzes_played integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  first_played_at timestamptz,
  last_played_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Function pseudocode:
```text
DELETE FROM players_since_jun1;
INSERT INTO players_since_jun1 (...)
SELECT
  phone_number,
  max(coalesce(display_name, name)),
  max(kyn_username),
  sum(CASE WHEN is_correct THEN
    CASE WHEN time_taken_seconds <= 10 THEN 150
         WHEN time_taken_seconds <= 20 THEN 125
         ELSE 100 END
    ELSE 0 END),
  count(*),
  count(*) FILTER (WHERE is_correct),
  min(submitted_at),
  max(submitted_at)
FROM submissions
WHERE submitted_at >= timestamp '2026-06-01 00:00' AT TIME ZONE 'Asia/Kolkata'
GROUP BY phone_number;
```

Trigger: `AFTER INSERT ON submissions FOR EACH STATEMENT EXECUTE FUNCTION refresh_players_since_jun1()`.
