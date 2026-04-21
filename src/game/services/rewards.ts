/**
 * 랭킹 보상 정책 — 클라에서 계산, 서버는 순위만 반환.
 * RankingModal(보상 표시) + HomeTab(보상 수령) 양쪽에서 공유.
 */

export interface Reward { coin?: number; gem?: number }

export type RewardPeriod = 'daily' | 'weekly';

export function getReward(period: RewardPeriod | 'all', rank: number): Reward | null {
  if (period === 'daily') {
    if (rank === 1) return { coin: 200, gem: 3 };
    if (rank === 2) return { coin: 150 };
    if (rank === 3) return { coin: 100 };
    return null;
  }
  if (period === 'weekly') {
    if (rank === 1) return { coin: 1000, gem: 15 };
    if (rank === 2) return { coin: 700, gem: 10 };
    if (rank === 3) return { coin: 500, gem: 7 };
    if (rank <= 10) return { coin: 300 };
    return null;
  }
  return null;
}

/** 'YYYY-MM-DD' 다음 날 키 */
export function nextDailyKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** 'YYYY-Www' 다음 주 키 (간이 — 문자열 week+1, 연도 경계는 추후 보강) */
export function nextWeeklyKey(key: string): string {
  const [yearStr, wStr] = key.split('-W');
  let year = Number(yearStr);
  let week = Number(wStr) + 1;
  if (week > 52) { week = 1; year += 1; }
  return `${year}-W${String(week).padStart(2, '0')}`;
}
