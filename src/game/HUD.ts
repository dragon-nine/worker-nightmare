import Phaser from 'phaser';
import { MAX_TIME, START_TIME, TICK_INTERVAL_START, TICK_INTERVAL_MIN, TICK_ACCEL } from './constants';

export class HUD {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private timerFill!: Phaser.GameObjects.Rectangle;
  private pauseIcon!: Phaser.GameObjects.Text;
  private pauseOverlay?: Phaser.GameObjects.Rectangle;
  private pauseText?: Phaser.GameObjects.Text;

  private barW = 0;

  timeLeft = START_TIME;
  tickInterval = TICK_INTERVAL_START;
  tickTimer?: Phaser.Time.TimerEvent;
  paused = false;

  private onTimeUp: () => void;
  private warningPlayed = false;

  constructor(scene: Phaser.Scene, onTimeUp: () => void) {
    this.scene = scene;
    this.onTimeUp = onTimeUp;
  }

  create(width: number) {
    const hudY = 30;
    const pauseBtnSize = 36;

    // ── 게이지 바 ──
    const barRight = width - pauseBtnSize - 24;
    this.barW = barRight - 14;
    const barCenterX = 14 + this.barW / 2;

    this.scene.add.rectangle(barCenterX, hudY, this.barW, 24, 0x333333, 0.8)
      .setStrokeStyle(2, 0x555555).setDepth(200);

    this.timerFill = this.scene.add.rectangle(
      barCenterX, hudY, this.barW - 6, 18, 0x44cc44, 1,
    ).setDepth(201);

    // ── 일시정지 버튼 ──
    const pauseX = width - pauseBtnSize / 2 - 10;
    const pauseBg = this.scene.add.rectangle(pauseX, hudY, pauseBtnSize, pauseBtnSize, 0x000000, 0.7)
      .setStrokeStyle(2, 0xffffff).setDepth(200)
      .setInteractive({ useHandCursor: true });
    this.pauseIcon = this.scene.add.text(pauseX, hudY, '⏸', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(201);

    pauseBg.on('pointerdown', () => this.togglePause());

    // ── 블럭 카운트 ──
    this.scoreText = this.scene.add.text(width / 2, hudY + 28, '0', {
      fontFamily: 'monospace', fontSize: '90px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(201);
  }

  updateScore(score: number) {
    this.scoreText.setText(`${score}`);
  }

  addTime(sec: number) {
    this.timeLeft = Math.min(MAX_TIME, this.timeLeft + sec);
    this.updateTimerBar();
  }

  /** 타이머 시작 (첫 액션 시 호출) */
  startTimer() {
    this.scheduleNextTick();
  }

  stopTimer() {
    this.tickTimer?.remove();
  }

  private updateTimerBar() {
    const pct = this.timeLeft / MAX_TIME;
    const fillW = (this.barW - 6) * pct;
    this.timerFill.setDisplaySize(Math.max(0, fillW), 18);
    this.timerFill.x = 14 + 3 + Math.max(0, fillW) / 2;
    this.timerFill.setFillStyle(this.timeLeft <= 3 ? 0xff4444 : 0x44cc44);

    // Timer warning sound
    if (this.timeLeft <= 3 && this.timeLeft > 0 && !this.warningPlayed) {
      this.warningPlayed = true;
      this.scene.sound.play('sfx-timer-warning', { volume: 0.5 });
    } else if (this.timeLeft > 3) {
      this.warningPlayed = false;
    }
  }

  private scheduleNextTick() {
    this.tickTimer = this.scene.time.delayedCall(this.tickInterval, () => {
      if (this.paused) { this.scheduleNextTick(); return; }

      this.timeLeft--;
      this.updateTimerBar();
      this.tickInterval = Math.max(TICK_INTERVAL_MIN, this.tickInterval - TICK_ACCEL);

      if (this.timeLeft <= 0) { this.onTimeUp(); return; }
      this.scheduleNextTick();
    });
  }

  togglePause() {
    this.scene.sound.play('sfx-click', { volume: 0.5 });
    const { width, height } = this.scene.scale;

    if (!this.paused) {
      this.paused = true;
      this.scene.time.paused = true;
      this.scene.tweens.pauseAll();

      this.pauseOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
        .setDepth(500).setInteractive();
      this.pauseText = this.scene.add.text(width / 2, height / 2, '일시정지', {
        fontFamily: 'sans-serif', fontSize: '36px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(501);

      this.pauseOverlay.on('pointerdown', () => this.togglePause());
      this.pauseIcon.setText('▶');
    } else {
      this.paused = false;
      this.scene.time.paused = false;
      this.scene.tweens.resumeAll();

      this.pauseOverlay?.destroy();
      this.pauseText?.destroy();
      this.pauseOverlay = undefined;
      this.pauseText = undefined;
      this.pauseIcon.setText('⏸');
    }
  }
}
