import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { Flame, Sparkles } from 'lucide-react';

interface Row {
  phone_number: string;
  name: string;
  display_name: string | null;
  kyn_username: string | null;
  total_score: number;
  streak: number;
  avatar_id: number | null;
  profile_image_url: string | null;
}

export function LeaderboardTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const pageSize = 1000;
      const data: Row[] = [];
      for (let page = 0; page < 20; page++) {
        const { data: batch, error } = await supabase
          .from('leaderboard')
          .select('phone_number, name, display_name, kyn_username, total_score, streak, avatar_id, profile_image_url')
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (error || !batch || batch.length === 0) break;
        data.push(...(batch as Row[]));
        if (batch.length < pageSize) break;
      }
      if (data.length) {
        const agg: Record<string, Row> = {};
        data.forEach(e => {
          if (!agg[e.phone_number]) agg[e.phone_number] = { ...e, total_score: 0, streak: 0 };
          agg[e.phone_number].total_score += e.total_score;
          agg[e.phone_number].streak = Math.max(agg[e.phone_number].streak, e.streak);
          if (e.avatar_id) agg[e.phone_number].avatar_id = e.avatar_id;
          if (e.profile_image_url) agg[e.phone_number].profile_image_url = e.profile_image_url;
          if (e.display_name) agg[e.phone_number].display_name = e.display_name;
          if (e.kyn_username) agg[e.phone_number].kyn_username = e.kyn_username;
        });
        setRows(Object.values(agg).sort((a, b) => b.total_score - a.total_score));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5 film-grain">
      <h3 className="font-serif text-lg text-accent">Leaderboard ({rows.length} players)</h3>
      <OrnamentalDivider className="my-2" />

      {loading ? (
        <p className="text-muted-foreground py-6 text-center font-serif">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center">No entries yet.</p>
      ) : (
        <div className="overflow-auto border border-border rounded-md max-h-[600px]">
          <table className="w-full text-xs">
            <thead className="bg-secondary sticky top-0">
              <tr className="border-b border-border">
                <th className="p-2 text-left font-serif">Rank</th>
                <th className="p-2 text-left font-serif">Player</th>
                <th className="p-2 text-left font-serif">Phone</th>
                <th className="p-2 text-right font-serif"><Flame size={12} className="inline" /></th>
                <th className="p-2 text-right font-serif"><Sparkles size={12} className="inline" /></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.phone_number} className="border-b border-border/50 hover:bg-background/30">
                  <td className="p-2 font-serif text-accent">{i + 1}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <AvatarDisplay avatarId={r.avatar_id} imageUrl={r.profile_image_url} size={28} />
                      <div>
                        <p className="font-serif text-foreground">{r.display_name ?? r.name}</p>
                        {r.kyn_username && <p className="text-[10px] text-muted-foreground">@{r.kyn_username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-muted-foreground font-mono text-[10px]">{r.phone_number}</td>
                  <td className="p-2 text-right text-orange-400">{r.streak}</td>
                  <td className="p-2 text-right font-serif text-accent">{r.total_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
