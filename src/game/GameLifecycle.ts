import { START_TIME, PLAYER_Y_RATIO } from './constants';
import { submitScore as submitLeaderboardScore } from './services/leaderboard';
import { logEvent } from './services/analytics';
import { gameBus } from './event-bus';
import { storage } from './services/storage';
import { submitScore as submitApiScore } from './services/api';
import { settleBattle } from './services/battle-state';
import { handleThreeDayPromotionOnGameEnd } from './services/promotion';
import { isBattleMode, isStageMode, getCurrentStageId } from './services/game-mode';
import { combo } from './services/combo';
import { getStage, markStageCleared, STAGES } from './services/stages';
import {
  calcViewLeft, panViewTo, scrollToCurrentRow,
  type MovementDeps,
} from './MovementController';

export interface LifecycleDeps extends MovementDeps {
  getGameOver(): boolean;
  setGameOver(v: boolean): void;
  getHasRevived(): boolean;
  setHasRevived(v: boolean): void;
  getScoreAtRevive(): number;
  setScoreAtRevive(v: number): void;
  showPopup(message: string, color: string): void;
}

export type CrashKind = 'forward' | 'switch';
export interface CrashOpts {
  /** switch 충돌일 때 어느 X 좌표로 튕기다가 떨어질지 (lane bump 위치). forward 면 무시. */
  bumpX?: number;
}

/**
 * 충돌 처리의 단일 entrypoint.
 * 일반 모드는 패널티(빨간 tint + 짧은 멈춤 + -1초)로 처리하고, 시간이 0 이 되면 onDeath.
 * 대전 모드는 코인/시간 무관하므로 별도 패널티만 적용. God 모드는 무시.
 */
export function onCrash(deps: LifecycleDeps, kind: CrashKind, _opts: CrashOpts = {}) {
  if (deps.getGodMode()) return;
  if (isBattleMode()) {
    applyBattlePenalty(deps, kind);
    return;
  }
  applyNormalPenalty(deps, kind);
}

const TIME_PENALTY_SECONDS = 1.7;
/**
 * 일반 모드 패널티 hold 시간 (ms). 기본 180ms (대전 모드용) 보다 짧게 — 매 충돌마다 입력 락이
 * 360ms씩 걸리면 빠른 연타 시 "버튼 씹힘" 으로 체감됨. 90ms 시작 + hold + 90ms 복귀 = 총 락.
 */
const NORMAL_PENALTY_HOLD_MS = 30;

function applyNormalPenalty(deps: LifecycleDeps, type: CrashKind) {
  deps.setIsFalling(true);
  deps.hud.stopTimer();
  deps.player.setHurt(true);
  deps.playSfx('sfx-crash', 0.7);
  deps.vibrate([20, 40, 20]);
  deps.scene.cameras.main.shake(120, 0.01);
  combo.reset();

  deps.hud.timeLeft = Math.max(0, deps.hud.timeLeft - TIME_PENALTY_SECONDS);
  deps.hud.updateTimerBar();
  const lethal = deps.hud.timeLeft <= 0;

  if (!lethal) deps.showPopup(`-${TIME_PENALTY_SECONDS}초!`, '#ff8b8b');

  const onDone = lethal
    ? () => onDeath(deps)
    : () => {
        const currentRow = deps.road.rows[deps.getCurrentRowIdx()];
        const nextLane = currentRow?.isTurn ? currentRow.type : deps.player.currentLane;
        deps.player.faceNextTile(nextLane);
        deps.player.setHurt(false);
        deps.setIsFalling(false);
        deps.hud.startTimer();
      };

  if (type === 'forward') {
    deps.player.animateForwardPenalty(onDone, NORMAL_PENALTY_HOLD_MS);
    return;
  }

  const lane = deps.player.currentLane;
  const direction = lane < 1 ? 'right' : 'left';
  deps.player.animateSwitchPenalty(direction, onDone, NORMAL_PENALTY_HOLD_MS);
}

function applyBattlePenalty(deps: LifecycleDeps, type: CrashKind) {
  deps.setIsFalling(true);
  deps.hud.stopTimer();
  deps.player.setHurt(true);
  deps.playSfx('sfx-crash', 0.7);
  deps.vibrate([20, 40, 20]);
  deps.scene.cameras.main.shake(120, 0.01);
  deps.showPopup('실수!', '#ff8b8b');

  const resume = () => {
    const currentRow = deps.road.rows[deps.getCurrentRowIdx()];
    const nextLane = currentRow?.isTurn ? currentRow.type : deps.player.currentLane;
    deps.player.faceNextTile(nextLane);
    deps.player.setHurt(false);
    deps.setIsFalling(false);
    deps.hud.startTimer();
  };

  if (type === 'forward') {
    deps.player.animateForwardPenalty(resume);
    return;
  }

  const lane = deps.player.currentLane;
  const direction = lane < 1 ? 'right' : 'left';
  deps.player.animateSwitchPenalty(direction, resume);
}

export function onDeath(deps: LifecycleDeps) {
  if (deps.getGodMode()) {
    deps.setIsFalling(false);
    deps.player.setHurt(false);
    deps.hud.timeLeft = 5;
    deps.hud.startTimer();
    return;
  }
  if (deps.getGameOver()) return;
  deps.setGameOver(true);
  deps.hud.stopTimer();
  endGame(deps);
}

