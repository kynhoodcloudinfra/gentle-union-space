import * as XLSX from 'xlsx';
import type { AnalyticsResult, PlayerRow, DailySummary } from './analytics';
import { retentionRate } from './analytics';

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

export function downloadAnalyticsExcel(result: AnalyticsResult) {
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
