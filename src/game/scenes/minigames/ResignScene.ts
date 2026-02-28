import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지10: 사직서 던지기
 * 하드코딩 Y값 비율 기반으로 재계산, 파워 공식 재조정
 */
export class ResignScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;
  private phase: 'ready' | 'aiming' | 'flying' | 'done' = 'ready';
  private power = 0;
  private powerDir = 1;
  private attempts = 0;
  private maxAttempts = 3;
  private powerBar!: Phaser.GameObjects.Rectangle;
  private letter!: Phaser.GameObjects.Text;
  private attemptText!: Phaser.GameObjects.Text;

  // 타겟 파워: 45~65
  private targetMin = 45;
  private targetMax = 65;

  constructor() {
    super({ key: 'ResignScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.phase = 'ready';
    this.power = 0;
    this.powerDir = 1;
    this.attempts = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#f5f0eb');

    // 상단 바
    this.add.text(width / 2, height * 0.06, '📝 사직서 던지기', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#1a1a1a', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.attemptText = this.add.text(width * 0.85, height * 0.06, `${this.attempts} / ${this.maxAttempts}`, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#888888',
    }).setOrigin(0.5);

    // 상사 책상 (타겟) - 비율 기반
    const deskY = height * 0.28;
    this.add.rectangle(width / 2, deskY, 160, 50, 0x8d6e63)
      .setStrokeStyle(2, 0x5d4037);
    this.add.text(width / 2, deskY - 22, '🤵 상사', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#666666',
    }).setOrigin(0.5);
    this.add.text(width / 2, deskY, '📋 책상', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);

    // 사직서 — 비율 기반
    const letterStartY = height * 0.65;
    this.letter = this.add.text(width / 2, letterStartY, '📄', {
      fontSize: '48px',
    }).setOrigin(0.5);

    // 파워 게이지 — 하단 비율 기반
    const barY = height * 0.85;
    const barW = 400;
    this.add.rectangle(width / 2, barY, barW, 32, 0xdddddd).setStrokeStyle(2, 0x999999);

    // 타겟 존 표시 on gauge
    const gaugeLeft = width / 2 - barW / 2;
    const gaugeW = barW - 4;
    const targetX = gaugeLeft + gaugeW * (this.targetMin / 100);
    const targetW = gaugeW * ((this.targetMax - this.targetMin) / 100);
    this.add.rectangle(targetX + targetW / 2, barY, targetW, 28, 0x00b894, 0.4);

    this.powerBar = this.add.rectangle(gaugeLeft + 2, barY, 4, 28, 0xe94560)
      .setOrigin(0, 0.5);

    this.add.text(width / 2, barY + 28, '터치하여 파워 결정!', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#666666',
    }).setOrigin(0.5);

    // 파워 게이지 움직임
    this.phase = 'aiming';

    // 터치 핸들러
    this.input.on('pointerdown', () => this.onTap());

    emitGameState({ scene: 'ResignScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared, stress: GameManager.stress });
  }

  update() {
    if (this.phase !== 'aiming') return;

    // 파워 게이지 왕복
    this.power += this.powerDir * 1.5;
    if (this.power >= 100) { this.power = 100; this.powerDir = -1; }
    if (this.power <= 0) { this.power = 0; this.powerDir = 1; }

    const gaugeW = 396;
    this.powerBar.width = Math.max(4, gaugeW * (this.power / 100));
  }

  private onTap() {
    if (this.ended) return;
    if (this.phase !== 'aiming') return;

    this.phase = 'flying';
    this.attempts++;
    this.attemptText.setText(`${this.attempts} / ${this.maxAttempts}`);

    const { height } = this.scale;

    // 사직서 날아가기 — 비율 기반 계산
    const letterStartY = height * 0.65;
    const deskY = height * 0.28;
    // 파워 55%일 때 정확히 책상에 도달
    const flyRange = letterStartY - (height * 0.1);
    const targetY = letterStartY - (this.power / 100) * flyRange;

    this.tweens.add({
      targets: this.letter,
      y: targetY,
      scale: 0.5 + (1 - this.power / 100) * 0.5,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => this.checkLanding(targetY, deskY),
    });
  }

  private checkLanding(landY: number, deskY: number) {
    const { width, height } = this.scale;
    const success = Math.abs(landY - deskY) < 40;

    if (success) {
      this.ended = true;
      this.cameras.main.flash(300, 0, 184, 148);

      this.add.text(width / 2, height * 0.5, '사직서 접수 완료!', {
        fontFamily: 'sans-serif', fontSize: '28px', color: '#00b894', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.time.delayedCall(1200, () => {
        this.scene.start('ResultScene', { stageId: this.stageId, success: true });
      });
    } else {
      const msg = landY > deskY + 40 ? '너무 가까이...' : '너무 멀리...';
      const missText = this.add.text(width / 2, height * 0.5, msg, {
        fontFamily: 'sans-serif', fontSize: '20px', color: '#e94560',
      }).setOrigin(0.5);

      if (this.attempts >= this.maxAttempts) {
        this.ended = true;
        this.time.delayedCall(1000, () => {
          this.scene.start('ResultScene', { stageId: this.stageId, success: false });
        });
      } else {
        const letterStartY = height * 0.65;
        this.time.delayedCall(800, () => {
          missText.destroy();
          this.letter.y = letterStartY;
          this.letter.setScale(1);
          this.power = 0;
          this.powerDir = 1;
          this.phase = 'aiming';
        });
      }
    }
  }
}
