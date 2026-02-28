import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지8: 모기 잡기
 * 전체 화면 활용, 이동 범위 확장
 */
export class MosquitoScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;
  private mosquito!: Phaser.GameObjects.Container;
  private missCount = 0;
  private maxMiss = 5;
  private missText!: Phaser.GameObjects.Text;
  private hitRadius = 60;

  constructor() {
    super({ key: 'MosquitoScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.missCount = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#12121e');

    // 조명 효과 (밝은 원)
    this.add.circle(width / 2, height * 0.4, 200, 0x1a1a30);

    this.add.text(width / 2, 30, '🌙 모기 잡기', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.missText = this.add.text(width * 0.15, 30, `남은 기회: ${this.maxMiss - this.missCount}`, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 시간 제한
    let timeLeft = 10;
    const timerText = this.add.text(width * 0.85, 30, `${timeLeft}s`, {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 모기
    this.mosquito = this.add.container(width / 2, height / 2);
    const body = this.add.circle(0, 0, 10, 0xffffff);
    const wingL = this.add.ellipse(-10, -6, 12, 8, 0xaaaaaa, 0.6);
    const wingR = this.add.ellipse(10, -6, 12, 8, 0xaaaaaa, 0.6);
    this.mosquito.add([wingL, wingR, body]);

    // 날개짓 애니메이션
    this.tweens.add({
      targets: [wingL, wingR], angle: { from: -15, to: 15 },
      duration: 80, yoyo: true, repeat: -1,
    });

    // 모기 이동 (넓은 범위)
    this.moveMosquito();
    this.time.addEvent({
      delay: 800, loop: true,
      callback: () => {
        if (!this.ended) this.moveMosquito();
      },
    });

    // 빙빙 패턴
    this.tweens.add({
      targets: this.mosquito,
      angle: { from: 0, to: 360 },
      duration: 3000, repeat: -1,
    });

    // 터치 핸들러
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.ended) return;

      const dist = Phaser.Math.Distance.Between(
        pointer.x, pointer.y, this.mosquito.x, this.mosquito.y
      );

      // 손바닥 이펙트
      const slapEmoji = this.add.text(pointer.x, pointer.y, '👋', {
        fontSize: '48px',
      }).setOrigin(0.5).setDepth(5);
      this.tweens.add({
        targets: slapEmoji, alpha: 0, scale: 1.5, duration: 300,
        onComplete: () => slapEmoji.destroy(),
      });

      if (dist <= this.hitRadius) {
        this.onCatch();
      } else {
        this.missCount++;
        this.missText.setText(`남은 기회: ${this.maxMiss - this.missCount}`);
        this.cameras.main.shake(50, 0.003);

        if (this.missCount >= this.maxMiss) {
          this.endGame(false);
        } else {
          this.moveMosquito();
        }
      }
    });

    this.time.addEvent({
      delay: 1000, repeat: 9,
      callback: () => {
        if (this.ended) return;
        timeLeft--;
        timerText.setText(`${timeLeft}s`);
        if (timeLeft <= 0) this.endGame(false);
      },
    });

    emitGameState({ scene: 'MosquitoScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared, stress: GameManager.stress });
  }

  private moveMosquito() {
    const { width, height } = this.scale;
    const margin = 50;
    const x = Phaser.Math.Between(margin, width - margin);
    const y = Phaser.Math.Between(70, height - 50);

    this.tweens.add({
      targets: this.mosquito, x, y,
      duration: Phaser.Math.Between(200, 500),
      ease: 'Sine.easeInOut',
    });
  }

  private onCatch() {
    this.ended = true;
    const { width, height } = this.scale;

    this.mosquito.setVisible(false);
    this.add.text(this.mosquito.x, this.mosquito.y, '💥', {
      fontSize: '56px',
    }).setOrigin(0.5);

    this.cameras.main.flash(200, 255, 100, 100);

    this.add.text(width / 2, height * 0.85, '잡았다!', {
      fontFamily: 'sans-serif', fontSize: '32px', color: '#00b894', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(1000, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: true });
    });
  }

  private endGame(success: boolean) {
    if (this.ended) return;
    this.ended = true;

    const { width, height } = this.scale;
    this.add.text(width / 2, height * 0.85, '모기가 도망갔다...', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(1200, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }
}
