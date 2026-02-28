import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지7: 노트북 충전
 * - 배터리가 8%부터 줄어듦
 * - 충전 플러그가 화면을 돌아다님
 * - 플러그를 터치하면 성공
 * - 0%가 되면 실패
 */
export class ChargingScene extends Phaser.Scene {
  private stageId = 0;
  private battery = 8;
  private ended = false;
  private batteryText!: Phaser.GameObjects.Text;
  private batteryBar!: Phaser.GameObjects.Rectangle;
  private plug!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'ChargingScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.battery = 8;
    this.ended = false;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.add.text(width / 2, 40, '🔋 노트북 충전', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 70, '충전기를 잡으세요!', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#888899',
    }).setOrigin(0.5);

    // 배터리 표시
    this.add.rectangle(width / 2, 110, 200, 30, 0x333344).setStrokeStyle(2, 0x666688);
    this.batteryBar = this.add.rectangle(width / 2 - 97, 110, 0, 26, 0xff4444).setOrigin(0, 0.5);
    this.batteryText = this.add.text(width / 2, 110, `${this.battery}%`, {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 충전 플러그
    this.plug = this.add.container(width / 2, height / 2);
    const plugBody = this.add.rectangle(0, 0, 60, 35, 0xffffff)
      .setStrokeStyle(2, 0x00b894);
    const plugText = this.add.text(0, 0, '🔌', { fontSize: '24px' }).setOrigin(0.5);
    this.plug.add([plugBody, plugText]);
    this.plug.setSize(70, 45);
    this.plug.setInteractive({ useHandCursor: true });

    this.plug.on('pointerdown', () => {
      if (this.ended) return;
      this.ended = true;

      this.cameras.main.flash(300, 0, 184, 148);
      this.add.text(width / 2, height * 0.7, '충전 시작!', {
        fontFamily: 'sans-serif', fontSize: '28px', color: '#00b894', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.time.delayedCall(1000, () => {
        this.scene.start('ResultScene', { stageId: this.stageId, success: true });
      });
    });

    // 플러그 움직임
    this.movePlug();
    this.time.addEvent({
      delay: 1200, loop: true,
      callback: () => {
        if (this.ended) return;
        this.movePlug();
      },
    });

    // 배터리 감소 (1초마다 1%)
    this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        if (this.ended) return;
        this.battery--;
        this.updateBattery();
        if (this.battery <= 0) {
          this.ended = true;
          this.cameras.main.setBackgroundColor('#000000');
          this.add.text(width / 2, height / 2, '💀 전원 꺼짐', {
            fontFamily: 'sans-serif', fontSize: '28px', color: '#ff4444', fontStyle: 'bold',
          }).setOrigin(0.5);
          this.time.delayedCall(1200, () => {
            this.scene.start('ResultScene', { stageId: this.stageId, success: false });
          });
        }
      },
    });

    // 플러그 이동 속도 점점 빨라짐
    this.time.addEvent({
      delay: 2000, loop: true,
      callback: () => {
        if (this.ended) return;
        this.movePlug();
      },
    });

    emitGameState({ scene: 'ChargingScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared });
  }

  private movePlug() {
    const { width, height } = this.scale;
    const margin = 60;
    const newX = Phaser.Math.Between(margin, width - margin);
    const newY = Phaser.Math.Between(160, height - 120);

    // 배터리 낮을수록 빨리 이동
    const duration = Math.max(200, 600 - (8 - this.battery) * 50);

    this.tweens.add({
      targets: this.plug,
      x: newX, y: newY,
      duration,
      ease: 'Power2',
    });
  }

  private updateBattery() {
    const maxW = 194;
    this.batteryBar.width = maxW * (this.battery / 100);
    this.batteryText.setText(`${this.battery}%`);

    if (this.battery <= 3) {
      this.batteryBar.setFillStyle(0xff0000);
      this.cameras.main.shake(100, 0.003);
    } else if (this.battery <= 5) {
      this.batteryBar.setFillStyle(0xff4444);
    }
  }
}
