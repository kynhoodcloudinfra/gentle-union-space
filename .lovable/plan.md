## Root cause

Reproduced by POSTing a submission as `anon` against the REST API:

```
HTTP/2 400
proxy-status: PostgREST; error=21000
{"code":"21000","message":"DELETE requires a WHERE clause"}
```

Since day 46 (2026-07-15) there are **zero** rows in `submissions` even though questions 47, 48, 49 have been live. The failure chain:

1. Client (`QuizModal.submitAnswer`) inserts into `public.submissions`.
2. `trg_refresh_players_since_jun1` (AFTER INSERT) calls `public.rebuild_players_since_jun1()`.
3. That function's first statement is `DELETE FROM public.players_since_jun1;` — no WHERE clause.
4. Supabase's API-side safeguard aborts the whole transaction with SQLSTATE `21000`.
5. The INSERT is rolled back. The client code doesn't inspect the error, so the UI shows "Correct!" / result screen using values it computed locally, but nothing is persisted and the leaderboard trigger never runs.

That is why 8220850225 (and everyone else) is stuck at their pre-July-15 totals no matter how many correct answers they submit afterwards.

## Fix

Rewrite `public.rebuild_players_since_jun1()` so it no longer issues an unqualified DELETE. Use `TRUNCATE public.players_since_jun1` (allowed inside a SECURITY DEFINER function and not blocked by the safeguard), then reinsert as today.

Also harden the client so this class of silent failure surfaces next time:

- In `QuizModal.submitAnswer`, capture the `error` from the `submissions` insert and, if present, show a toast and abort instead of rendering a fake result screen.

## Backfill

After the trigger is fixed, no historical replay is needed for missing scores — users can just play the next active question and the leaderboard will update. Days 47/48/49 are already past; those attempts weren't recorded anywhere, so they can't be reconstructed. Call this out in the reply to the user.

## Verification

1. After the migration, `curl` an insert as anon against `/rest/v1/submissions` → expect 201, row visible in the table.
2. Confirm `leaderboard.total_score` for the test row's phone jumps by the trigger-computed amount.
3. Delete the test row.

## Files touched

- Migration: replace body of `public.rebuild_players_since_jun1()`.
- `src/components/QuizModal.tsx`: check and surface the insert error.

## Estimated credits

Small — one migration + one file edit + verification curl. ~1 credit block.
