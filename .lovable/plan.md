## 1. Riddle timer → 60s (verify)

The code already passes `duration={60}` to `FilmStripTimer` in `QuizModal.tsx`, and `FilmStripTimer` resets `timeLeft` whenever `duration` changes. If the preview still shows 30s, it's stale cache. Action:
- Hard-reload preview to confirm.
- As a safety net, also set the initial `useState(duration)` to always re-init on modal open by keying the timer on `question.id` in `QuizModal` so it remounts fresh each new question.

## 2. Profile page → username = kyn username

Currently `ProfileSheet` shows the editable-looking "Display name" row plus a separate "Username" row. Change:
- Make `@kynUsername` the primary identity under the avatar (large), and show `displayName` smaller/secondary (or remove it from the detail rows).
- In the detail rows, keep only one row labeled **Kyn Username** with the value `@{kynUsername}`. Remove the "Display name" row to avoid confusion.
- Header greeting on home stays as `displayName` (unchanged) since that's the friendly hello.

> If you actually meant something different (e.g. replace `displayName` everywhere with `kynUsername`), tell me and I'll adjust.

## 3. Homepage → "What's the prize?" section

Add a new card between the Play CTA and the Leaderboard heading in `src/pages/Index.tsx`:

- Title: **What's the prize?**
- Body: "Play and earn points to unlock an exclusive prize. The prize will be revealed soon — stay tuned."
- Styled with the existing cinematic card aesthetic (gold border, film-grain, gift/sparkle icon, gold-glow heading). No CTA button, purely informational.

## 4. Result popup → show question + answers

In `QuizModal.tsx`, the result view currently shows only emoji + Correct/Wrong + (for wrong) the correct answer. Expand it to always show:

- The **question text** (and image if present, smaller thumbnail).
- The **correct answer** (resolved to option letter + option text for MCQ).
- The **user's answer** (option letter + text for MCQ; raw text for text questions; "(timed out)" if expired) — highlighted green if correct, red if wrong.

Implementation notes:
- Persist `question`, `userAnswer`, and (for existing submissions loaded on open) the joined `questions.*` fields into `ResultData` so the result view has everything it needs.
- Update the "already answered" branch in `loadQuestion` to also fetch `option_a..d`, `question_text`, `image_url`, `question_type` via the existing join.

## 5. Question expiry → expire at local midnight, not 24h later

Currently `rotate_active_question()` sets `expires_at = now() + interval '24 hours'`. Change so a question activated at, e.g., 3pm on May 20 expires at midnight at the end of that same calendar day, then rotation immediately picks the next pool question on the next call.

DB migration — update `rotate_active_question`:
```sql
-- expires_at = end of current day in IST (Asia/Kolkata)
expires_at = (date_trunc('day', (v_now AT TIME ZONE 'Asia/Kolkata')) 
              + interval '1 day') AT TIME ZONE 'Asia/Kolkata'
```
(Same change applied to the newly-activated question's `expires_at`.)

Confirm timezone — I'll use **Asia/Kolkata** since this is a fan-club app aimed at IST users. Tell me if you want a different zone (e.g. server UTC midnight).

Frontend impact: none. The existing rotation RPC + realtime subscription on `questions` already handles auto-rotation when a user opens the quiz after midnight. The "Today's Riddle Done" card will naturally reset because `checkPlayedToday` looks up the now-newly-active question.

---

### Files touched

- `src/components/QuizModal.tsx` — result view content; key timer on question id; expand ResultData.
- `src/components/ProfileSheet.tsx` — collapse identity rows, make kyn username primary.
- `src/pages/Index.tsx` — add "What's the prize?" card.
- DB migration — replace `rotate_active_question` body with midnight-IST expiry.
