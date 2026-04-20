# Project Memory

## Core
Raaja Riddle — Ilaiyaraaja fan club daily quiz. Auth handled by Kyn (mobile + OTP outside Lovable). Lovable receives JWT in URL `?token=…` (decode → phone, name, kynUsername, userId). No in-app OTP screens.
Single page app: `/` IS the leaderboard + Play Today's Quiz CTA. Quiz opens as a modal. `/admin` only other route.
Burgundy + cream theme. Playfair Display headings, Inter body. Film-grain + vignette overlays. Default ilaiyaraaja image on login screen — don't replace.
Permissive RLS — intentional, no login required. Don't flag as security issue.
Admin password: rajaadmin123 (sessionStorage). Admin route hidden from nav.
Community membership check required — non-members see CommunityGatePopup with Join Tribe CTA → COMMUNITY_URL.
First-time only display name prompt, prefilled with Kyn name (DisplayNamePrompt overlay).
Profile image: pick from 50 SVG avatars OR upload to `avatars` storage bucket. profile_image_url overrides avatar_id when set.

## Memories
- [Database schema](mem://features/db-schema) — questions, submissions, leaderboard + kyn_username/display_name/profile_image_url, avatars storage bucket
- [Avatar system](mem://features/avatars) — 50 SVGs, random assignment, persists across months
- [Scoring rules](mem://features/scoring) — 150/125/100 pts by time, streak logic
