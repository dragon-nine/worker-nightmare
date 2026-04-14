/**
 * 미션 정의 + 진행도 계산 헬퍼.
 *
 * 단일 진실 원천 — MissionModal과 HomeTab 뱃지 양쪽에서 동일한 데이터를 사용.
 *
 * ID 정책:
 *   - stable semantic ID (예: `daily_score_100`) — 평생 유지
 *   - 조건이 변경되면 새 ID, 보상만 변경되면 ID 유지
 *   - 미션 정의에서 빠진 옛 ID는 storage.pruneClaimedMissions()로 자동 정리
 */

import { storage, type PlayStats, type PlayStatsPeriod } from './storage';

export type MissionPeriod = 'daily' | 'weekly';

/** 어떤 통계로 진행도를 측정할지 결정하는 키 */
export type MissionStatKey =
  | 'plays'                // 플레이 횟수
  | 'bestScore'            // 최고 점수
  | 'challenges'           // 도전장 횟수
  | 'adsWatched'           // 보상형 광고 시청 횟수
  | 'coinsEarned'          // 코인 누적 획득
  | 'streak300Best'        // 300점 이상 연속 (period 최대값)
  | 'postReviveDeltaBest'; // 부활 후 추가 획득 점수 (단일 판 max)

export interface MissionReward {
  coin?: number;
  gem?: number;
}

export interface MissionDef {
  id: string;
  /** 짧은 라벨 (예: "출근 도장") */
  title: string;
  /** 화면에 표시되는 조건 텍스트 */
  desc: string;
  /** 어떤 통계로 측정 */
  statKey: MissionStatKey;
  /** 목표 값 */
  target: number;
  /** 보상 */
  reward: MissionReward;
}

/* ── 일일 미션 (매일 00시 리셋, 10개) — 총 코인 350 + 보석 2 ── */

export const DAILY_MISSIONS: MissionDef[] = [
  { id: 'daily_first_play',          title: '출근 도장',    desc: '첫 판 플레이',           statKey: 'plays',               target: 1,   reward: { coin: 20 } },
  { id: 'daily_score_50',            title: '눈치 퇴근',    desc: '50점 이상 달성',         statKey: 'bestScore',           target: 50,  reward: { coin: 25 } },
  { id: 'daily_play_3',              title: '야근 3회',     desc: '3판 플레이',             statKey: 'plays',               target: 3,   reward: { coin: 30 } },
  { id: 'daily_score_100',           title: '오늘의 목표',  desc: '100점 이상 달성',        statKey: 'bestScore',           target: 100, reward: { coin: 35 } },
  { id: 'daily_send_challenge',      title: '도전장 한 판', desc: '도전장 1회 보내기',      statKey: 'challenges',          target: 1,   reward: { coin: 30 } },
  { id: 'daily_watch_ad',            title: '커피 충전',    desc: '광고 1회 시청',          statKey: 'adsWatched',          target: 1,   reward: { coin: 25 } },
  { id: 'daily_play_5',              title: '칼퇴 연습',    desc: '5판 플레이',             statKey: 'plays',               target: 5,   reward: { coin: 40 } },
  { id: 'daily_revive_score_50',     title: '부활 도전',    desc: '부활 후 50점 추가 달성', statKey: 'postReviveDeltaBest', target: 50,  reward: { coin: 50 } },
  { id: 'daily_score_200',           title: '200점 돌파',   desc: '200점 이상 달성',        statKey: 'bestScore',           target: 200, reward: { coin: 45 } },
  { id: 'daily_play_7',              title: '야근 킹',      desc: '7판 플레이',             statKey: 'plays',               target: 7,   reward: { coin: 50, gem: 2 } },
];

/* ── 주간 미션 (월요일 리셋, 10개) — 총 코인 1,800 + 보석 10 ── */

export const WEEKLY_MISSIONS: MissionDef[] = [
  { id: 'weekly_send_7_challenges',   title: '도전장 달인',    desc: '도전장 7회 보내기',     statKey: 'challenges',     target: 7,    reward: { coin: 100 } },
  { id: 'weekly_play_15',             title: '주간 근무',      desc: '15판 플레이',           statKey: 'plays',          target: 15,   reward: { coin: 150 } },
  { id: 'weekly_send_3_challenges',   title: '도전장 장인',    desc: '도전장 3회 보내기',     statKey: 'challenges',     target: 3,    reward: { coin: 150 } },
  { id: 'weekly_score_300',           title: '실력 인정',      desc: '300점 이상 1회',        statKey: 'bestScore',      target: 300,  reward: { coin: 150 } },
  { id: 'weekly_earn_1000_coins',     title: '코인 수집가',    desc: '주간 코인 1,000개 획득', statKey: 'coinsEarned',    target: 1000, reward: { coin: 200 } },
  { id: 'weekly_watch_10_ads',        title: '광고의 왕',      desc: '광고 10회 시청',        statKey: 'adsWatched',     target: 10,   reward: { coin: 150, gem: 2 } },
  { id: 'weekly_play_25',             title: '야근 마스터',    desc: '25판 플레이',           statKey: 'plays',          target: 25,   reward: { coin: 200, gem: 2 } },
  { id: 'weekly_score_500',           title: '에이스 사원',    desc: '500점 이상 1회',        statKey: 'bestScore',      target: 500,  reward: { coin: 150, gem: 3 } },
  { id: 'weekly_streak_3_score_300',  title: '연속 퇴근',      desc: '3판 연속 300점 이상',   statKey: 'streak300Best',  target: 3,    reward: { coin: 200, gem: 3 } },
  { id: 'weekly_play_40',             title: '전설의 직장인',  desc: '40판 플레이',           statKey: 'plays',          target: 40,   reward: { coin: 350 } },
];

/** 모든 유효 미션 ID — pruneClaimedMissions에 전달용 */
export const ALL_MISSION_IDS: ReadonlySet<string> = new Set(
  [...DAILY_MISSIONS, ...WEEKLY_MISSIONS].map((m) => m.id),
);

/** 통계 객체에서 특정 statKey 값 추출 */
export function readStat(stats: PlayStats, period: MissionPeriod, key: MissionStatKey): number {
  const p: PlayStatsPeriod = stats[period];
  return p[key];
}

/** 미션 진행도 계산 — stat 기반 */
export function computeMissionCurrent(
  mission: MissionDef,
  period: MissionPeriod,
  stats: PlayStats,
): number {
  return readStat(stats, period, mission.statKey);
}

/** 단일 미션이 받기 가능한 상태인지 (완료 + 미수령) */
export function isClaimable(
  mission: MissionDef,
  period: MissionPeriod,
  stats: PlayStats,
  claimedIds: ReadonlySet<string>,
): boolean {
  if (claimedIds.has(mission.id)) return false;
  return computeMissionCurrent(mission, period, stats) >= mission.target;
}

/** 받기 가능한 미션의 총 개수 (홈 뱃지용) */
export function getClaimableMissionCount(): number {
  const stats = storage.getPlayStats();
  const ms = storage.getMissionState();
  const dailyClaimed = new Set(ms.daily.claimed);
  const weeklyClaimed = new Set(ms.weekly.claimed);

  let count = 0;
  for (const m of DAILY_MISSIONS) {
    if (isClaimable(m, 'daily', stats, dailyClaimed)) count++;
  }
  for (const m of WEEKLY_MISSIONS) {
    if (isClaimable(m, 'weekly', stats, weeklyClaimed)) count++;
  }
  return count;
}
