// Reveal day helpers — Asia/Kolkata (IST)
const REVEAL_DATE = '2026-07-19';

export function getISTDate(): string {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function isRevealDay(): boolean {
  return getISTDate() === REVEAL_DATE;
}

export function isPostReveal(): boolean {
  return getISTDate() > REVEAL_DATE;
}

export const WINNER_SNAPSHOT_KEY = 'raja-quiz:winner-jul19';

export interface WinnerSnapshot {
  phone_number: string;
  name: string;
  display_name: string | null;
  kyn_username: string | null;
  total_score: number;
  avatar_id: number | null;
  profile_image_url: string | null;
}

export function loadWinnerSnapshot(): WinnerSnapshot | null {
  try {
    const raw = localStorage.getItem(WINNER_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as WinnerSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveWinnerSnapshot(w: WinnerSnapshot): void {
  try {
    localStorage.setItem(WINNER_SNAPSHOT_KEY, JSON.stringify(w));
  } catch {
    // ignore
  }
}
