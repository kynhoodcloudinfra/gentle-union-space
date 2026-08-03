import { adminSelect } from '@/lib/adminApi';

export interface TrendBucket {
  key: string;          // e.g. "2026-W30" or "2026-07"
  label: string;        // human friendly
  start: string;        // YYYY-MM-DD IST inclusive
  end: string;          // YYYY-MM-DD IST inclusive
  dau: number;          // avg distinct players per day in bucket
  mau: number;          // distinct players across bucket
  stickiness: number | null;      // dau/mau * 100
  avgNewPerDay: number;           // avg new players per day in bucket
  cumulativeUsers: number;        // distinct players from start-of-time up to bucket end
  avgGamesPerUser: number;        // submissions / distinct-players in bucket
  visited: number;                // distinct visitors in bucket
  visitedNotPlayed: number;       // distinct visitors who didn't play in bucket
  avgTimeSpentSecPerUser: number; // avg session duration per visitor
  visitToPlayPct: number | null;  // played / visited * 100
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istYmd(iso: string): string {
  const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// ISO week key: YYYY-Www (Mon-Sun), using IST date.
function isoWeekKey(ymd: string): { key: string; monday: string; sunday: string } {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // ISO: Mon=1..Sun=7
  const day = dt.getUTCDay() || 7;
  const monday = new Date(dt);
  monday.setUTCDate(dt.getUTCDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  // ISO week number
  const target = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  const toYmd = (x: Date) => `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
  return {
    key: `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`,
    monday: toYmd(monday),
    sunday: toYmd(sunday),
  };
}

function monthKey(ymd: string) {
  const [y, m] = ymd.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m, 0));
  const lastYmd = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, '0')}-${String(last.getUTCDate()).padStart(2, '0')}`;
  return { key: `${y}-${String(m).padStart(2, '0')}`, first, last: lastYmd };
}

async function fetchAll<T>(table: 'submissions' | 'visits', columns: string): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const data = await adminSelect<T>(table, { columns, range: [from, from + pageSize - 1] });
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

interface SubRow { phone_number: string; submitted_at: string }
interface VisitRow { phone_number: string; session_id: string; started_at: string; last_seen_at: string; played: boolean }

function daysInRange(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cur = startYmd;
  while (cur <= endYmd) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

interface Grouping {
  key: string;
  label: string;
  start: string;
  end: string;
}

function buildBuckets(
  groupings: Grouping[],
  subs: SubRow[],
  visits: VisitRow[],
): TrendBucket[] {
  // Precompute per-day submission map and cumulative first-seen for growth
  const subsByDay = new Map<string, SubRow[]>();
  const firstSeen = new Map<string, string>();
  for (const s of subs) {
    const d = istYmd(s.submitted_at);
    if (!subsByDay.has(d)) subsByDay.set(d, []);
    subsByDay.get(d)!.push(s);
    const prev = firstSeen.get(s.phone_number);
    if (!prev || d < prev) firstSeen.set(s.phone_number, d);
  }

  const visitsByDay = new Map<string, VisitRow[]>();
  for (const v of visits) {
    const d = istYmd(v.started_at);
    if (!visitsByDay.has(d)) visitsByDay.set(d, []);
    visitsByDay.get(d)!.push(v);
  }

  return groupings.map(g => {
    const days = daysInRange(g.start, g.end);
    const bucketSubs: SubRow[] = [];
    const bucketVisits: VisitRow[] = [];
    let dauSum = 0;
    let dauDays = 0;
    let newSum = 0;
    for (const d of days) {
      const daySubs = subsByDay.get(d) ?? [];
      const dayVisits = visitsByDay.get(d) ?? [];
      bucketSubs.push(...daySubs);
      bucketVisits.push(...dayVisits);
      const distinctPlayers = new Set(daySubs.map(s => s.phone_number));
      if (distinctPlayers.size > 0) { dauSum += distinctPlayers.size; dauDays += 1; }
      for (const phone of distinctPlayers) {
        if (firstSeen.get(phone) === d) newSum += 1;
      }
    }

    const players = new Set(bucketSubs.map(s => s.phone_number));
    const mau = players.size;
    const dau = dauDays === 0 ? 0 : dauSum / dauDays;
    const avgNewPerDay = days.length === 0 ? 0 : newSum / days.length;

    const cumulativeUsers = [...firstSeen.values()].filter(fs => fs <= g.end).length;
    const avgGamesPerUser = players.size === 0 ? 0 : bucketSubs.length / players.size;

    const visitorsSet = new Set(bucketVisits.map(v => v.phone_number));
    const visited = visitorsSet.size;
    // "Not played" = distinct visitors that never played in this bucket
    const visitedNotPlayed = [...visitorsSet].filter(p => !players.has(p)).length;

    // Time spent per visitor = sum(last_seen - started) grouped by phone / visitor count
    const durationByPhone = new Map<string, number>();
    for (const v of bucketVisits) {
      const dur = Math.max(0, (new Date(v.last_seen_at).getTime() - new Date(v.started_at).getTime()) / 1000);
      durationByPhone.set(v.phone_number, (durationByPhone.get(v.phone_number) ?? 0) + dur);
    }
    const avgTimeSpentSecPerUser =
      visitorsSet.size === 0 ? 0 : [...durationByPhone.values()].reduce((a, b) => a + b, 0) / visitorsSet.size;

    const visitToPlayPct = visited === 0 ? null : (players.size / visited) * 100;

    return {
      key: g.key,
      label: g.label,
      start: g.start,
      end: g.end,
      dau: Math.round(dau * 10) / 10,
      mau,
      stickiness: mau === 0 ? null : Math.round((dau / mau) * 1000) / 10,
      avgNewPerDay: Math.round(avgNewPerDay * 10) / 10,
      cumulativeUsers,
      avgGamesPerUser: Math.round(avgGamesPerUser * 10) / 10,
      visited,
      visitedNotPlayed,
      avgTimeSpentSecPerUser: Math.round(avgTimeSpentSecPerUser),
      visitToPlayPct: visitToPlayPct === null ? null : Math.round(visitToPlayPct * 10) / 10,
    };
  });
}

export async function getTrendAnalytics(): Promise<{ weekly: TrendBucket[]; monthly: TrendBucket[] }> {
  const [subs, visits] = await Promise.all([
    fetchAll<SubRow>('submissions', 'phone_number, submitted_at'),
    fetchAll<VisitRow>('visits', 'phone_number, session_id, started_at, last_seen_at, played'),
  ]);

  const allDates = new Set<string>();
  subs.forEach(s => allDates.add(istYmd(s.submitted_at)));
  visits.forEach(v => allDates.add(istYmd(v.started_at)));
  if (allDates.size === 0) return { weekly: [], monthly: [] };

  // Weekly groupings
  const weekMap = new Map<string, Grouping>();
  const monthMap = new Map<string, Grouping>();
  allDates.forEach(d => {
    const w = isoWeekKey(d);
    if (!weekMap.has(w.key)) {
      weekMap.set(w.key, {
        key: w.key,
        label: `${w.key} (${w.monday} → ${w.sunday})`,
        start: w.monday,
        end: w.sunday,
      });
    }
    const m = monthKey(d);
    if (!monthMap.has(m.key)) {
      monthMap.set(m.key, { key: m.key, label: m.key, start: m.first, end: m.last });
    }
  });

  const weekly = buildBuckets([...weekMap.values()].sort((a, b) => a.key.localeCompare(b.key)), subs, visits);
  const monthly = buildBuckets([...monthMap.values()].sort((a, b) => a.key.localeCompare(b.key)), subs, visits);

  return { weekly: weekly.reverse(), monthly: monthly.reverse() };
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
