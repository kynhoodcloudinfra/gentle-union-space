## Plan

1. **Quiz popup image** — In `QuizModal.loadQuestion`, re-fetch the full row from `questions` by id after `rotate_active_question` so `image_url` is always present. Keep `object-contain` rendering.

2. **Timer = 60s** — Keep `FilmStripTimer duration={60}`. Update homepage CTA copy in `Index.tsx` from "30 seconds" → "60 seconds".

3. **Beige scrollbars app-wide** — In `index.css`, set `::-webkit-scrollbar-thumb` and Firefox `scrollbar-color` globally to `hsl(var(--accent) / 0.45)` with transparent track, and apply same to `.themed-scroll`. Add `themed-scroll` to QuizModal/ProfileSheet scroll containers so the scrollbar feels embedded.

4. **Kyn username read-only** — Remove `setKynUsername` from `UserContext` API surface. In `ProfileSheet`, render `@kynUsername` as plain text only (already display-only, just confirm no input exists).

5. **Default avatar = shuffled** — `AvatarDisplay` picks a deterministic avatar from `avatarMap` using a `seed` (phone number) hash when no `avatarId`/`imageUrl` is set. Pass `seed={phoneNumber}` in header, leaderboard rows, and ProfileSheet.

### Files
- `src/components/QuizModal.tsx`
- `src/pages/Index.tsx`
- `src/index.css`
- `src/components/AvatarDisplay.tsx`
- `src/components/ProfileSheet.tsx`
- `src/contexts/UserContext.tsx`
