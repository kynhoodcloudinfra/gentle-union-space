## Goal

Add a date-wise analytics section to the Admin → Analytics tab showing one row per IST date since the first submission, plus a downloadable Excel with the same data.

## What the user sees

In `src/components/admin/AnalyticsTab.tsx`, below the existing single-day metrics/tables, add a new "All Dates" section:

- Heading with a "Download Excel (All Dates)" button.
- Scrollable table, one row per IST calendar date (newest first), columns:
  - Date (IST, YYYY-MM-DD)
  - Played
  - New users (first-ever submission that date)
  - Active streak count (players who played that date with streak ≥ 2 as of that date — see technical note)
  - Retained (played D-1 AND D)
  - Retention % (retained / played D-1)
  - Didn't come back (players with any prior submission who didn't play that date)

Excel export writes a single `Daily Summary` sheet with the same columns and filename `paattu-analytics-all-dates-<today>.xlsx`.

## Technical notes

New helper in `src/lib/analytics.ts`:

- `getAllDatesAnalytics(): Promise<DailySummary[]>` — pages through all `submissions` once (reuses existing `fetchAllSubmissions`), buckets `submitted_at` into IST calendar dates, then per date computes: played set, new-users set (first-seen date == that date), retained set (intersection with prior date's played set), didn't-come-back count (players with first-seen < date and not in played set).
- Active-streak-per-date is derived by walking each player's sorted list of distinct IST play-dates and computing the running streak ending on that date; count of players whose streak ≥ 2 on that date.
- Single pass over submissions → O(N) memory; safe for current volume.

New helper in `src/lib/analyticsExport.ts`:

- `downloadAllDatesExcel(rows: DailySummary[])` — one sheet, same columns as the on-screen table.

`AnalyticsTab.tsx` gains state for the all-dates rows, loads them alongside the daily view (same 30s refresh), and renders the table + download button. No schema, RLS, or backend changes.

## Out of scope

- Per-date player lists (user chose summary-only).
- Date range picker (all-time only).
