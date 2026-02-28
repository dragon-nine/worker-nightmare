import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import { emitGameState } from '../GameBridge';

interface IntroData {
  stageId: number;
  stageName: string;
  stageEmoji: string;
  minigameName: string;
  minigameDesc: string;
  minigameSceneKey: string;
}

export class MinigameIntroScene extends Phaser.Scene {
  private introData!: IntroData;

  constructor() {
    super({ key: 'MinigameIntroScene' });
  }

  init(data: IntroData) {
    this.introData = data;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // 스테이지 번호
    this.add.text(width / 2, height * 0.18, `STAGE ${this.introData.stageId}`, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#e94560',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5);

    // 스테이지 이름
    this.add.text(width / 2, height * 0.28, `${this.introData.stageEmoji} ${this.introData.stageName}`, {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#888899',
    }).setOrigin(0.5);

    // 미니게임 이름 (큰 글씨)
    const title = this.add.text(width / 2, height * 0.44, this.introData.minigameName, {
      fontFamily: 'sans-serif', fontSize: '42px', color: '#ffffff',
      fontStyle: 'bold', align: 'center',
      wordWrap: { width: width - 100 },
    }).setOrigin(0.5).setAlpha(0);

    // 미니게임 설명
    const desc = this.add.text(width / 2, height * 0.58, this.introData.minigameDesc, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#aaaacc',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // 등장 애니메이션
    this.tweens.add({ targets: title, alpha: 1, y: height * 0.42, duration: 400, ease: 'Back.easeOut' });
    this.tweens.add({ targets: desc, alpha: 1, duration: 400, delay: 200 });

    // 카운트다운
    const countText = this.add.text(width / 2, height * 0.76, '', {
      fontFamily: 'sans-serif', fontSize: '80px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5);

    let count = 3;
    this.time.delayedCall(800, () => {
      countText.setText(`${count}`);
      this.tweens.add({ targets: countText, scale: 1.3, duration: 150, yoyo: true });

      this.time.addEvent({
        delay: 700,
        repeat: 2,
        callback: () => {
          count--;
          if (count > 0) {
            countText.setText(`${count}`);
            this.tweens.add({ targets: countText, scale: 1.3, duration: 150, yoyo: true });
          } else {
            countText.setText('GO!');
            countText.setColor('#00b894');
            this.tweens.add({ targets: countText, scale: 2, alpha: 0, duration: 300 });
            this.time.delayedCall(300, () => {
              this.scene.start(this.introData.minigameSceneKey, { stageId: this.introData.stageId });
            });
          }
        },
      });
    });

    emitGameState({ scene: 'MinigameIntroScene', stageId: this.introData.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared });
  }
}
