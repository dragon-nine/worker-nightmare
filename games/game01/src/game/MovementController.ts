import { NUM_LANES, VISIBLE_LANES, PADDING, PLAYER_Y_RATIO } from './constants';
import { Road } from './Road';
import { Player } from './Player';
import { HUD } from './HUD';
import { gameBus } from './event-bus';
import { storage } from './services/storage';
import { BackgroundManager } from './BackgroundManager';

export interface MovementDeps {
  scene: Phaser.Scene;
  road: Road;
  player: Player;
  hud: HUD;
  bgManager: BackgroundManager;
  laneW: number;
  tileH: number;
  getViewLeft(): number;
  setViewLeft(v: number): void;
  getCurrentRowIdx(): number;
  setCurrentRowIdx(idx: number): void;
  getScore(): number;
  setScore(s: number): void;
  getJustSwitched(): boolean;
  setJustSwitched(v: boolean): void;
  getComboCount(): number;
  setComboCount(c: number): void;
  getBestCombo(): number;
  setBestCombo(b: number): void;
  getGodMode(): boolean;
  getIsFalling(): boolean;
  setIsFalling(v: boolean): void;
  getGuideCount(): number;
  setGuideCount(c: number): void;
  onCrash(): void;
  onForwardCrash(): void;
  playSfx(key: string, volume: number): void;
  vibrate(pattern: number | number[]): void;
}

/* ── View helpers ── */

/** 레인 번호 → 현재 뷰 기준 화면 X 좌표 */
export function laneScreenX(deps: MovementDeps, lane: number): number {
  return PADDING + deps.laneW / 2 + (lane - deps.getViewLeft()) * deps.laneW;
}

/** 레인이 보이도록 viewLeft 계산 */
export function calcViewLeft(deps: MovementDeps, lane: number): number {
  const vl = deps.getViewLeft();
  let newVl = vl;
  if (lane < newVl) newVl = lane;
  if (lane > newVl + VISIBLE_LANES - 1) newVl = lane - VISIBLE_LANES + 1;
  return Math.max(0, Math.min(newVl, NUM_LANES - VISIBLE_LANES));
}

/** 뷰 패닝 (컨테이너 X 이동) */
export function panViewTo(deps: MovementDeps, newViewLeft: number) {
  if (newViewLeft === deps.getViewLeft()) return;
  deps.setViewLeft(newViewLeft);
  deps.scene.tweens.add({
    targets: deps.road.getContainer(),
    x: -(deps.getViewLeft() * deps.laneW),
    duration: 120, ease: 'Quad.easeOut',
  });
}

/** 현재 행 기준으로 스크롤 */
export function scrollToCurrentRow(deps: MovementDeps) {
  const { height } = deps.scene.scale;
  const row = deps.road.rows[deps.getCurrentRowIdx()];
  if (!row) return;
  const screenY = height * PLAYER_Y_RATIO;
  const targetContainerY = -(row.y - screenY);

  const scrollDelta = targetContainerY - deps.road.getContainer().y;

  // 이전 스크롤 tween 취소 후 새로 시작
  deps.scene.tweens.killTweensOf(deps.road.getContainer());
  deps.scene.tweens.add({
    targets: deps.road.getContainer(),
    y: targetContainerY,
    duration: 100, ease: 'Quad.easeOut',
  });

  deps.bgManager.scroll(scrollDelta);

  const playerScreenX = laneScreenX(deps, deps.player.currentLane);
  deps.player.scrollToX(playerScreenX);
}

/** 가이드 힌트 전송 */
export function emitGuideHint(deps: MovementDeps) {
  if (storage.getBool('tutorialDone')) {
    gameBus.emit('guide-hint', null);
    return;
  }
  if (deps.getGuideCount() >= 20) {
    storage.setBool('tutorialDone', true);
    gameBus.emit('guide-hint', null);
    return;
  }
  const currentRow = deps.road.rows[deps.getCurrentRowIdx()];
  if (currentRow?.isTurn && !deps.getJustSwitched() && currentRow.type !== deps.player.currentLane) {
    gameBus.emit('guide-hint', 'switch');
  } else {
    gameBus.emit('guide-hint', 'forward');
  }
}

/* ── Movement ── */

export function switchLane(deps: MovementDeps) {
  if (deps.getIsFalling()) return;
  const currentRow = deps.road.rows[deps.getCurrentRowIdx()];
  const canSwitch = !deps.getJustSwitched() && currentRow?.isTurn;

  if (!canSwitch) {
    if (deps.getGodMode()) return;
    deps.setIsFalling(true);
    deps.hud.stopTimer();
    deps.playSfx('sfx-crash', 0.7);
    const lane = deps.player.currentLane;
    const crashLane = lane < NUM_LANES - 1 ? lane + 1 : lane - 1;
    const bumpX = laneScreenX(deps, crashLane);
    deps.player.animateCrashSwitch(bumpX, () => deps.onCrash());
    return;
  }

  const targetLane = currentRow.type;
  deps.playSfx('sfx-switch', 0.5);
  deps.player.switchTo(targetLane);
  deps.setJustSwitched(true);
  deps.setScore(deps.getScore() + 1);
  deps.hud.updateScore(deps.getScore());
  deps.hud.addTime();
  deps.setGuideCount(deps.getGuideCount() + 1);
  emitGuideHint(deps);

  panViewTo(deps, calcViewLeft(deps, targetLane));

  const targetScreenX = laneScreenX(deps, targetLane);
  deps.player.animateSwitch(targetScreenX);

  deps.scene.time.delayedCall(350, () => {
    deps.player.faceNextTile(deps.player.currentLane);
  });
}

export function moveForward(deps: MovementDeps) {
  if (deps.getIsFalling()) return;
  const currentRow = deps.road.rows[deps.getCurrentRowIdx()];
  if (currentRow.isTurn && deps.player.currentLane !== currentRow.type) {
    deps.onForwardCrash();
    return;
  }

  const nextIdx = deps.getCurrentRowIdx() + 1;
  const nextRow = deps.road.rows[nextIdx];
  if (!nextRow) return;

  const canPass = nextRow.isTurn || nextRow.type === deps.player.currentLane;
  if (!canPass) {
    deps.onForwardCrash();
    return;
  }

  // 튜토리얼: 첫 전진 시 타이머 시작
  if (!deps.hud.isTimerRunning()) {
    deps.hud.startTimer();
  }

  deps.playSfx('sfx-forward', 0.4);
  deps.setJustSwitched(false);
  deps.setCurrentRowIdx(nextIdx);
  deps.setScore(deps.getScore() + 1);
  deps.hud.updateScore(deps.getScore());
  deps.hud.addTime();
  deps.setGuideCount(deps.getGuideCount() + 1);
  emitGuideHint(deps);
  deps.setComboCount(deps.getComboCount() + 1);
  if (deps.getComboCount() > deps.getBestCombo()) deps.setBestCombo(deps.getComboCount());

  while (deps.road.rows.length - deps.getCurrentRowIdx() < 15) {
    deps.road.addNextRow();
  }

  deps.player.animateForward(() => scrollToCurrentRow(deps));

  if (deps.getComboCount() > 0 && deps.getComboCount() % 10 === 0) {
    deps.playSfx('sfx-combo', 0.7);
    deps.vibrate([12, 40, 12]);
  }

  deps.setCurrentRowIdx(deps.road.cleanupOldRows(deps.getCurrentRowIdx()));
}
