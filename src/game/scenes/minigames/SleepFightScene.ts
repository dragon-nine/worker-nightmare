import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지4: 졸음 참기
 * 상단 바(타이틀+타이머), 중앙(눈), 하단(게이지)
 */
export class SleepFightScene extends Phaser.Scene {
  private stageId = 0;
  private drowsiness = 0;
  private ended = false;
  private gaugeBar!: Phaser.GameObjects.Rectangle;
  private gaugeText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private eyeTop!: Phaser.GameObjects.Ellipse;
  private eyeBottom!: Phaser.GameObjects.Ellipse;
  private surviveTime = 12;
  private eyeY = 0;

  constructor() {
    super({ key: 'SleepFightScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.drowsiness = 0;
    this.ended = false;
    this.surviveTime = 12;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#e8eaf6');

    // 상단 바
    this.add.text(width * 0.25, 30, '😴 졸음 참기', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#1a1a1a', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.timeText = this.add.text(width * 0.75, 30, `회의 종료까지: ${this.surviveTime}초`, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 60, '터치해서 졸음을 깨세요!', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#666666',
    }).setOrigin(0.5);

    // 중앙: 눈 표현
    this.eyeY = height * 0.42;
    // 흰자
    this.add.ellipse(width / 2, this.eyeY, 220, 120, 0xffffff).setStrokeStyle(3, 0x333333);
    // 동공
    this.add.circle(width / 2, this.eyeY, 30, 0x1a1a1a);
    // 눈꺼풀 (위에서 내려옴)
    this.eyeTop = this.add.ellipse(width / 2, this.eyeY - 60, 226, 120, 0xe8eaf6);
    this.eyeBottom = this.add.ellipse(width / 2, this.eyeY + 60, 226, 120, 0xe8eaf6);

    // 하단: 졸음 게이지
    const gaugeX = width / 2;
    const gaugeY = height * 0.78;
    this.add.rectangle(gaugeX, gaugeY, 400, 28, 0xdddddd).setStrokeStyle(2, 0x999999);
    this.gaugeBar = this.add.rectangle(gaugeX - 198, gaugeY, 0, 24, 0xff4444).setOrigin(0, 0.5);

    this.gaugeText = this.add.text(gaugeX, gaugeY + 25, '졸음: 0%', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#666666',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.93, '👆 화면을 연타하세요!', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#3182f6', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 졸음 증가 (매 100ms)
    this.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        if (this.ended) return;
        const speed = 1.2 + (12 - this.surviveTime) * 0.15;
        this.drowsiness = Math.min(100, this.drowsiness + speed);
        this.updateGauge();
        if (this.drowsiness >= 100) this.endGame(false);
      },
    });

    // 생존 타이머
    this.time.addEvent({
      delay: 1000, repeat: 11,
      callback: () => {
        if (this.ended) return;
        this.surviveTime--;
        this.timeText.setText(`회의 종료까지: ${this.surviveTime}초`);
        if (this.surviveTime <= 0) this.endGame(true);
      },
    });

    // 터치 = 졸음 감소
    this.input.on('pointerdown', () => {
      if (this.ended) return;
      this.drowsiness = Math.max(0, this.drowsiness - 12);
      this.updateGauge();
      this.cameras.main.shake(30, 0.003);
    });

    emitGameState({ scene: 'SleepFightScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared });
  }

  private updateGauge() {
    const maxW = 396;
    this.gaugeBar.width = maxW * (this.drowsiness / 100);
    this.gaugeText.setText(`졸음: ${Math.floor(this.drowsiness)}%`);

    // 눈꺼풀 내려옴
    const closeFactor = this.drowsiness / 100;
    this.eyeTop.y = this.eyeY - 60 + closeFactor * 60;
    this.eyeBottom.y = this.eyeY + 60 - closeFactor * 60;

    // 게이지 색상 변화
    if (this.drowsiness > 70) {
      this.gaugeBar.setFillStyle(0xff0000);
    } else if (this.drowsiness > 40) {
      this.gaugeBar.setFillStyle(0xff8800);
    } else {
      this.gaugeBar.setFillStyle(0xff4444);
    }
  }

  private endGame(success: boolean) {
    if (this.ended) return;
    this.ended = true;

    const { width, height } = this.scale;
    const msg = success ? '회의 끝! 살았다!' : 'zzZ... 잠들었습니다';
    const color = success ? '#00b894' : '#e94560';

    this.add.text(width / 2, height * 0.93, msg, {
      fontFamily: 'sans-serif', fontSize: '24px', color, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(1200, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }
}
