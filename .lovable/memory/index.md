# Project Memory

## Core
Raja Quiz — Illayaraja fan club daily quiz app. Auth via KYN (mobile OTP + JWT token in URL).
Dark cinematic theme: navy bg, gold accent (#d4a017), Playfair Display headings, Inter body.
Permissive RLS — intentional, no login required. Don't flag as security issue.
Admin password: rajaadmin123 (sessionStorage). Admin route hidden from nav.
Community membership check required — non-members see gated popup.
KYN auth APIs are currently dummy — will be replaced with real endpoints.

## Memories
- [Database schema](mem://features/db-schema) — questions, submissions, leaderboard tables
- [Avatar system](mem://features/avatars) — 50 SVGs, random assignment, persists across months
- [Scoring rules](mem://features/scoring) — 150/125/100 pts by time, streak logic