export function revive(deps: LifecycleDeps) {
  deps.setHasRevived(true);
  // 부활 시점 점수 캡처 — 미션 "부활 후 N점 추가 달성" 판정용
  deps.setScoreAtRevive(deps.getScore());
  deps.setGameOver(false);
  deps.setIsFalling(false);
  deps.setJustSwitched(false);

  deps.player.setHurt(false);
  deps.player.resetSprite();
  combo.reset();

  const { height } = deps.scene.scale;
  const playerScreenY = height * PLAYER_Y_RATIO - deps.tileH / 2;
  deps.player.scrollTo(deps.player.x, playerScreenY);

  const row = deps.road.rows[deps.getCurrentRowIdx()];
  if (row) {
    const correctLane = row.isTurn ? row.type : deps.player.currentLane;
    if (row.isTurn && deps.player.currentLane !== row.type) {
      deps.player.switchTo(correctLane);
    }
    panViewTo(deps, calcViewLeft(deps, deps.player.currentLane));
    scrollToCurrentRow(deps);
  }

  deps.hud.timeLeft = START_TIME;
  deps.hud.elapsed = 30;
  deps.hud.updateTimerBar();
  deps.hud.startTimer();
  // BGM 재개는 AudioDirector 가 screen-change 'playing' 수신 시 자동 처리

  requestAnimationFrame(() => {
    deps.hud.updateScore(deps.getScore());
  });

  logEvent('revive_complete', { score: deps.getScore() });
  deps.playSfx('sfx-coin', 0.7);
  deps.showPopup('부활!', '#44ff44');
}

/**
 * 스테이지 모드 클리어 — 목표 점수 도달 시 호출.
 * endGame(사망) 과 별도 경로 — 점수 제출/리더보드 X, 베스트 갱신 X.
 * 진행도 저장(localStorage) + 코인 보상 + UI 이벤트 emit.
 */
export function endStage(deps: LifecycleDeps) {
  if (!isStageMode()) return;
  const stageId = getCurrentStageId();
  const stage = getStage(stageId);
  if (!stage) return;
  if (deps.getGameOver()) return;

  deps.setGameOver(true);
  deps.hud.stopTimer();
  combo.reset();
  try { deps.playSfx('sfx-coin', 0.8); } catch { /* 무시 */ }

  markStageCleared(stageId);

  // 코인 보상 — 도전 모드 코인과 동일 경로 (storage + 누적 카운터)
  try {
    storage.addNum('coins', stage.rewardCoins);
    storage.recordCoinEarned(stage.rewardCoins);
  } catch { /* 무시 */ }

  try { logEvent('stage_clear', { stageId, score: deps.getScore() }); } catch { /* 무시 */ }

  gameBus.emit('stage-clear-data', {
    stageId,
    score: deps.getScore(),
    targetScore: stage.targetScore,
    rewardCoins: stage.rewardCoins,
    isLastStage: stageId >= STAGES.length,
  });
  gameBus.emit('screen-change', 'stage-clear');
}

export function endGame(deps: LifecycleDeps) {
  if (deps.getGodMode()) {
    deps.setGameOver(false);
    deps.setIsFalling(false);
    deps.player.setHurt(false);
    deps.hud.timeLeft = 5;
    deps.hud.startTimer();
    return;
  }
  deps.setGameOver(true);
  deps.hud.stopTimer();

  // 부가 효과 — 실패해도 게임오버 UI 전환은 반드시 이루어져야 함
  // BGM ducking 은 AudioDirector 가 screen-change 'game-over' 수신 시 처리
  try { deps.playSfx('sfx-game-over', 0.6); } catch { /* 무시 */ }
  try { deps.vibrate([40, 80, 50, 80]); } catch { /* 무시 */ }

  // 부활: 도전(normal) 모드에서만. 대전/스테이지는 실패 시 즉시 재시도/홈.
  const canRevive = !isBattleMode() && !isStageMode() && !deps.getHasRevived();

  try {
    logEvent('game_over', {
      score: deps.getScore(),
      revived: deps.getHasRevived(),
    });
  } catch { /* 무시 */ }

  // 리더보드/API/베스트 갱신 — 스테이지 모드는 제외 (별도 진행도만 저장)
  let bestScore = deps.getScore();
  if (!isStageMode()) {
    try { submitLeaderboardScore(deps.getScore()); } catch { /* 무시 */ }
    submitApiScore(deps.getScore(), {
      revived: deps.getHasRevived(),
      character: storage.getSelectedCharacter(),
    }).catch((e) => console.warn('[api] score submit failed:', e));

    try {
      bestScore = storage.updateBestScore(deps.getScore());
      storage.recordPlayScore(deps.getScore());
      const scoreAtRevive = deps.getScoreAtRevive();
      if (scoreAtRevive >= 0) {
        storage.recordPostReviveScore(deps.getScore() - scoreAtRevive);
      }
      storage.flushNums();
    } catch { /* 무시 */ }
  }

  handleThreeDayPromotionOnGameEnd().catch((e) =>
    console.warn('[promotion] game-end handler failed:', e),
  );

  // ★ 이 emit은 절대 중단되면 안 됨 — 게임오버 화면 전환의 유일한 트리거
  const battle = isBattleMode() ? settleBattle(deps.getScore(), deps.hud.elapsed) : null;
  gameBus.emit('game-over-data', {
    score: deps.getScore(),
    bestScore,
    canRevive,
    coinsEarned: deps.getCoinsEarnedThisGame(),
    battle,
  });
}
