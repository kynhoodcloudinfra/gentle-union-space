---
name: db-schema
description: Tables (questions, submissions, leaderboard) — fields including kyn_username, display_name, profile_image_url, avatars storage bucket
type: feature
---
**leaderboard**: phone_number (PK-ish), name, display_name, kyn_username, total_score, streak, last_played_date, month, avatar_id, profile_image_url, updated_at.

**submissions**: id, phone_number, name, display_name, kyn_username, question_id (FK→questions), day_number, answer_given, is_correct, time_taken_seconds, month, submitted_at.

**questions**: id, day_number, question_text, option_a..d (nullable for text-type), correct_answer, question_type ('mcq' | 'text'), month, created_at.

**Storage**: `avatars` bucket (public). Path pattern: `{phone_number}/{timestamp}.{ext}`. Public read, anyone can insert/update.

All RLS is permissive (intentional — no auth in this app).
