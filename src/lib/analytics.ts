import { supabase } from '@/lib/supabase';

export interface PlayerRow {
  phone_number: string;
  name: string;
  display_name: string | null;
  kyn_username: string | null;
  avatar_id: number | null;
  profile_image_url: string | null;
  streak: number;
  total_score: number;
  last_played_date: string | null;
}

export interface AnalyticsResult {
  date: string; // YYYY-MM-DD (IST)
  playedToday: PlayerRow[];
  newUsers: PlayerRow[];
  activeStreak: PlayerRow[];
  retained: PlayerRow[]; // players who played D-1 AND D
  retentionDenominator: number; // players who played D-1
  didntComeBack: PlayerRow[]; // played on any prior date, not on D
  generatedAt: string;
}

// Return ISO instants for start/end of the IST day corresponding to `date`.
function istDayBounds(date: Date): { startISO: string; endISO: string; ymd: string } {
  // Convert given date to IST calendar date
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const asIst = new Date(date.getTime() + istOffsetMs);
  const y = asIst.getUTCFullYear();
  const m = asIst.getUTCMonth();
  const d = asIst.getUTCDate();
  // Start of that IST day, expressed as UTC instant
  const startUtcMs = Date.UTC(y, m, d) - istOffsetMs;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;
  const ymd = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return {
    startISO: new Date(startUtcMs).toISOString(),
    endISO: new Date(endUtcMs).toISOString(),
    ymd,
  };
}

async function fetchAllSubmissions(): Promise<Array<{ phone_number: string; submitted_at: string }>> {
  const pageSize = 1000;
  const rows: Array<{ phone_number: string; submitted_at: string }> = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('submissions')
      .select('phone_number, submitted_at')
      .order('submitted_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

export async function getDailyAnalytics(date: Date): Promise<AnalyticsResult> {
  const today = istDayBounds(date);
  const prev = istDayBounds(new Date(date.getTime() - 24 * 60 * 60 * 1000));

  const [allSubs, lbRes] = await Promise.all([
    fetchAllSubmissions(),
    supabase
      .from('leaderboard')
      .select(
        'phone_number, name, display_name, kyn_username, avatar_id, profile_image_url, streak, total_score, last_played_date',
      ),
  ]);
  if (lbRes.error) throw lbRes.error;

  // Aggregate leaderboard by phone (may have multi-month rows)
  const lbByPhone = new Map<string, PlayerRow>();
  (lbRes.data ?? []).forEach((e: any) => {
    const existing = lbByPhone.get(e.phone_number);
    if (!existing) {
      lbByPhone.set(e.phone_number, {
        phone_number: e.phone_number,
        name: e.name,
        display_name: e.display_name,
        kyn_username: e.kyn_username,
        avatar_id: e.avatar_id,
        profile_image_url: e.profile_image_url,
        streak: e.streak ?? 0,
        total_score: e.total_score ?? 0,
        last_played_date: e.last_played_date,
      });
    } else {
      existing.total_score += e.total_score ?? 0;
      existing.streak = Math.max(existing.streak, e.streak ?? 0);
      if (e.avatar_id) existing.avatar_id = e.avatar_id;
      if (e.profile_image_url) existing.profile_image_url = e.profile_image_url;
      if (e.display_name) existing.display_name = e.display_name;
      if (e.kyn_username) existing.kyn_username = e.kyn_username;
      if (
        e.last_played_date &&
        (!existing.last_played_date || e.last_played_date > existing.last_played_date)
      ) {
        existing.last_played_date = e.last_played_date;
      }
    }
  });

  const rowFor = (phone: string, fallbackName = 'Unknown'): PlayerRow =>
    lbByPhone.get(phone) ?? {
      phone_number: phone,
      name: fallbackName,
      display_name: null,
      kyn_username: null,
      avatar_id: null,
      profile_image_url: null,
      streak: 0,
      total_score: 0,
      last_played_date: null,
    };

  // Compute first-seen date + played-today / played-yesterday / played-before sets
  const firstSeen = new Map<string, string>(); // phone -> ISO ts
  const playedTodaySet = new Set<string>();
  const playedYesterdaySet = new Set<string>();
  const playedBeforeTodaySet = new Set<string>();

  for (const s of allSubs) {
    if (!firstSeen.has(s.phone_number)) firstSeen.set(s.phone_number, s.submitted_at);
    if (s.submitted_at >= today.startISO && s.submitted_at < today.endISO) {
      playedTodaySet.add(s.phone_number);
    }
    if (s.submitted_at >= prev.startISO && s.submitted_at < prev.endISO) {
      playedYesterdaySet.add(s.phone_number);
    }
    if (s.submitted_at < today.startISO) {
      playedBeforeTodaySet.add(s.phone_number);
    }
  }

  const playedToday = [...playedTodaySet].map(p => rowFor(p));

  const newUsers = [...playedTodaySet]
    .filter(p => {
      const fs = firstSeen.get(p);
      return fs && fs >= today.startISO && fs < today.endISO;
    })
    .map(p => rowFor(p));

  const activeStreak = playedToday.filter(r => r.streak >= 2);

  const retained = [...playedYesterdaySet].filter(p => playedTodaySet.has(p)).map(p => rowFor(p));

  const didntComeBack = [...playedBeforeTodaySet]
    .filter(p => !playedTodaySet.has(p))
    .map(p => rowFor(p));

  const sortByScore = (a: PlayerRow, b: PlayerRow) => b.total_score - a.total_score;
  playedToday.sort(sortByScore);
  newUsers.sort(sortByScore);
  activeStreak.sort((a, b) => b.streak - a.streak || b.total_score - a.total_score);
  retained.sort(sortByScore);
  didntComeBack.sort(sortByScore);

  return {
    date: today.ymd,
    playedToday,
    newUsers,
    activeStreak,
    retained,
    retentionDenominator: playedYesterdaySet.size,
    didntComeBack,
    generatedAt: new Date().toISOString(),
  };
}

export function retentionRate(r: AnalyticsResult): number | null {
  if (r.retentionDenominator === 0) return null;
  return (r.retained.length / r.retentionDenominator) * 100;
}
