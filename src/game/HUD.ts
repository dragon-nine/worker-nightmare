import Phaser from 'phaser';
import { MAX_TIME, START_TIME } from './constants';

export class HUD {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private gaugeFull!: Phaser.GameObjects.Image;
  private gaugeFullW = 0;
  private gaugeFullH = 0;
  private pauseIcon!: Phaser.GameObjects.Image;
  private timerRunning = false;
  private decayRate = 1;
  private pauseOverlay?: Phaser.GameObjects.Rectangle;
  private pauseText?: Phaser.GameObjects.Text;
  private pauseMenuItems: Phaser.GameObjects.GameObject[] = [];

  private barW = 0;

  timeLeft = START_TIME;
  paused = false;

  private bgmMuted = false;
  private sfxMuted = false;

  private onTimeUp: () => void;
  private warningPlayed = false;

  constructor(scene: Phaser.Scene, onTimeUp: () => void) {
    this.scene = scene;
    this.onTimeUp = onTimeUp;
  }

  create(width: number) {
    const sidePadding = 16;
    const topPadding = 15;
    const gap = 10; // 게이지바 ↔ pause 간격

    // 먼저 게이지바 높이를 계산하고, pause는 그보다 1.4배 크게
    const tempBarW = width - sidePadding * 2 - 100; // 대략적 너비로 높이 산출
    const barH = Math.round(tempBarW * (61 / 392));
    const pauseBtnSize = Math.round(barH * 1.4);

    // 게이지바 실제 너비 = 전체 - 양쪽패딩 - pause - gap
    this.barW = width - sidePadding * 2 - pauseBtnSize - gap;
    const barCenterX = sidePadding + this.barW / 2;
    const hudY = topPadding + pauseBtnSize / 2; // pause 기준 수직 중앙

    // 빈 게이지 (배경)
    this.scene.add.image(barCenterX, hudY, 'gauge-empty')
      .setDisplaySize(this.barW, barH).setDepth(200);

    // 꽉찬 게이지 (crop으로 줄어듦)
    this.gaugeFull = this.scene.add.image(sidePadding, hudY - barH / 2, 'gauge-full')
      .setOrigin(0, 0).setDisplaySize(this.barW, barH).setDepth(201);
    this.gaugeFullW = this.gaugeFull.texture.getSourceImage().width;
    this.gaugeFullH = this.gaugeFull.texture.getSourceImage().height;

    // ── 일시정지 버튼 (게이지바보다 약간 크게, 수직 중앙 정렬) ──
    const pauseX = width - sidePadding - pauseBtnSize / 2;
    this.pauseIcon = this.scene.add.image(pauseX, hudY, 'btn-pause')
      .setDisplaySize(pauseBtnSize, pauseBtnSize)
      .setDepth(201)
      .setInteractive({ useHandCursor: true });

    this.pauseIcon.on('pointerdown', () => this.togglePause());

    // ── 블럭 카운트 ──
    this.scoreText = this.scene.add.text(width / 2, hudY + 28, '0', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '90px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
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
    this.timerRunning = true;
    this.decayRate = 1;
  }

  stopTimer() {
    this.timerRunning = false;
  }

  /** BGM 뮤트 상태 확인 */
  isBgmMuted() {
    return this.bgmMuted;
  }

  /** 효과음이 뮤트 상태인지 확인 */
  isSfxMuted() {
    return this.sfxMuted;
  }

  /** 매 프레임 호출 — 부드러운 게이지 감소 */
  update(delta: number) {
    if (!this.timerRunning || this.paused) return;

    const dt = delta / 1000; // ms → sec
    this.timeLeft -= dt * this.decayRate;
    this.decayRate += dt * 0.02; // 서서히 가속

    // Timer warning sound
    if (this.timeLeft <= 3 && this.timeLeft > 0 && !this.warningPlayed) {
      this.warningPlayed = true;
      if (!this.sfxMuted) try { this.scene.sound.play('sfx-timer-warning', { volume: 0.5 }); } catch { /* 무시 */ }
    } else if (this.timeLeft > 3) {
      this.warningPlayed = false;
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.timerRunning = false;
      this.updateTimerBar();
      this.onTimeUp();
      return;
    }

    this.updateTimerBar();
  }

  private updateTimerBar() {
    const pct = Math.max(0, this.timeLeft / MAX_TIME);
    const cropW = Math.max(0, Math.round(this.gaugeFullW * pct));
    this.gaugeFull.setCrop(0, 0, cropW, this.gaugeFullH);
  }

  togglePause() {
    if (!this.sfxMuted) try { this.scene.sound.play('sfx-click', { volume: 0.5 }); } catch { /* 무시 */ }
    const { width, height } = this.scene.scale;

    if (!this.paused) {
      this.paused = true;
      this.scene.time.paused = true;
      this.scene.tweens.pauseAll();

      this.pauseOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
        .setDepth(500).setInteractive();

      this.pauseText = this.scene.add.text(width / 2, height * 0.38, '일시정지', {
        fontFamily: 'GMarketSans, sans-serif', fontSize: '36px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(501);

      // ── 배경음악 토글 ──
      const bgmBtn = this.scene.add.rectangle(width / 2, height * 0.50, 220, 48, 0x333355)
        .setStrokeStyle(2, 0x6666aa).setDepth(501)
        .setInteractive({ useHandCursor: true });
      const bgmLabel = this.scene.add.text(width / 2, height * 0.50,
        `배경음악  ${this.bgmMuted ? 'OFF' : 'ON'}`, {
        fontFamily: 'GMarketSans, sans-serif', fontSize: '18px', color: this.bgmMuted ? '#ff6666' : '#66ff66',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(502);

      bgmBtn.on('pointerdown', () => {
        this.bgmMuted = !this.bgmMuted;
        this.scene.sound.getAll('bgm-gameplay').forEach(s => {
          (s as Phaser.Sound.WebAudioSound).setMute(this.bgmMuted);
        });
        bgmLabel.setText(`배경음악  ${this.bgmMuted ? 'OFF' : 'ON'}`);
        bgmLabel.setColor(this.bgmMuted ? '#ff6666' : '#66ff66');
        if (!this.sfxMuted) try { this.scene.sound.play('sfx-click', { volume: 0.5 }); } catch { /* 무시 */ }
      });

      // ── 효과음 토글 ──
      const sfxBtn = this.scene.add.rectangle(width / 2, height * 0.58, 220, 48, 0x333355)
        .setStrokeStyle(2, 0x6666aa).setDepth(501)
        .setInteractive({ useHandCursor: true });
      const sfxLabel = this.scene.add.text(width / 2, height * 0.58,
        `효과음  ${this.sfxMuted ? 'OFF' : 'ON'}`, {
        fontFamily: 'GMarketSans, sans-serif', fontSize: '18px', color: this.sfxMuted ? '#ff6666' : '#66ff66',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(502);

      sfxBtn.on('pointerdown', () => {
        this.sfxMuted = !this.sfxMuted;
        sfxLabel.setText(`효과음  ${this.sfxMuted ? 'OFF' : 'ON'}`);
        sfxLabel.setColor(this.sfxMuted ? '#ff6666' : '#66ff66');
        if (!this.sfxMuted) try { this.scene.sound.play('sfx-click', { volume: 0.5 }); } catch { /* 무시 */ }
      });

      // ── 계속하기 안내 ──
      const resumeHint = this.scene.add.text(width / 2, height * 0.68, '화면을 터치하면 계속합니다', {
        fontFamily: 'GMarketSans, sans-serif', fontSize: '14px', color: '#777799',
      }).setOrigin(0.5).setDepth(501);

      this.pauseMenuItems = [bgmBtn, bgmLabel, sfxBtn, sfxLabel, resumeHint];

      this.pauseOverlay.on('pointerdown', () => this.togglePause());
      this.pauseIcon.setAlpha(0.5);
    } else {
      this.paused = false;
      this.scene.time.paused = false;
      this.scene.tweens.resumeAll();

      this.pauseOverlay?.destroy();
      this.pauseText?.destroy();
      this.pauseMenuItems.forEach(item => item.destroy());
      this.pauseMenuItems = [];
      this.pauseOverlay = undefined;
      this.pauseText = undefined;
      this.pauseIcon.setAlpha(1);
    }
  }
}
