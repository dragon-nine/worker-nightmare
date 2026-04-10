import { MAX_TIME, START_TIME } from './constants';
import { gameBus } from './event-bus';
import { storage } from './services/storage';

/**
 * HUD 로직 전용 — 렌더링은 React GameplayHUD에서 담당
 * Phaser 씬에서 타이머/점수 로직만 관리하고 이벤트로 React에 전달
 */
export class HUD {
  private scene: Phaser.Scene;
  private timerRunning = false;
  elapsed = 0;

  timeLeft = START_TIME;
  paused = false;

  private bgmMuted = storage.getBool('bgmMuted');
  private sfxMuted = storage.getBool('sfxMuted');

  private onTimeUp: () => void;
  private warningPlayed = false;
  private currentScore = 0;
  private lastEmittedPct = -1;

  constructor(scene: Phaser.Scene, onTimeUp: () => void) {
    this.scene = scene;
    this.onTimeUp = onTimeUp;
  }

  create() {
    // React에서 토글 변경 시 반영
    const unsubToggleBgm = gameBus.on('toggle-bgm', () => {
      this.bgmMuted = storage.getBool('bgmMuted');
    });
    const unsubToggleSfx = gameBus.on('toggle-sfx', () => {
      this.sfxMuted = storage.getBool('sfxMuted');
    });

    // React HUD에서 일시정지 버튼 클릭
    const unsubPause = gameBus.on('action-pause', () => {
      this.togglePause();
    });

    this.scene.events.on('shutdown', () => {
      unsubToggleBgm();
      unsubToggleSfx();
      unsubPause();
    });

    // 초기 상태 전송
    gameBus.emit('score-update', 0);
    gameBus.emit('timer-update', 1);
  }

  updateScore(score: number) {
    this.currentScore = score;
    gameBus.emit('score-update', score);
  }

  addTime() {
    const bonus = Math.max(0.2, 0.4 - (this.elapsed / 60) * 0.2);
    this.timeLeft = Math.min(MAX_TIME, this.timeLeft + bonus);
    this.emitTimer();
  }

  startTimer() {
    // god mode removed for production
    this.timerRunning = true;
  }
  stopTimer() { this.timerRunning = false; }
  isTimerRunning() { return this.timerRunning; }
  isBgmMuted() { return this.bgmMuted; }
  isSfxMuted() { return this.sfxMuted; }

  update(delta: number) {
    if (!this.timerRunning || this.paused) return;

    // delta cap (250ms) — 백그라운드 복귀, GC, RAF jitter 등으로 인한 spiral of death 방지.
    // 부활 광고 직후 첫 프레임 delta가 광고 길이만큼 폭주해서 즉사하는 버그 방지가 주 목적.
    const cappedDelta = Math.min(delta, 250);
    const dt = cappedDelta / 1000;
    this.elapsed += dt;
    this.timeLeft -= dt;

    if (this.timeLeft <= 3 && this.timeLeft > 0 && !this.warningPlayed) {
      this.warningPlayed = true;
      if (!this.sfxMuted) try { this.scene.sound.play('sfx-timer-warning', { volume: 0.5 }); } catch { /* 무시 */ }
    } else if (this.timeLeft > 3) {
      this.warningPlayed = false;
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.timerRunning = false;
      this.emitTimer();
      this.onTimeUp();
      return;
    }

    this.emitTimer();
  }

  updateTimerBar() {
    this.emitTimer();
  }

  private emitTimer() {
    const pct = Math.max(0, this.timeLeft / MAX_TIME);
    // 1% 단위로만 emit → 5초 동안 100번 (초당 ~20번)
    const rounded = Math.round(pct * 100) / 100;
    if (rounded === this.lastEmittedPct) return;
    this.lastEmittedPct = rounded;
    gameBus.emit('timer-update', rounded);
  }

  togglePause() {
    if (!this.sfxMuted) try { this.scene.sound.play('sfx-click', { volume: 0.5 }); } catch { /* 무시 */ }

    if (!this.paused) {
      this.paused = true;
      this.scene.time.paused = true;
      this.scene.tweens.pauseAll();
      gameBus.emit('screen-change', 'paused');
    } else {
      this.paused = false;
      this.scene.time.paused = false;
      this.scene.tweens.resumeAll();
      gameBus.emit('screen-change', 'playing');
      // GameplayHUD 재마운트 후 useEffect 등록 대기 → 점수/타이머 재전송
      requestAnimationFrame(() => {
        gameBus.emit('score-update', this.currentScore);
        this.emitTimer();
      });
    }
  }
}
