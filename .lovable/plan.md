## Changes

### 1. Timer: 45s for all questions (MCQ + text)
In `src/components/QuizModal.tsx`, replace `duration={question.question_type === 'mcq' ? 30 : 60}` with a flat `duration={45}`.

Rescale score tiers so both types fit the 45s window and apply them both in `submitAnswer()` and in the "already answered" recap in `loadQuestion()`:
- **MCQ**: `≤15s → 150`, `≤30s → 100`, else `50`
- **Text**: `≤15s → 150`, `≤30s → 125`, else `100`

Historical submissions/leaderboard are not re-scored — only future answers use the new tiers.

### 2. "Read aloud" button with Indian-accent TTS

Add a visible speaker button next to the question text inside the quiz card (both during answering and in the result recap). Toggles Play / Stop; replays from cache on repeat clicks.

**Provider**: Lovable AI Gateway `openai/gpt-4o-mini-tts` (no extra key needed — uses `LOVABLE_API_KEY`). Voice `alloy`. Indian-accent styling via the `instructions` field: `"Speak in a clear, warm Indian English accent at a natural conversational pace."`

**Pacing (≤15s max read)**:
```
words = question_text.split(/\s+/).length
natural_seconds = words / 2.6          // ~2.6 words/sec at speed 1.0
target_seconds  = clamp(natural_seconds, 6, 15)
speed           = clamp(natural_seconds / target_seconds, 0.9, 1.6)
```
Short questions play near 1.0x; long ones speed up to at most 1.6x so nothing exceeds ~15s.

**Architecture**:
- New Supabase edge function `tts-question` (server-side, keeps the gateway key secret). Accepts `{ text, speed }`, forwards to `https://ai.gateway.lovable.dev/v1/audio/speech` with `model: openai/gpt-4o-mini-tts`, `voice: alloy`, `response_format: mp3`, `stream_format: audio`, plus the Indian-accent `instructions`. Returns raw MP3 bytes with `Content-Type: audio/mpeg` and CORS headers.
- Client `ReadAloudButton` calls `supabase.functions.invoke('tts-question', { body: { text, speed } })`, wraps the returned blob in `URL.createObjectURL`, and plays it via `new Audio(...)`. Caches the object URL per question id so repeat clicks are instant and don't re-bill.
- Button states: `idle | loading | playing`. Clicking while playing stops audio; clicking again replays cached URL. Handles 402/429/5xx from the gateway with a toast.

### 3. Files touched

- `src/components/QuizModal.tsx` — timer duration (flat 45), rescaled score tiers, mount `ReadAloudButton` near the question.
- `src/components/ReadAloudButton.tsx` *(new)* — icon button + audio element + fetch/cache logic.
- `supabase/functions/tts-question/index.ts` *(new)* — proxy to Lovable AI TTS.
- `supabase/config.toml` — register the new function (public, no JWT verification — app is auth-less).
