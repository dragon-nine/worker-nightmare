import { START_TIME } from './constants';
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
  getBgm(): Phaser.Sound.BaseSound | undefined;
  showPopup(message: string, color: string): void;
}

export function onForwardCrash(deps: LifecycleDeps) {
  if (deps.getGodMode()) return;
  deps.setIsFalling(true);
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
  deps.setGameOver(false);
  deps.setIsFalling(false);
  deps.setComboCount(0);
  deps.setJustSwitched(false);

  deps.player.setHurt(false);
  deps.player.resetSprite();

  const { height } = deps.scene.scale;
  const PLAYER_Y_RATIO = 3 / 4;
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
  deps.playSfx('sfx-combo', 0.7);
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
  deps.getBgm()?.pause();
  deps.playSfx('sfx-game-over', 0.6);
  deps.vibrate([40, 80, 50, 80]);

  const canRevive = !deps.getHasRevived();

  logEvent('game_over', {
    score: deps.getScore(),
    best_combo: deps.getBestCombo(),
    revived: deps.getHasRevived(),
  });
  submitLeaderboardScore(deps.getScore());

  const bestScore = storage.updateBestScore(deps.getScore());

  gameBus.emit('game-over-data', {
    score: deps.getScore(), bestScore, canRevive,
  });
}
