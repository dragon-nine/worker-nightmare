/**
 * 스테이지 모드 정의 + 진행도 관리. 서버 연동 없이 localStorage 기반.
 *
 * 잠금 규칙: 직전 스테이지를 클리어해야 다음이 열림. lastCleared 가 0 이면 1 만 열림.
 *
 * 도전 모드(normal) 와 분리됨 — 스테이지 모드에선 장애물(구름/먼지) 없음.
 */

export interface StageObstacles {
  cloud: boolean;
  dust: boolean;
  /** 뒤로가기 (rewind) — 통과 시 1~3칸 강제 후진 + 후진 동안 입력 무시 */
  rewind: boolean;
}

export interface StageDef {
  id: number;
  targetScore: number;
  rewardCoins: number;
  obstacles: StageObstacles;
  /** 게이지 최대 시간 (초) — 시작 시간 + 회복 cap */
  maxTime: number;
  /** forward 입력 1회당 회복 시간 (초, 고정) — 도전 모드의 리니어 커브 대신 사용 */
  timeBonus: number;
}

export const STAGES: StageDef[] = [
  { id: 1, targetScore: 100, rewardCoins: 30,  obstacles: { cloud: false, dust: false, rewind: false }, maxTime: 5, timeBonus: 0.40 },
  { id: 2, targetScore: 200, rewardCoins: 50,  obstacles: { cloud: true,  dust: false, rewind: false }, maxTime: 5, timeBonus: 0.30 },
  { id: 3, targetScore: 300, rewardCoins: 80,  obstacles: { cloud: true,  dust: true,  rewind: false }, maxTime: 5, timeBonus: 0.25 },
  { id: 4, targetScore: 400, rewardCoins: 120, obstacles: { cloud: false, dust: false, rewind: true  }, maxTime: 5, timeBonus: 0.25 },
  { id: 5, targetScore: 500, rewardCoins: 200, obstacles: { cloud: true,  dust: true,  rewind: false }, maxTime: 5, timeBonus: 0.20 },
];

const STORAGE_KEY = 'stage.lastCleared';

export function getLastClearedStage(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const n = raw == null ? 0 : Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(STAGES.length, n)) : 0;
}

export function isStageUnlocked(_id: number): boolean {
  // 모든 레벨 자유 선택 (잠금 없음). 클리어 표시는 isStageCleared 로 별도 체크.
  return true;
}

export function isStageCleared(id: number): boolean {
  return id <= getLastClearedStage();
}

export function markStageCleared(id: number): void {
  const last = getLastClearedStage();
  if (id > last) localStorage.setItem(STORAGE_KEY, String(id));
}

export function getStage(id: number): StageDef | undefined {
  return STAGES.find((s) => s.id === id);
}

/** 다음 진입할 스테이지 — 직전 클리어 +1, 마지막 스테이지 도달 시 그대로 마지막 */
export function getNextStageId(): number {
  return Math.min(getLastClearedStage() + 1, STAGES.length);
}

export function resetStageProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 현재 게임 모드에 따라 활성 장애물 결정.
 * - 대전 모드: 둘 다 X
 * - 도전 모드(normal): 둘 다 O
 * - 스테이지 모드: 현재 스테이지 정의에 따름
 */
import { isBattleMode, isStageMode, getCurrentStageId } from './game-mode';

export function obstaclesForCurrentMode(): StageObstacles {
  if (isBattleMode()) return { cloud: false, dust: false, rewind: false };
  if (!isStageMode()) return { cloud: true, dust: true, rewind: false };
  const stage = getStage(getCurrentStageId());
  return stage?.obstacles ?? { cloud: false, dust: false, rewind: false };
}
