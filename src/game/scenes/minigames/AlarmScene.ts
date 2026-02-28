import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지1: 알람 0.1초 컷
 * - 어두운 화면에서 잠자는 중
 * - 랜덤 딜레이 후 알람이 울림
 * - 0.5초 이내 터치 = 성공
 */
export class AlarmScene extends Phaser.Scene {
  private stageId = 0;
  private alarmActive = false;
  private alarmTime = 0;
  private ended = false;

  constructor() {
    super({ key: 'AlarmScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.alarmActive = false;
    this.ended = false;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a14');

    // 자는 중 표시
    const zzz = this.add.text(width / 2, height * 0.3, 'z Z z', {
      fontFamily: 'sans-serif', fontSize: '72px', color: '#222244',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: zzz, y: height * 0.25, alpha: 0.3,
      duration: 1500, yoyo: true, repeat: -1,
    });

    this.add.text(width / 2, height * 0.55, '알람이 울리면\n즉시 터치!', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#444466',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.7, '(너무 빨리 누르면 실패!)', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#333355',
    }).setOrigin(0.5);

    // 랜덤 딜레이 후 알람
    const delay = Phaser.Math.Between(2000, 4500);
    this.time.delayedCall(delay, () => this.triggerAlarm());

    // 터치 핸들러
    this.input.on('pointerdown', () => {
      if (this.ended) return;
      if (!this.alarmActive) {
        this.showTooEarly();
        return;
      }
      const reaction = Date.now() - this.alarmTime;
      this.endGame(reaction <= 500, reaction);
    });

    emitGameState({ scene: 'AlarmScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared, stress: GameManager.stress });
  }

  private triggerAlarm() {
    if (this.ended) return;
    this.alarmActive = true;
    this.alarmTime = Date.now();

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#ff1a1a');

    this.add.text(width / 2, height * 0.25, '⏰', { fontSize: '120px' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.55, '지금!!', {
      fontFamily: 'sans-serif', fontSize: '56px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 카메라 흔들림
    this.cameras.main.shake(2000, 0.01);

    // 2초 후 자동 실패
    this.time.delayedCall(2000, () => {
      if (this.alarmActive && !this.ended) {
        this.endGame(false);
      }
    });
  }

  private showTooEarly() {
    const { width, height } = this.scale;
    this.ended = true;

    this.add.text(width / 2, height * 0.8, '아직 안 울렸어요!', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ff6666', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(1000, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: false });
    });
  }

  private endGame(success: boolean, reactionMs?: number) {
    this.ended = true;
    this.alarmActive = false;

    const { width, height } = this.scale;

    if (success && reactionMs !== undefined) {
      this.cameras.main.setBackgroundColor('#0d2818');
      this.add.text(width / 2, height * 0.75, `반응속도: ${reactionMs}ms`, {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#00b894', fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    this.time.delayedCall(1200, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }
}
