

# Plan: Avatar System for Raja Quiz

## Summary
Generate 50 unique Tamil-cinema-themed avatar images as SVG components and implement the avatar system with persistence logic.

## What Gets Built

### 1. Generate 50 SVG Avatar Components
Create a programmatic SVG avatar generator script that produces 50 unique avatars themed around Illayaraja/Tamil cinema. Each avatar will be a distinct combination of:
- **Shapes**: Musical instruments (veena, mridangam, flute, harmonium), film reels, microphones, vintage radios, clapperboards, vinyl records, speaker cones, headphones, music notes, film cameras
- **Color palettes**: Warm golds, burnt oranges, deep maroons, cinematic teals — matching the app's vintage Tamil cinema theme
- **Backgrounds**: Varied solid circle backgrounds

Avatars will be stored as individual SVG files in `src/assets/avatars/` (avatar-1.svg through avatar-50.svg) for lightweight, scalable rendering.

### 2. Avatar Component (`src/components/Avatar.tsx`)
- Accepts `avatarId` prop (1-50)
- Renders circular thumbnail at configurable sizes
- Fallback for missing/invalid IDs
- Lazy-loads the SVG asset

### 3. Avatar Utility (`src/lib/avatars.ts`)
- Map of avatar IDs to imported SVG paths
- `getAvatarUrl(id: number)` helper
- `getRandomAvatarId()` for first-time assignment

### 4. Database Integration
- Leaderboard table includes `avatar_id` column
- On first play: assign random avatar_id, persist to leaderboard
- On new month entry: look up avatar_id from any previous month's entry for same phone number
- Avatar displayed on leaderboard rows next to player names

## Technical Details

- **50 SVGs generated via a Node.js script** that programmatically creates unique combinations of shapes, colors, and motifs
- Each SVG is ~1-3KB, total bundle impact minimal (~100KB)
- No external image hosting needed — all static assets
- SVGs chosen over PNGs for crisp rendering at any size and smaller file size

## Files Created/Modified
- `/tmp/generate-avatars.js` — one-time generator script
- `src/assets/avatars/avatar-1.svg` through `avatar-50.svg`
- `src/components/Avatar.tsx`
- `src/lib/avatars.ts`

