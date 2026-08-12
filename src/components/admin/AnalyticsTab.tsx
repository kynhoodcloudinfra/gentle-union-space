import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Download, RefreshCw, Users, UserPlus, Flame, TrendingUp, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { cn } from '@/lib/utils';
import { getDailyAnalytics, getAllDatesAnalytics, retentionRate, type AnalyticsResult, type PlayerRow, type DailySummary } from '@/lib/analytics';
import { getTrendAnalytics, formatDuration, type TrendBucket } from '@/lib/trendAnalytics';
import { downloadAnalyticsExcel, downloadAllDatesExcel, downloadTrendExcel, downloadEverythingExcel } from '@/lib/analyticsExport';

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  active,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left bg-card border border-border rounded-xl p-4 transition-all hover:border-accent/60',
        active && 'border-accent ring-1 ring-accent/40',
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-serif uppercase tracking-wider">
        <Icon size={14} className="text-accent" />
        {label}
      </div>
      <p className="font-serif text-3xl text-accent gold-glow mt-2">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </button>
  );
}

function PlayerTable({ rows }: { rows: PlayerRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-6 text-center font-serif text-sm">No players in this bucket.</p>;
  }
  return (
    <div className="overflow-auto border border-border rounded-md max-h-[500px]">
      <table className="w-full text-xs">
        <thead className="bg-secondary sticky top-0">
          <tr className="border-b border-border">
            <th className="p-2 text-left font-serif">#</th>
            <th className="p-2 text-left font-serif">Player</th>
            <th className="p-2 text-left font-serif">Phone</th>
            <th className="p-2 text-right font-serif"><Flame size={12} className="inline" /></th>
            <th className="p-2 text-right font-serif">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.phone_number} className="border-b border-border/50 hover:bg-background/30">
              <td className="p-2 font-serif text-accent">{i + 1}</td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <AvatarDisplay avatarId={r.avatar_id} imageUrl={r.profile_image_url} size={26} />
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
  );
}

