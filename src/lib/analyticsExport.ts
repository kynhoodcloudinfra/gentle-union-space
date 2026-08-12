import * as XLSX from 'xlsx';
import type { AnalyticsResult, PlayerRow, DailySummary } from './analytics';
import { retentionRate } from './analytics';
import type { TrendBucket } from './trendAnalytics';
import { formatDuration } from './trendAnalytics';

function trendRow(b: TrendBucket) {
  return {
    Period: b.label,
    'Start (IST)': b.start,
    'End (IST)': b.end,
    DAU: b.dau,
    MAU: b.mau,
    'Stickiness %': b.stickiness === null ? 'N/A' : `${b.stickiness.toFixed(1)}%`,
    'Avg New Users / Day': b.avgNewPerDay,
    'Cumulative Users (till end)': b.cumulativeUsers,
    'Avg Games / User': b.avgGamesPerUser,
    'Visitors': b.visited,
    'Visited but did not play': b.visitedNotPlayed,
    'Avg Time Spent / User': formatDuration(b.avgTimeSpentSecPerUser),
    'Visit → Play %': b.visitToPlayPct === null ? 'N/A' : `${b.visitToPlayPct.toFixed(1)}%`,
  };
}

export type TrendData = { weekly: TrendBucket[]; monthly: TrendBucket[] };

function appendTrendSheets(wb: XLSX.WorkBook, trend?: TrendData | null) {
  if (!trend) return;
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trend.weekly.map(trendRow)), 'Weekly Trend');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trend.monthly.map(trendRow)), 'Monthly Trend');
}

export function downloadTrendExcel(weekly: TrendBucket[], monthly: TrendBucket[]) {
  const wb = XLSX.utils.book_new();
  appendTrendSheets(wb, { weekly, monthly });
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `paattu-trend-analytics-${today}.xlsx`);
}


function toSheetRows(players: PlayerRow[]) {
  return players.map(p => ({
    'Display Name': p.display_name ?? p.name ?? '',
    Username: p.kyn_username ? `@${p.kyn_username}` : '',
    'Phone Number': p.phone_number,
    Streak: p.streak,
    'Total Score': p.total_score,
    'Last Played': p.last_played_date ?? '',
  }));
}

export function downloadAnalyticsExcel(result: AnalyticsResult, trend?: TrendData | null) {
  const wb = XLSX.utils.book_new();
  const rate = retentionRate(result);

  const summary = [
    { Metric: 'Date (IST)', Value: result.date },
    { Metric: 'Generated At', Value: new Date(result.generatedAt).toLocaleString() },
    { Metric: 'Players Played Today', Value: result.playedToday.length },
    { Metric: 'New To The Link', Value: result.newUsers.length },
    { Metric: 'Existing Users With Active Streak (>=2)', Value: result.activeStreak.length },
    {
      Metric: 'Retention Rate (D-1 -> D)',
      Value:
        rate === null
          ? 'N/A (no players yesterday)'
          : `${rate.toFixed(1)}% (${result.retained.length}/${result.retentionDenominator})`,
    },
    { Metric: "Didn't Come Back", Value: result.didntComeBack.length },
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(result.playedToday)), 'Played Today');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(result.newUsers)), 'New Users');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(result.activeStreak)), 'Active Streak');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(result.retained)), 'Retained');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(result.didntComeBack)), "Didn't Come Back");

  XLSX.writeFile(wb, `paattu-analytics-${result.date}.xlsx`);
}

export function downloadAllDatesExcel(rows: DailySummary[]) {
  const wb = XLSX.utils.book_new();
  const sheet = rows.map(r => ({
    'Date (IST)': r.date,
    Played: r.played,
    'New Users': r.newUsers,
    'Active Streak (>=2)': r.activeStreak,
    Retained: r.retained,
    'Played D-1': r.retentionDenominator,
    'Retention %': r.retentionRate === null ? 'N/A' : `${r.retentionRate.toFixed(1)}%`,
    "Didn't Come Back": r.didntComeBack,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), 'Daily Summary');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `paattu-analytics-all-dates-${today}.xlsx`);
}
