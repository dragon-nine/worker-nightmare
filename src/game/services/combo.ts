import { gameBus } from '../event-bus';

/**
 * 콤보 트래커 — 점수에 영향 없음, 순수 시각 피드백용 단일 출처 (single source of truth).
 *
 * 규칙:
 *   - 정답 (forward / switch 성공) 1회마다 increment(now)
 *   - 마지막 정답 후 INTERVAL_MS 안에 다음 정답이 들어와야 콤보 유지 — 끊기면 0 으로 리셋
 *   - count 에 따라 level 단계가 결정됨 (0 / 1 / 2)
 *     - 0: 기본 (효과 없음)
 *     - 1: count >= LEVEL1_THRESHOLD — 옆 sprite 등 부분 효과
 *     - 2: count >= LEVEL2_THRESHOLD — 모든 효과 (sprite + HUD)
 *   - 충돌 / 부활 / 게임 시작 시 reset()
 *
 * 'combo-state' 이벤트로 상태 변화 알림 — Player / HUD 가 구독해 시각 효과 토글.
 *
 * 튜닝 포인트는 이 파일 상단 세 상수만.
 */

/** 다음 정답이 이 시간 안에 들어와야 콤보 유지 (ms) */
const COMBO_INTERVAL_MS = 300;

/** 이 횟수 이상이면 level 1 (부분 효과) — 옆 sprite 만 변형 */
const LEVEL1_THRESHOLD = 5;

/** 이 횟수 이상이면 level 2 (전체 효과) — 옆/앞 sprite + HUD 효과 모두 */
const LEVEL2_THRESHOLD = 10;

let count = 0;
let lastAt = 0;
let level: 0 | 1 | 2 = 0;

function computeLevel(c: number): 0 | 1 | 2 {
  if (c >= LEVEL2_THRESHOLD) return 2;
  if (c >= LEVEL1_THRESHOLD) return 1;
  return 0;
}

function emitState() {
  gameBus.emit('combo-state', { count, level });
}

export const combo = {
  /** 정답 입력 1회 — 점수 +1 직후 호출 */
  increment(now: number) {
    const expired = lastAt > 0 && now - lastAt > COMBO_INTERVAL_MS;
    count = expired ? 1 : count + 1;
    lastAt = now;
    const prevLevel = level;
    level = computeLevel(count);
    if (level !== prevLevel || level > 0) emitState();
  },
  /** 충돌 / 부활 / 게임 시작 등 즉시 0 으로 끊을 때 */
  reset() {
    if (count === 0 && level === 0) return;
    count = 0;
    lastAt = 0;
    level = 0;
    emitState();
  },
  /** 매 프레임 호출 — 마지막 입력 후 INTERVAL 초과 시 자동 종료 */
  tick(now: number) {
    if (count === 0) return;
    if (now - lastAt > COMBO_INTERVAL_MS) {
      count = 0;
      lastAt = 0;
      const prevLevel = level;
      level = 0;
      if (prevLevel !== 0) emitState();
    }
  },
};