export function AnalyticsTab() {
  const [date, setDate] = useState<Date>(new Date());
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [allDates, setAllDates] = useState<DailySummary[] | null>(null);
  const [trend, setTrend] = useState<{ weekly: TrendBucket[]; monthly: TrendBucket[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [active, setActive] = useState<'played' | 'new' | 'streak' | 'retained' | 'gone'>('played');
  const reqIdRef = useRef(0);

  const load = useCallback(async (silent = false) => {
    const id = ++reqIdRef.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [res, all, tr] = await Promise.all([
        getDailyAnalytics(date),
        getAllDatesAnalytics(),
        getTrendAnalytics(),
      ]);
      if (reqIdRef.current === id) {
        setData(res);
        setAllDates(all);
        setTrend(tr);
        setUpdatedAt(new Date());
      }
    } catch (e: any) {
      if (reqIdRef.current === id) setError(e?.message ?? 'Failed to load analytics');
    } finally {
      if (reqIdRef.current === id && !silent) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const rate = useMemo(() => (data ? retentionRate(data) : null), [data]);

  const buckets = useMemo(() => {
    if (!data) return null;
    return {
      played: data.playedToday,
      new: data.newUsers,
      streak: data.activeStreak,
      retained: data.retained,
      gone: data.didntComeBack,
    };
  }, [data]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 film-grain">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-lg text-accent">Daily Analytics</h3>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="font-serif">
                <CalendarIcon size={14} className="mr-1" />
                {format(date, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={d => d && setDate(d)}
                initialFocus
                disabled={d => d > new Date()}
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading} className="font-serif">
            <RefreshCw size={14} className={cn('mr-1', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadEverythingExcel(data, allDates, trend)}
            disabled={!data && allDates.length === 0 && !trend}
            className="font-serif"
          >
            <Download size={14} className="mr-1" />
            Download All (1 file)
          </Button>
          <Button
            size="sm"
            onClick={() => data && downloadAnalyticsExcel(data, trend)}
            disabled={!data}
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-serif"
          >
            <Download size={14} className="mr-1" />
            Excel
          </Button>

        </div>
      </div>
      <OrnamentalDivider className="my-2" />

      {updatedAt && (
        <p className="text-[10px] text-muted-foreground text-right mb-3">
          Auto-refreshes every 30s · Updated {updatedAt.toLocaleTimeString()}
        </p>
      )}

      {error && <p className="text-destructive text-sm py-2">{error}</p>}

      {!data && loading && <p className="text-muted-foreground py-6 text-center font-serif">Loading…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard
              icon={Users}
              label="Played Today"
              value={String(data.playedToday.length)}
              active={active === 'played'}
              onClick={() => setActive('played')}
            />
            <MetricCard
              icon={UserPlus}
              label="New To Link"
              value={String(data.newUsers.length)}
              active={active === 'new'}
              onClick={() => setActive('new')}
            />
            <MetricCard
              icon={Flame}
              label="Active Streak"
              value={String(data.activeStreak.length)}
              sub="Streak ≥ 2 & played today"
              active={active === 'streak'}
              onClick={() => setActive('streak')}
            />
            <MetricCard
              icon={TrendingUp}
              label="Retention"
              value={rate === null ? '—' : `${rate.toFixed(1)}%`}
              sub={`${data.retained.length} / ${data.retentionDenominator} (D-1 → D)`}
              active={active === 'retained'}
              onClick={() => setActive('retained')}
            />
            <MetricCard
              icon={UserMinus}
              label="Didn't Come Back"
              value={String(data.didntComeBack.length)}
              sub="All-time players missing today"
              active={active === 'gone'}
              onClick={() => setActive('gone')}
            />
          </div>

          <div className="mt-4">
            <Tabs value={active} onValueChange={v => setActive(v as typeof active)}>
              <TabsList className="grid grid-cols-5 bg-background border border-border">
                <TabsTrigger value="played" className="font-serif text-xs">Played</TabsTrigger>
                <TabsTrigger value="new" className="font-serif text-xs">New</TabsTrigger>
                <TabsTrigger value="streak" className="font-serif text-xs">Streak</TabsTrigger>
                <TabsTrigger value="retained" className="font-serif text-xs">Retained</TabsTrigger>
                <TabsTrigger value="gone" className="font-serif text-xs">Missing</TabsTrigger>
              </TabsList>
              {(['played', 'new', 'streak', 'retained', 'gone'] as const).map(k => (
                <TabsContent key={k} value={k} className="mt-3">
                  <PlayerTable rows={buckets?.[k] ?? []} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </>
      )}

      {allDates && allDates.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-accent">All Dates</h3>
            <Button
              size="sm"
              onClick={() => downloadAllDatesExcel(allDates, trend)}
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-serif"
            >
              <Download size={14} className="mr-1" />
              Excel (All Dates)
            </Button>
          </div>
          <OrnamentalDivider className="my-2" />
          <div className="overflow-auto border border-border rounded-md max-h-[500px]">
            <table className="w-full text-xs">
              <thead className="bg-secondary sticky top-0">
                <tr className="border-b border-border">
                  <th className="p-2 text-left font-serif">Date (IST)</th>
                  <th className="p-2 text-right font-serif">Played</th>
                  <th className="p-2 text-right font-serif">New</th>
                  <th className="p-2 text-right font-serif">Streak</th>
                  <th className="p-2 text-right font-serif">Retained</th>
                  <th className="p-2 text-right font-serif">D-1</th>
                  <th className="p-2 text-right font-serif">Retention</th>
                  <th className="p-2 text-right font-serif">Missing</th>
                </tr>
              </thead>
              <tbody>
                {allDates.map(r => (
                  <tr key={r.date} className="border-b border-border/50 hover:bg-background/30">
                    <td className="p-2 font-mono text-foreground">{r.date}</td>
                    <td className="p-2 text-right font-serif text-accent">{r.played}</td>
                    <td className="p-2 text-right">{r.newUsers}</td>
                    <td className="p-2 text-right text-orange-400">{r.activeStreak}</td>
                    <td className="p-2 text-right">{r.retained}</td>
                    <td className="p-2 text-right text-muted-foreground">{r.retentionDenominator}</td>
                    <td className="p-2 text-right">{r.retentionRate === null ? '—' : `${r.retentionRate.toFixed(1)}%`}</td>
                    <td className="p-2 text-right text-muted-foreground">{r.didntComeBack}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {trend && (trend.weekly.length > 0 || trend.monthly.length > 0) && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-accent">Weekly & Monthly Trends</h3>
            <Button
              size="sm"
              onClick={() => downloadTrendExcel(trend.weekly, trend.monthly)}
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-serif"
            >
              <Download size={14} className="mr-1" />
              Excel (Trends)
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Visit-based metrics (visitors, time spent, visit→play) start counting from the moment tracking was enabled — earlier periods will show 0 visitors.
          </p>
          <OrnamentalDivider className="my-2" />
          <Tabs defaultValue="weekly">
            <TabsList className="grid grid-cols-2 bg-background border border-border max-w-xs">
              <TabsTrigger value="weekly" className="font-serif text-xs">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="font-serif text-xs">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="weekly" className="mt-3">
              <TrendTable rows={trend.weekly} />
            </TabsContent>
            <TabsContent value="monthly" className="mt-3">
              <TrendTable rows={trend.monthly} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function TrendTable({ rows }: { rows: TrendBucket[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-6 text-center font-serif text-sm">No data yet.</p>;
  }
  return (
    <div className="overflow-auto border border-border rounded-md max-h-[500px]">
      <table className="w-full text-xs whitespace-nowrap">
        <thead className="bg-secondary sticky top-0">
          <tr className="border-b border-border">
            <th className="p-2 text-left font-serif">Period</th>
            <th className="p-2 text-right font-serif" title="Average Daily Active Users">DAU</th>
            <th className="p-2 text-right font-serif" title="Monthly / period Active Users">MAU</th>
            <th className="p-2 text-right font-serif" title="DAU / MAU">Stickiness</th>
            <th className="p-2 text-right font-serif">Avg New / Day</th>
            <th className="p-2 text-right font-serif" title="Total distinct users up to end of period">Cumulative</th>
            <th className="p-2 text-right font-serif">Avg Games / User</th>
            <th className="p-2 text-right font-serif">Visitors</th>
            <th className="p-2 text-right font-serif" title="Visited but did not play">Visited · No Play</th>
            <th className="p-2 text-right font-serif">Avg Time / User</th>
            <th className="p-2 text-right font-serif">Visit → Play</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-border/50 hover:bg-background/30">
              <td className="p-2 font-mono text-foreground">{r.label}</td>
              <td className="p-2 text-right text-accent">{r.dau}</td>
              <td className="p-2 text-right text-accent">{r.mau}</td>
              <td className="p-2 text-right">{r.stickiness === null ? '—' : `${r.stickiness.toFixed(1)}%`}</td>
              <td className="p-2 text-right">{r.avgNewPerDay}</td>
              <td className="p-2 text-right">{r.cumulativeUsers}</td>
              <td className="p-2 text-right">{r.avgGamesPerUser}</td>
              <td className="p-2 text-right">{r.visited}</td>
              <td className="p-2 text-right text-muted-foreground">{r.visitedNotPlayed}</td>
              <td className="p-2 text-right">{formatDuration(r.avgTimeSpentSecPerUser)}</td>
              <td className="p-2 text-right">{r.visitToPlayPct === null ? '—' : `${r.visitToPlayPct.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
