import { NUM_LANES, VISIBLE_LANES, PADDING, PLAYER_Y_RATIO } from './constants';
import { Road } from './Road';
import { Player } from './Player';
import { HUD } from './HUD';
import type { TutorialStep } from './event-bus';
import { BackgroundManager } from './BackgroundManager';
import { isBattleMode } from './services/game-mode';
import { storage } from './services/storage';

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
  getGodMode(): boolean;
  getIsFalling(): boolean;
  setIsFalling(v: boolean): void;
  getGuideCount(): number;
  setGuideCount(c: number): void;
  getTutorialStep(): TutorialStep;
  onTutorialAction(action: 'forward' | 'switch'): void;
  /** 충돌 처리 단일 entrypoint. kind='switch' 일 땐 opts.bumpX 필수 (튕길 X 좌표). */
  onCrash(kind: 'forward' | 'switch', opts?: { bumpX?: number }): void;
  playSfx(key: string, volume: number): void;
  vibrate(pattern: number | number[]): void;
  /** 이번 판에서 획득한 코인 수 */
  getCoinsEarnedThisGame(): number;
  /** 코인 픽업 시 호출 — 카운터 +1 */
  incrementCoinsEarnedThisGame(): void;
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
export function panViewTo(deps: MovementDeps, newViewLeft: number, duration = 120) {
  if (newViewLeft === deps.getViewLeft()) return;
  deps.setViewLeft(newViewLeft);
  deps.scene.tweens.add({
    targets: deps.road.getContainer(),
    x: -(deps.getViewLeft() * deps.laneW),
    duration, ease: 'Quad.easeOut',
  });
}

/** 현재 행 기준으로 스크롤 */
export function scrollToCurrentRow(deps: MovementDeps, duration = 100) {
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
    duration, ease: 'Quad.easeOut',
  });

  deps.bgManager.scroll(scrollDelta);

  const playerScreenX = laneScreenX(deps, deps.player.currentLane);
  deps.player.scrollToX(playerScreenX);
}

/** 튜토리얼 스텝일 때 이동 속도를 느리게 */
function isTutorialSlowMove(deps: MovementDeps): boolean {
  const s = deps.getTutorialStep();
  return s === 'prompt-forward' || s === 'prompt-switch';
}

/* ── Movement ── */

export function switchLane(deps: MovementDeps) {
  if (deps.getIsFalling()) return;

  const step = deps.getTutorialStep();
  // 튜토리얼 중 switch 를 허용하는 스텝만 통과
  if (step !== 'done' && step !== 'prompt-switch' && step !== 'free-play') return;

  const currentRow = deps.road.rows[deps.getCurrentRowIdx()];
  const canSwitch = !deps.getJustSwitched() && currentRow?.isTurn;

  if (!canSwitch) {
    if (isBattleMode()) {
      deps.onCrash('switch');
      return;
    }
    if (deps.getGodMode()) return;
    // 충돌 효과 + 떨어짐 애니 + onDeath 까지 단일 함수에서 처리
    const lane = deps.player.currentLane;
    const crashLane = lane < NUM_LANES - 1 ? lane + 1 : lane - 1;
    const bumpX = laneScreenX(deps, crashLane);
    deps.onCrash('switch', { bumpX });
    return;
  }

  const targetLane = currentRow.type;
  deps.playSfx('sfx-switch', 0.5);
  deps.player.switchTo(targetLane);
  deps.setJustSwitched(true);
  deps.setScore(deps.getScore() + 1);
  deps.hud.updateScore(deps.getScore());
  deps.hud.addTime(deps.getScore());

  const slowMove = isTutorialSlowMove(deps);
  const moveDur = slowMove ? 380 : 120;
  const faceDelay = slowMove ? 600 : 350;

  panViewTo(deps, calcViewLeft(deps, targetLane), moveDur);

  const targetScreenX = laneScreenX(deps, targetLane);
  deps.player.animateSwitch(targetScreenX, moveDur);

  deps.scene.time.delayedCall(faceDelay, () => {
    deps.player.faceNextTile(deps.player.currentLane);
  });

  if (step === 'prompt-switch' || step === 'free-play') deps.onTutorialAction('switch');
}

export function moveForward(deps: MovementDeps) {
  if (deps.getIsFalling()) return;

  const step = deps.getTutorialStep();
  // 튜토리얼 중 forward 를 허용하는 스텝만 통과
  if (step !== 'done' && step !== 'prompt-forward' && step !== 'free-play') return;

  const currentRow = deps.road.rows[deps.getCurrentRowIdx()];
  if (currentRow.isTurn && deps.player.currentLane !== currentRow.type) {
    deps.onCrash('forward');
    return;
  }

  const nextIdx = deps.getCurrentRowIdx() + 1;
  const nextRow = deps.road.rows[nextIdx];
  if (!nextRow) return;

  const canPass = nextRow.isTurn || nextRow.type === deps.player.currentLane;
  if (!canPass) {
    deps.onCrash('forward');
    return;
  }

  // 튜토리얼이 'done' 일 때만 타이머 돌림. 튜토리얼 중엔 finishTutorial에서 시작함.
  if (step === 'done' && !deps.hud.isTimerRunning()) {
    deps.hud.startTimer();
  }

  deps.playSfx('sfx-forward', 0.4);
  deps.setJustSwitched(false);
  deps.setCurrentRowIdx(nextIdx);
  deps.setScore(deps.getScore() + 1);
  deps.hud.updateScore(deps.getScore());
  deps.hud.addTime(deps.getScore());

  while (deps.road.rows.length - deps.getCurrentRowIdx() < 15) {
    deps.road.addNextRow();
  }

  // 코인 수집 — 잔액만 충전. 점수/시간엔 영향 없음.
  if (nextRow.coin && !nextRow.coinCollected) {
    nextRow.coinCollected = true;
    const coin = nextRow.coin;
    deps.scene.tweens.killTweensOf(coin);
    if (!isBattleMode()) {
      deps.playSfx('sfx-coin', 0.5);
      storage.addNum('coins', 1);
      storage.recordCoinEarned(1);
      deps.incrementCoinsEarnedThisGame();
    }
    deps.scene.tweens.add({
      targets: coin,
      y: coin.y - deps.tileH * 0.6,
      scale: coin.scale * 1.6,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => coin.destroy(),
    });
  }

  const slowMove = step === 'prompt-forward';
  const scrollDur = slowMove ? 380 : 100;
  // 튜토리얼 step 은 애니메이션 시작 후 'transition' 으로 전환 (slowMove 계산 후에 호출)
  if (step === 'prompt-forward' || step === 'free-play') deps.onTutorialAction('forward');
  deps.player.animateForward(scrollDur, () => scrollToCurrentRow(deps, scrollDur));

  deps.setCurrentRowIdx(deps.road.cleanupOldRows(deps.getCurrentRowIdx()));
}
