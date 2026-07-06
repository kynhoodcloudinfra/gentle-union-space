## Admin Analytics Tab

Add a new **Analytics** tab in the admin panel (`src/pages/Admin.tsx`) that shows daily engagement metrics for a chosen date, auto-refreshes every 30 seconds, and exports the full breakdown as an Excel file. Every player row includes display name, `kyn_username`, and phone number.

### Metrics (for the selected date `D`)

1. **Players played today** — distinct `phone_number` in `submissions` where `submitted_at::date = D`.
2. **New to the link** — players whose *first-ever* submission date equals `D`.
3. **Existing users with active streak** — players who played on `D` AND their `leaderboard.streak >= 2`.
4. **Retention rate** — % of players who submitted on `D-1` and also submitted on `D`. Show numerator/denominator too.
5. **Didn't come back** — players who submitted on any date before `D` but not on `D` (all-time inactive-today list).

### UI (`src/components/admin/AnalyticsTab.tsx`, new file)

- Date picker (shadcn Calendar in Popover, `pointer-events-auto`), defaults to today (Asia/Kolkata).
- 5 metric cards showing the count for each category, styled to match existing admin cards (gold accent, `font-serif`, `film-grain`, `OrnamentalDivider`).
- Below the cards: a tabbed list (or accordion) with one section per metric, showing the player table — columns: **Display Name / Name**, **@kyn_username**, **Phone Number**, plus streak/score where relevant. Reuses `AvatarDisplay` like `LeaderboardTab`.
- "Download Excel" button (top right) → exports one `.xlsx` with a **Summary** sheet + one sheet per metric.
- Auto-refresh: `setInterval` every 30 s to re-run the fetch; a small "Updated HH:MM:SS" label. Also refresh on date change and on manual refresh button.

### Data fetching (client-side, no new tables/functions needed)

All computed in the browser from existing tables (permissive RLS already allows reads):

- `submissions` filtered by `submitted_at` range for `D` and `D-1`, plus a single query for *all* submissions grouped by phone to compute first-seen date and all-time player set (paginated with `.range()` if > 1000).
- `leaderboard` for name/username/avatar/streak/score joins on `phone_number`.

Helper `src/lib/analytics.ts` exposing:
- `getDailyAnalytics(date: Date): Promise<AnalyticsResult>` returning the 5 buckets with full player rows.

### Excel export (`src/lib/analyticsExport.ts`, new file)

- Uses `xlsx` (SheetJS). Install via `bun add xlsx`.
- Builds workbook:
  - **Summary** — metric name, count, and (for retention) rate.
  - **Played Today**, **New Users**, **Active Streak**, **Retained (D-1 → D)**, **Didn't Come Back** — each with columns: Display Name, Username, Phone Number, Streak, Total Score, Last Played.
- Filename: `paattu-analytics-YYYY-MM-DD.xlsx`, triggered via `XLSX.writeFile`.

### Wiring

- `src/pages/Admin.tsx`: change `TabsList` to `grid-cols-3`, add `<TabsTrigger value="analytics">Analytics</TabsTrigger>` and matching `<TabsContent>` rendering `<AnalyticsTab />`.

### Notes / edge cases

- "Today" uses Asia/Kolkata day boundary (consistent with `rotate_active_question`). Compute local Y-M-D then filter with `submitted_at >= startOfDayIST && < endOfDayIST`.
- Retention denominator = 0 → display `—` instead of NaN%.
- No schema changes, no edge functions, no new secrets.
