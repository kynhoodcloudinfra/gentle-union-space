

# Plan: Raja Quiz — Full App Build

This is a large build covering database setup, avatar generation, 4 pages, theming, and seed data. Here is the complete implementation plan.

## What Gets Built

### 1. Database (3 tables via migrations)
- **questions**: day_number, question_text, options A-D, correct_answer, question_type, month
- **submissions**: phone_number, name, question_id (FK), day_number, answer_given, is_correct, time_taken_seconds, month
- **leaderboard**: composite PK (phone_number, month), total_score, streak, last_played_date, avatar_id
- All tables with permissive RLS (public read/write). DELETE on questions, UPDATE on leaderboard.

### 2. Avatar System (50 SVG assets)
- Node.js script generates 50 unique Tamil-cinema-themed SVGs (instruments, film reels, microphones, vintage radios, etc.) with warm gold/maroon/teal palette
- Stored as `src/assets/avatars/avatar-1.svg` through `avatar-50.svg`
- `src/lib/avatars.ts` — utility with `getRandomAvatarId()`, avatar import map
- `src/components/AvatarDisplay.tsx` — circular thumbnail component

### 3. Design Theme
- Update `index.css` with Tamil cinema color palette (navy bg, gold accents, maroon touches)
- Add Google Fonts: Playfair Display (headings), Inter (body), Noto Sans Tamil
- Film grain CSS overlay, gold text-shadow effects, ornamental dividers
- Film-strip timer aesthetic with sprocket holes

### 4. User Context
- `src/contexts/UserContext.tsx` — reads `phoneNumber` and `name` from URL search params
- Entry form component shown when params missing, redirects with params after submission

### 5. Pages & Routes

**`/` → redirects to `/home`**

**`/home` — Quiz Page**
- Fetches today's question (day_number = date, month = YYYY-MM)
- MCQ mode: 4 styled option buttons; Text mode: input field
- 30s film-strip countdown timer, auto-submits on expiry
- Scoring: ≤10s = 150pts, ≤20s = 125pts, else = 100pts, wrong = 0
- Result card with feedback, score, total, streak
- Checks for existing submission (no re-play)
- Updates leaderboard (upsert score, streak logic)
- Avatar assignment on first play (persists across months)

**`/leaderboard` — Leaderboard Page**
- "This Month" / "All Time" tabs
- Rows: avatar, name, score, streak 🔥 (no phone numbers)
- Current user highlighted
- Shows user rank at bottom if outside top 20
- Link back to quiz

**`/admin` — Admin Panel**
- Password gate (hardcoded `rajaadmin123`, sessionStorage)
- Single question form + bulk XLSX upload (add `xlsx` npm package)
- Preview parsed rows before saving
- Question manager grouped by month, delete individual, "LIVE" badge on today's question

### 6. Seed Data
- 10 sample Illayaraja trivia questions (mix MCQ + text) for current month via DB insert
- 15 dummy leaderboard entries with Tamil names and random avatar IDs

### 7. Dependencies to Add
- `xlsx` (for admin XLSX parsing)

## Files Created/Modified

| File | Action |
|------|--------|
| `supabase/migrations/*.sql` | Create 3 tables + RLS policies |
| `/tmp/generate-avatars.js` | One-time SVG generator script |
| `src/assets/avatars/avatar-{1-50}.svg` | 50 avatar SVGs |
| `src/lib/avatars.ts` | Avatar utilities |
| `src/components/AvatarDisplay.tsx` | Avatar component |
| `src/contexts/UserContext.tsx` | User identity context |
| `src/components/EntryForm.tsx` | Name+phone entry form |
| `src/components/FilmStripTimer.tsx` | Countdown timer |
| `src/components/QuizCard.tsx` | Quiz question display |
| `src/components/ResultCard.tsx` | Answer result display |
| `src/components/OrnamentalDivider.tsx` | Decorative divider |
| `src/pages/Index.tsx` | Redirect to /home |
| `src/pages/Home.tsx` | Quiz page |
| `src/pages/Leaderboard.tsx` | Leaderboard page |
| `src/pages/Admin.tsx` | Admin panel |
| `src/lib/supabase.ts` | Supabase client + query helpers |
| `src/index.css` | Theme overhaul |
| `index.html` | Add Google Fonts |
| `src/App.tsx` | Add routes + UserContext provider |

## Implementation Order
1. Generate 50 SVG avatars + avatar utilities
2. Database migrations (3 tables + RLS)
3. Theme (CSS, fonts, decorative components)
4. User context + entry form
5. Quiz page (timer, scoring, submission logic)
6. Leaderboard page
7. Admin page (XLSX upload, question management)
8. Seed data (10 questions + 15 leaderboard entries)

