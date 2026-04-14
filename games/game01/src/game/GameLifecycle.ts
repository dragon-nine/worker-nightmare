import { START_TIME, PLAYER_Y_RATIO } from './constants';
import { submitScore as submitLeaderboardScore } from './services/leaderboard';
import { logEvent } from './services/analytics';
import { gameBus } from './event-bus';
import { storage } from './services/storage';
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
  getBgm(): Phaser.Sound.BaseSound | undefined;
  showPopup(message: string, color: string): void;
}

export function onForwardCrash(deps: LifecycleDeps) {
  if (deps.getGodMode()) return;
  deps.setIsFalling(true);
  deps.hud.stopTimer();
  deps.player.setHurt(true);
  deps.playSfx('sfx-crash', 0.7);
  deps.vibrate([30, 40, 60]);
  deps.scene.cameras.main.shake(200, 0.015);
  deps.player.animateForwardCrash(() => onDeath(deps));
}

export function onCrash(deps: LifecycleDeps) {
  if (deps.getGodMode()) return;
  deps.setIsFalling(true);
  deps.player.setHurt(true);
  deps.vibrate([30, 40, 60]);
  deps.scene.cameras.main.shake(200, 0.015);
  onDeath(deps);
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

  const bgm = deps.getBgm();
  if (bgm) {
    (bgm as Phaser.Sound.WebAudioSound).resume();
  }

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
  try { deps.getBgm()?.pause(); } catch { /* 무시 */ }
  try { deps.playSfx('sfx-game-over', 0.6); } catch { /* 무시 */ }
  try { deps.vibrate([40, 80, 50, 80]); } catch { /* 무시 */ }

  const canRevive = !deps.getHasRevived();

  try {
    logEvent('game_over', {
      score: deps.getScore(),
      revived: deps.getHasRevived(),
    });
  } catch { /* 무시 */ }
  try { submitLeaderboardScore(deps.getScore()); } catch { /* 무시 */ }

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

  // ★ 이 emit은 절대 중단되면 안 됨 — 게임오버 화면 전환의 유일한 트리거
  gameBus.emit('game-over-data', {
    score: deps.getScore(),
    bestScore,
    canRevive,
    coinsEarned: deps.getCoinsEarnedThisGame(),
  });
}
