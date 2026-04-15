import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { EntryForm } from '@/components/EntryForm';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Music, Trophy, Star } from 'lucide-react';

interface LeaderboardEntry {
  phone_number: string;
  name: string;
  total_score: number;
  streak: number;
  avatar_id: number | null;
  last_played_date: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export default function Leaderboard() {
  const { phoneNumber, name, isIdentified } = useUser();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: allMonths } = await supabase
      .from('leaderboard')
      .select('phone_number, name, total_score, streak, avatar_id, last_played_date');

    if (allMonths) {
      const agg: Record<string, LeaderboardEntry> = {};
      allMonths.forEach(e => {
        if (!agg[e.phone_number]) {
          agg[e.phone_number] = { ...e, total_score: 0, streak: 0 };
        }
        agg[e.phone_number].total_score += e.total_score;
        agg[e.phone_number].streak = Math.max(agg[e.phone_number].streak, e.streak);
        if (e.avatar_id) agg[e.phone_number].avatar_id = e.avatar_id;
        if (e.last_played_date) agg[e.phone_number].last_played_date = e.last_played_date;
      });
      setData(Object.values(agg).sort((a, b) => b.total_score - a.total_score));
    }

    setLoading(false);
  }

  if (!isIdentified) return <EntryForm />;

  const top20 = data.slice(0, 20);
  const userRank = data.findIndex(e => e.phone_number === phoneNumber) + 1;
  const userInTop20 = userRank > 0 && userRank <= 20;
  const userData = userRank > 0 ? data[userRank - 1] : null;

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-amber-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-amber-600 to-amber-800';
    return '';
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center film-grain">
      {/* Decorative music notes */}
      <div className="fixed top-8 left-6 text-accent/20 animate-pulse">
        <Music size={28} />
      </div>
      <div className="fixed top-16 right-8 text-accent/15 animate-pulse" style={{ animationDelay: '1s' }}>
        <Music size={20} />
      </div>
      <div className="fixed bottom-20 left-10 text-accent/10 animate-pulse" style={{ animationDelay: '2s' }}>
        <Music size={24} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-6 pt-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <Star size={16} className="text-accent" />
            <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
              Hall of Maestros
            </span>
            <Star size={16} className="text-accent" />
          </div>

          <h1 className="font-serif text-3xl text-accent gold-glow flex items-center justify-center gap-3">
            <Trophy size={28} />
            Leaderboard
          </h1>

          <p className="text-muted-foreground text-xs mt-2 italic font-serif">
            "Music is the celestial sound, and it is sound that controls the whole universe"
          </p>

          {/* Ornamental line */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            <Music size={14} className="text-accent/50" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Music size={32} className="text-accent/40 mx-auto animate-spin" />
            <p className="text-muted-foreground mt-3 text-sm">Loading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 podium */}
            {top20.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-6 px-2">
                {/* 2nd place */}
                <div className="flex flex-col items-center flex-1">
                  <AvatarDisplay avatarId={top20[1].avatar_id} size={44} />
                  <div className={`mt-1 w-8 h-8 rounded-full bg-gradient-to-b ${getMedalColor(2)} flex items-center justify-center text-sm font-bold text-background`}>
                    2
                  </div>
                  <p className="text-foreground text-xs mt-1 truncate max-w-[80px] text-center">{top20[1].name}</p>
                  <p className="text-accent font-serif text-sm font-bold">{top20[1].total_score}</p>
                </div>

                {/* 1st place */}
                <div className="flex flex-col items-center flex-1 -mb-2">
                  <div className="text-yellow-400 mb-1">👑</div>
                  <AvatarDisplay avatarId={top20[0].avatar_id} size={56} />
                  <div className={`mt-1 w-10 h-10 rounded-full bg-gradient-to-b ${getMedalColor(1)} flex items-center justify-center text-base font-bold text-background shadow-lg shadow-yellow-500/20`}>
                    1
                  </div>
                  <p className="text-foreground text-sm mt-1 truncate max-w-[90px] text-center font-semibold">{top20[0].name}</p>
                  <p className="text-accent font-serif text-lg font-bold gold-glow">{top20[0].total_score}</p>
                </div>

                {/* 3rd place */}
                <div className="flex flex-col items-center flex-1">
                  <AvatarDisplay avatarId={top20[2].avatar_id} size={44} />
                  <div className={`mt-1 w-8 h-8 rounded-full bg-gradient-to-b ${getMedalColor(3)} flex items-center justify-center text-sm font-bold text-background`}>
                    3
                  </div>
                  <p className="text-foreground text-xs mt-1 truncate max-w-[80px] text-center">{top20[2].name}</p>
                  <p className="text-accent font-serif text-sm font-bold">{top20[2].total_score}</p>
                </div>
              </div>
            )}

            {/* Remaining entries (4-20) */}
            {top20.slice(3).map((entry, i) => {
              const rank = i + 4;
              const isUser = entry.phone_number === phoneNumber;
              return (
                <div
                  key={entry.phone_number}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isUser
                      ? 'border-accent bg-accent/10 shadow-md shadow-accent/10'
                      : 'border-border bg-card/80 hover:bg-card'
                  }`}
                >
                  <span className="w-8 text-center font-serif text-accent text-base">
                    {rank}
                  </span>
                  <AvatarDisplay avatarId={entry.avatar_id} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate text-sm">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.streak > 0 && <span>{entry.streak} 🔥 · </span>}
                      {formatDate(entry.last_played_date)}
                    </p>
                  </div>
                  <span className="font-serif text-accent text-lg">{entry.total_score}</span>
                </div>
              );
            })}

            {/* User outside top 20 */}
            {!userInTop20 && userData && (
              <>
                <div className="flex items-center gap-2 justify-center text-muted-foreground py-2">
                  <div className="w-1 h-1 rounded-full bg-accent/40" />
                  <div className="w-1 h-1 rounded-full bg-accent/40" />
                  <div className="w-1 h-1 rounded-full bg-accent/40" />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-accent bg-accent/10 shadow-md shadow-accent/10">
                  <span className="w-8 text-center font-serif text-accent text-base">{userRank}</span>
                  <AvatarDisplay avatarId={userData.avatar_id} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate text-sm">{userData.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {userData.streak > 0 && <span>{userData.streak} 🔥 · </span>}
                      {formatDate(userData.last_played_date)}
                    </p>
                  </div>
                  <span className="font-serif text-accent text-lg">{userData.total_score}</span>
                </div>
              </>
            )}

            {data.length === 0 && (
              <div className="text-center py-12">
                <Music size={40} className="text-accent/20 mx-auto mb-3" />
                <p className="text-muted-foreground">No entries yet — be the first maestro!</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center pb-6">
          <Link to={`/home?phoneNumber=${phoneNumber}&name=${encodeURIComponent(name!)}`}>
            <Button variant="outline" className="border-accent/30 text-accent hover:bg-accent/10">
              ← Back to Quiz
            </Button>
          </Link>

          <p className="text-muted-foreground/40 text-[10px] mt-4 font-serif italic">
            ♪ Raaja Riddle — An Ilaiyaraaja Tribute ♪
          </p>
        </div>
      </div>
    </div>
  );
}
