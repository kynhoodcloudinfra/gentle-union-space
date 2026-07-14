
## Overview

On **July 19, 2026 (IST, all day)** the reward card on the homepage becomes a live winner reveal. The current #1 on the leaderboard (by `total_score`, computed at load time) is treated as the winner. From **July 20 onward**, the reward card becomes a "Rewards coming soon" placeholder with a small "Previous winner" credit.

## Behavior by date (Asia/Kolkata)

- **Before July 19**: current concert poster card stays exactly as is.
- **July 19 (00:00–23:59 IST)**:
  - Reward card becomes a **Winner Reveal card** on the homepage: gold-accent, celebratory copy, shows winner display name / @kyn_username, avatar, total score.
  - Non-winners see a subtitle: *"Keep playing — you could be the next one."*
  - The winning user (matched by `phone_number` === leaderboard rank 1) sees a **full-screen celebration modal on every visit/login** that day (not dismissible-forever; reopens each mount). Contents:
    - Confetti + gold gradient + "🎉 You won!" headline
    - Their name + score
    - Gratifying message
    - CTA line: "WhatsApp or call +91 91767 77632"
    - Two buttons:
      - **WhatsApp** → `https://wa.me/919176777632?text=<prefilled congrats claim message>`
      - **Call** → `tel:+919176777632`
    - Small "Close" affordance (still reopens next visit).
- **July 20 onward**:
  - Reward card replaced with **"Rewards coming soon"** banner (same card aesthetic — gold border, film-grain, ornamental divider, no image).
  - Below it, small line: *"Previous winner: {displayName} · {score} pts"* using the winner locked in at reveal time.

## Winner determination

- "Winner" = entry at index 0 of the same aggregated & sorted `data` array already computed in `Index.tsx` (highest `total_score`, live).
- For the July 20+ "previous winner" credit, snapshot the July 19 winner into **localStorage** the first time the page loads on/after July 19 (`raja-quiz:winner-jul19` = `{ phone_number, display_name, kyn_username, total_score, avatar_id, profile_image_url }`). Read from it on July 20+. This avoids a schema change and works with the app's no-auth model.

## Date gate (IST)

Small helper `getISTDateParts()` using `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })` to get `YYYY-MM-DD`. Derived booleans:
- `isRevealDay` = IST date === `2026-07-19`
- `isPostReveal` = IST date > `2026-07-19`

## File changes

1. **`src/lib/dateIST.ts`** (new) — `getISTDate()`, `isRevealDay()`, `isPostReveal()` helpers.
2. **`src/components/WinnerRevealCard.tsx`** (new) — replaces the current concert-poster JSX block. Props: `winner`, `isMe`. Renders reveal-day card (gold, celebratory, avatar+name+score+message).
3. **`src/components/RewardsComingSoonCard.tsx`** (new) — post-July-19 placeholder with "Previous winner" line.
4. **`src/components/WinnerCelebrationModal.tsx`** (new) — full-screen modal, confetti (lightweight CSS/SVG, no new dep), WhatsApp + Call buttons, shown on every mount for winner on July 19.
5. **`src/pages/Index.tsx`** — conditional render:
   - `isRevealDay && data.length > 0` → `<WinnerRevealCard winner={data[0]} isMe={data[0]?.phone_number === phoneNumber} />` and mount `<WinnerCelebrationModal>` when I am the winner. Also persist winner snapshot to localStorage.
   - `isPostReveal` → `<RewardsComingSoonCard previousWinner={snapshot} />`
   - else → existing concert-poster card unchanged.

No backend/schema/RLS changes. No new dependencies (confetti done with pure CSS/SVG to stay in-aesthetic).

## Buttons (technical)

- WhatsApp: `<a href="https://wa.me/919176777632?text=Hi!%20I%20won%20today's%20Paattu%20Puzzle%20🎉">` — opens WhatsApp app on mobile, web on desktop.
- Call: `<a href="tel:+919176777632">` — opens dialer.

## Styling

Reuses existing tokens: `bg-card`, `border-accent`, `gold-glow`, `font-serif`, `film-grain`. No hardcoded hex outside existing patterns already in the file. Modal uses shadcn `Dialog` with a custom celebratory inner layout.

## Out of scope

- No admin UI to override winner.
- No email/SMS to winner.
- No analytics event.
