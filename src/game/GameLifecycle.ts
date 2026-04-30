import { START_TIME, PLAYER_Y_RATIO } from './constants';
import { submitScore as submitLeaderboardScore } from './services/leaderboard';
import { logEvent } from './services/analytics';
import { gameBus } from './event-bus';
import { storage } from './services/storage';
import { submitScore as submitApiScore } from './services/api';
import { settleBattle } from './services/battle-state';
import { handleThreeDayPromotionOnGameEnd } from './services/promotion';
import { isBattleMode } from './services/game-mode';
import { combo } from './services/combo';
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
 * 모든 죽음 경로(앞/옆)는 이 함수만 호출해 완전히 동일한 효과 — 빨간 tint, 진동, 카메라 흔들림,
 * SFX, 타이머 정지, isFalling 셋팅 — 를 즉시 적용한 뒤 종류에 맞는 떨어짐 애니메이션을 재생,
 * 끝나면 onDeath. God 모드 / 대전 모드는 위에서 분기.
 */
export function onCrash(deps: LifecycleDeps, kind: CrashKind, opts: CrashOpts = {}) {
  if (deps.getGodMode()) return;
  if (isBattleMode()) {
    applyBattlePenalty(deps, kind);
    return;
  }

  // 1) 공통 임팩트 — 어떤 종류든 동일
  deps.setIsFalling(true);
  deps.hud.stopTimer();
  deps.player.setHurt(true);
  deps.playSfx('sfx-crash', 0.7);
  deps.vibrate([30, 40, 60]);
  deps.scene.cameras.main.shake(200, 0.015);
  combo.reset();

  // 2) 종류별 떨어짐 애니메이션 → 끝나면 onDeath
  if (kind === 'forward') {
    // 한 타일의 70% 만 위로 튕김 — 풀 타일이면 새 토끼 sprite 와 합쳐 너무 높이 떠 보임.
    // 0.7 = "휘청"하는 정도. 조정 시 이 값만.
    const bumpY = deps.player.y - deps.tileH * 0.7;
    deps.player.animateForwardCrash(bumpY, () => onDeath(deps));
    return;
  }
  // switch — bumpX 가 없으면 (방어적) 그냥 onDeath
  if (opts.bumpX == null) {
    onDeath(deps);
    return;
  }
  deps.player.animateCrashSwitch(opts.bumpX, () => onDeath(deps));
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

  const canRevive = isBattleMode() ? false : !deps.getHasRevived();

  try {
    logEvent('game_over', {
      score: deps.getScore(),
      revived: deps.getHasRevived(),
    });
  } catch { /* 무시 */ }
  try { submitLeaderboardScore(deps.getScore()); } catch { /* 무시 */ }
  // Dragon Nine API 점수 제출 (실패해도 게임 흐름 무관)
  submitApiScore(deps.getScore(), {
    revived: deps.getHasRevived(),
    character: storage.getSelectedCharacter(),
  }).catch((e) => console.warn('[api] score submit failed:', e));

  // 저장은 실패 시에도 게임오버는 진행 — best/flush 실패는 다음 게임에서 복구
  let bestScore = deps.getScore();
  try {
    bestScore = storage.updateBestScore(deps.getScore());
    storage.recordPlayScore(deps.getScore());
    // 부활 후 추가 획득 점수 — 부활을 사용한 판만 기록 (-1은 미사용)
    const scoreAtRevive = deps.getScoreAtRevive();
    if (scoreAtRevive >= 0) {
      storage.recordPostReviveScore(deps.getScore() - scoreAtRevive);
    }
    storage.flushNums();
  } catch { /* 무시 */ }

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
