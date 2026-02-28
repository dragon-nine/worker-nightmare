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

    // 결과 이모지 — 빠른 등장
    const emoji = this.add.text(width / 2, height * 0.28, success ? '🎉' : '💀', {
      fontSize: '80px',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: emoji, scale: 1, duration: 400, ease: 'Back.easeOut',
    });

    // 결과 텍스트
    this.add.text(width / 2, height * 0.5, success ? '성공!' : '실패...', {
      fontFamily: 'sans-serif', fontSize: '48px',
      color: success ? '#00b894' : '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 서브 텍스트 — 실패해도 하루는 계속된다
    const subMsg = success
      ? '그래, 이 정도면...'
      : '어쨌든 하루는 계속된다...';
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

    // 자동 진행 (2초 후)
    this.time.delayedCall(2000, () => {
      GameManager.advanceStage();

      if (GameManager.currentStageIndex >= 10) {
        // 모든 스테이지 완료 → 엔딩
        this.scene.start('EndingScene');
      } else {
        // 다음 내러티브로
        this.scene.start('NarrativeScene');
      }
    });

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
