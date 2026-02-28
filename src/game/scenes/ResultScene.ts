import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import { emitGameState } from '../GameBridge';

interface ResultData {
  stageId: number;
  success: boolean;
}

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData) {
    this.resultData = data;
  }

  create() {
    const { width, height } = this.scale;
    const success = this.resultData.success;

    if (success) {
      GameManager.clearStage(this.resultData.stageId);
    }

    // 배경
    this.cameras.main.setBackgroundColor(success ? '#0d2818' : '#2e0a0a');

    // 결과 이모지
    const emoji = this.add.text(width / 2, height * 0.25, success ? '🎉' : '💀', {
      fontSize: '90px',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: emoji, scale: 1, duration: 500, ease: 'Back.easeOut',
    });

    // 결과 텍스트
    this.add.text(width / 2, height * 0.48, success ? '성공!' : '실패...', {
      fontFamily: 'sans-serif', fontSize: '52px',
      color: success ? '#00b894' : '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 서브 텍스트
    const subMsg = success
      ? (GameManager.allCleared ? '모든 스테이지 클리어!' : `STAGE ${this.resultData.stageId} 클리어!`)
      : '다시 도전해보세요...';

    this.add.text(width / 2, height * 0.6, subMsg, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 버튼
    const btnY = height * 0.78;
    const btnLabel = success
      ? (GameManager.allCleared ? '엔딩 보기' : '다음으로')
      : '재도전';
    const btnColor = success ? 0x00b894 : 0xe94560;

    const btn = this.add.rectangle(width / 2, btnY, 280, 56, btnColor)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, btnY, btnLabel, {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      if (success && GameManager.allCleared) {
        this.scene.start('EndingScene');
      } else {
        this.scene.start('StageSelectScene');
      }
    });

    emitGameState({ scene: 'ResultScene', stageId: this.resultData.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared });
  }
}
