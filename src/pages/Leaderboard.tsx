import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { EntryForm } from '@/components/EntryForm';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase, getCurrentMonth } from '@/lib/supabase';

interface LeaderboardEntry {
  phone_number: string;
  name: string;
  total_score: number;
  streak: number;
  avatar_id: number | null;
}

export default function Leaderboard() {
  const { phoneNumber, name, isIdentified } = useUser();
  const [monthlyData, setMonthlyData] = useState<LeaderboardEntry[]>([]);
  const [allTimeData, setAllTimeData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const month = getCurrentMonth();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Monthly
    const { data: monthly } = await supabase
      .from('leaderboard')
      .select('phone_number, name, total_score, streak, avatar_id')
      .eq('month', month)
      .order('total_score', { ascending: false });

    setMonthlyData(monthly ?? []);

    // All time - aggregate across months
    const { data: allMonths } = await supabase
      .from('leaderboard')
      .select('phone_number, name, total_score, streak, avatar_id');

    if (allMonths) {
      const agg: Record<string, LeaderboardEntry> = {};
      allMonths.forEach(e => {
        if (!agg[e.phone_number]) {
          agg[e.phone_number] = { ...e, total_score: 0, streak: 0 };
        }
        agg[e.phone_number].total_score += e.total_score;
        agg[e.phone_number].streak = Math.max(agg[e.phone_number].streak, e.streak);
        if (e.avatar_id) agg[e.phone_number].avatar_id = e.avatar_id;
      });
      setAllTimeData(Object.values(agg).sort((a, b) => b.total_score - a.total_score));
    }

    setLoading(false);
  }

  if (!isIdentified) return <EntryForm />;

  const renderList = (data: LeaderboardEntry[]) => {
    const top20 = data.slice(0, 20);
    const userRank = data.findIndex(e => e.phone_number === phoneNumber) + 1;
    const userInTop20 = userRank > 0 && userRank <= 20;
    const userData = userRank > 0 ? data[userRank - 1] : null;

    return (
      <div className="space-y-2">
        {top20.map((entry, i) => (
          <div
            key={entry.phone_number}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              entry.phone_number === phoneNumber
                ? 'border-accent bg-accent/10'
                : 'border-border bg-card'
            }`}
          >
            <span className="w-8 text-center font-serif text-accent text-lg">
              {i + 1}
            </span>
            <AvatarDisplay avatarId={entry.avatar_id} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-foreground truncate text-sm">{entry.name}</p>
              <p className="text-xs text-muted-foreground">{entry.streak} 🔥</p>
            </div>
            <span className="font-serif text-accent text-lg">{entry.total_score}</span>
          </div>
        ))}

        {!userInTop20 && userData && (
          <>
            <div className="text-center text-muted-foreground py-2">• • •</div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-accent bg-accent/10">
              <span className="w-8 text-center font-serif text-accent text-lg">{userRank}</span>
              <AvatarDisplay avatarId={userData.avatar_id} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate text-sm">{userData.name}</p>
                <p className="text-xs text-muted-foreground">{userData.streak} 🔥</p>
              </div>
              <span className="font-serif text-accent text-lg">{userData.total_score}</span>
            </div>
          </>
        )}

        {data.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No entries yet</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-4 pt-4">
          <h1 className="font-serif text-3xl text-accent gold-glow">🏆 Leaderboard</h1>
          <p className="text-muted-foreground text-sm mt-1">{month}</p>
          <OrnamentalDivider />
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : (
          <Tabs defaultValue="monthly">
            <TabsList className="w-full bg-card border border-border">
              <TabsTrigger value="monthly" className="flex-1 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">This Month</TabsTrigger>
              <TabsTrigger value="alltime" className="flex-1 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">All Time</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly">{renderList(monthlyData)}</TabsContent>
            <TabsContent value="alltime">{renderList(allTimeData)}</TabsContent>
          </Tabs>
        )}

        <div className="mt-6 text-center">
          <Link to={`/home?phoneNumber=${phoneNumber}&name=${encodeURIComponent(name!)}`}>
            <Button variant="outline">← Back to Quiz</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
