## Answer: Yes, the ranking shift is a direct side effect of the two prior fixes

No new change is needed. The rankings correctly reflect legitimate scores now.

### Two events reshuffled the top of the board

1. **Ravimkm reset (security fix)** — `9043562641` had a tampered 2500 with zero real submissions. He was sitting at rank #1. When the trigger recomputed his row from `submissions`, he dropped to 0. Everyone below him moved up one position.
2. **Day-47 voided question** — Every submission for today's incorrect question was deleted, and the leaderboard was recomputed. Players who had answered day 47 lost 100–150 points; players who hadn't (like `9789953673`) kept their totals and floated up as those above them fell.

### Net effect on `9789953673`

- Her score: **1400 → 1400** (unchanged, fully backed by 11 correct submissions).
- Her rank: **#6 → #3**, purely because at least three players above her either (a) were ravimkm at 2500 who dropped to 0, or (b) lost day-47 points.

### Proposal

**No changes.** The current leaderboard is the correct post-cleanup state. The two fixes did exactly what they were supposed to do; the visible rank shift is the honest consequence of removing illegitimate/voided points.

If you want, I can produce a "top 10 before vs after both fixes" table so you can see who moved and by how much — say the word and I'll run it.
