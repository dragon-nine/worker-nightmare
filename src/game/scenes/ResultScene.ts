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

    // 결과 기록
    GameManager.recordResult(this.resultData.stageId, success);

    // 배경
    this.cameras.main.setBackgroundColor(success ? '#0d2818' : '#2e0a0a');

    // 결과 이모지
    const emoji = this.add.text(width / 2, height * 0.28, success ? '🎉' : '💀', {
      fontSize: '80px',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: emoji, scale: 1, duration: 400, ease: 'Back.easeOut',
    });

    // 결과 텍스트
    this.add.text(width / 2, height * 0.5, success ? '성공!' : 'GAME OVER', {
      fontFamily: 'sans-serif', fontSize: '48px',
      color: success ? '#00b894' : '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 서브 텍스트
    const subMsg = success
      ? '그래, 이 정도면...'
      : '처음부터 다시...';
    this.add.text(width / 2, height * 0.62, subMsg, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // 스트레스 표시
    const stressMsg = success ? 'Stress +5' : 'Stress +15';
    const stressColor = success ? '#888888' : '#e94560';
    const stressText = this.add.text(width / 2, height * 0.72, stressMsg, {
      fontFamily: 'sans-serif', fontSize: '16px', color: stressColor,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: stressText, alpha: 1, duration: 300, delay: 400 });

    if (success) {
      // 성공 → 다음 스테이지로
      this.time.delayedCall(2000, () => {
        GameManager.advanceStage();

        if (GameManager.currentStageIndex >= 10) {
          this.scene.start('EndingScene');
        } else {
          this.scene.start('NarrativeScene');
        }
      });
    } else {
      // 실패 → 처음부터 재시작
      this.time.delayedCall(2500, () => {
        GameManager.reset();
        this.scene.start('BootScene');
      });
    }

    const stage = GameManager.getCurrentStage();
    emitGameState({
      scene: 'ResultScene',
      stageId: this.resultData.stageId,
      progress: GameManager.progress,
      allCleared: GameManager.allCleared,
      stress: GameManager.stress,
      time: stage.time,
      period: stage.period,
      successCount: GameManager.successCount,
    });
  }
}
