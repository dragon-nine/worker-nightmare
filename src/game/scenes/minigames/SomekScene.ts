import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지9: 소맥 비율
 * 좌(정보) / 중앙(맥주잔) / 우(게이지) 3존
 */
export class SomekScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;
  private pouring = false;
  private pourLevel = 0;
  private pourBar!: Phaser.GameObjects.Rectangle;
  private pourText!: Phaser.GameObjects.Text;
  private glassLiquid!: Phaser.GameObjects.Rectangle;
  private targetMin = 30;
  private targetMax = 40;

  constructor() {
    super({ key: 'SomekScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.pouring = false;
    this.pourLevel = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#2d1810');

    const leftX = width * 0.17;
    const centerX = width * 0.5;
    const rightX = width * 0.83;

    // 좌측: 정보
    this.add.text(leftX, height * 0.15, '🍺 소맥 비율', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(leftX, height * 0.3, '부장님 취향:\n3:7 황금비율!', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cc9966',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    this.pourText = this.add.text(leftX, height * 0.55, '0%', {
      fontFamily: 'sans-serif', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(leftX, height * 0.75, '꾹 누르고 있으면\n소주가 따라집니다\n적당할 때 놓으세요!', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#888866', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    // 중앙: 맥주잔
    const glassW = 120;
    const glassH = 280;
    const glassY = height * 0.45;

    // 잔 배경
    this.add.rectangle(centerX, glassY, glassW, glassH, 0x1a1200)
      .setStrokeStyle(3, 0xccaa66);

    // 맥주 (기본 채워짐 — 70% 수준)
    this.add.rectangle(centerX, glassY + glassH * 0.15, glassW - 6, glassH * 0.7, 0xffcc00)
      .setOrigin(0.5, 0);

    // 소주 (위에서 채워짐)
    this.glassLiquid = this.add.rectangle(
      centerX, glassY - glassH / 2 + 3, glassW - 6, 0, 0xf0f0e0
    ).setOrigin(0.5, 0);

    // 타겟 존 표시
    const zoneTop = glassY - glassH / 2 + glassH * (this.targetMin / 100);
    const zoneH = glassH * ((this.targetMax - this.targetMin) / 100);
    this.add.rectangle(centerX, zoneTop + zoneH / 2, glassW + 20, zoneH, 0x00ff88, 0.2)
      .setStrokeStyle(2, 0x00ff88);
    this.add.text(centerX + glassW / 2 + 25, zoneTop + zoneH / 2, '← 여기!', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#00ff88', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // 우측: 게이지 바
    const barH = glassH;
    this.add.rectangle(rightX, glassY, 24, barH, 0x333322).setStrokeStyle(1, 0x666644);

    // 타겟 존 게이지에도 표시
    this.add.rectangle(rightX, zoneTop + zoneH / 2, 28, zoneH, 0x00ff88, 0.4);

    this.pourBar = this.add.rectangle(rightX, glassY + barH / 2, 20, 0, 0xf0f0e0)
      .setOrigin(0.5, 1);

    // 입력
    this.input.on('pointerdown', () => {
      if (this.ended) return;
      this.pouring = true;
    });

    this.input.on('pointerup', () => {
      if (this.ended || !this.pouring) return;
      this.pouring = false;
      this.checkResult();
    });

    // 따르기 업데이트
    this.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        if (!this.pouring || this.ended) return;
        this.pourLevel = Math.min(100, this.pourLevel + 1.2);
        this.updatePour(glassH, barH);

        if (this.pourLevel >= 100) {
          this.pouring = false;
          this.checkResult();
        }
      },
    });

    emitGameState({ scene: 'SomekScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared, stress: GameManager.stress });
  }

  private updatePour(glassH: number, barH: number) {
    this.glassLiquid.height = glassH * (this.pourLevel / 100);
    this.pourBar.height = barH * (this.pourLevel / 100);
    this.pourText.setText(`${Math.floor(this.pourLevel)}%`);
  }

  private checkResult() {
    this.ended = true;
    const { width, height } = this.scale;
    const success = this.pourLevel >= this.targetMin && this.pourLevel <= this.targetMax;

    let msg: string;
    if (this.pourLevel < this.targetMin) {
      msg = '너무 적어요... 부장님 불만';
    } else if (this.pourLevel > this.targetMax) {
      msg = '너무 많아요... 소주잔이야 이건';
    } else {
      msg = '황금 비율! 부장님 감동!';
    }

    this.add.text(width / 2, height * 0.95, msg, {
      fontFamily: 'sans-serif', fontSize: '22px',
      color: success ? '#00b894' : '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }
}
