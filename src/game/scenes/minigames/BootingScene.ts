import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지2: PC 부팅 기다리기
 * - 로딩 바가 자동으로 채워지다가 랜덤으로 멈춤
 * - "응답 없음" 팝업이 뜨면 클릭해서 해제
 * - 15초 내에 100% 달성 = 성공
 */
export class BootingScene extends Phaser.Scene {
  private stageId = 0;
  private progress = 0;
  private frozen = false;
  private ended = false;
  private progressBar!: Phaser.GameObjects.Rectangle;
  private percentText!: Phaser.GameObjects.Text;
  private timeLeft = 15;
  private timerText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootingScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.progress = 0;
    this.frozen = false;
    this.ended = false;
    this.timeLeft = 15;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0078d4');

    // 윈도우 스타일 로딩
    this.add.text(width / 2, height * 0.25, '🖥️', { fontSize: '80px' }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.4, '업데이트 설치 중...', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45, 'PC를 끄지 마십시오', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#aaccff',
    }).setOrigin(0.5);

    // 프로그레스 바 배경
    const barW = 280;
    const barH = 24;
    const barX = width / 2 - barW / 2;
    const barY = height * 0.55;
    this.add.rectangle(width / 2, barY, barW, barH, 0x004488).setStrokeStyle(2, 0xffffff);

    this.progressBar = this.add.rectangle(barX + 2, barY, 0, barH - 4, 0x00ff88)
      .setOrigin(0, 0.5);

    this.percentText = this.add.text(width / 2, barY + 30, '0%', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 타이머
    this.timerText = this.add.text(width / 2, height * 0.7, `남은 시간: ${this.timeLeft}s`, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#aaccff',
    }).setOrigin(0.5);

    // 매 프레임 로딩 진행
    this.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        if (this.ended || this.frozen) return;
        this.progress = Math.min(100, this.progress + 0.8);
        this.updateBar();
        if (this.progress >= 100) this.endGame(true);
      },
    });

    // 랜덤 프리즈
    this.scheduleFreezes();

    // 카운트다운
    this.time.addEvent({
      delay: 1000, repeat: 14,
      callback: () => {
        if (this.ended) return;
        this.timeLeft--;
        this.timerText.setText(`남은 시간: ${this.timeLeft}s`);
        if (this.timeLeft <= 0) this.endGame(false);
      },
    });

    emitGameState({ scene: 'BootingScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared });
  }

  private scheduleFreezes() {
    const freezeTimes = [3000, 6500, 10000];
    freezeTimes.forEach(t => {
      this.time.delayedCall(t, () => {
        if (this.ended || this.progress >= 100) return;
        this.showFreeze();
      });
    });
  }

  private showFreeze() {
    this.frozen = true;
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.85)
      .setDepth(10).setInteractive();

    const popup = this.add.rectangle(width / 2, height / 2, 260, 140, 0xf0f0f0)
      .setStrokeStyle(2, 0x999999).setDepth(11);

    const title = this.add.text(width / 2, height / 2 - 35, '⚠️ 응답 없음', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#333333', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    const msg = this.add.text(width / 2, height / 2 - 5, 'update.exe가 응답하지 않습니다', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#666666',
    }).setOrigin(0.5).setDepth(11);

    const btn = this.add.rectangle(width / 2, height / 2 + 35, 140, 36, 0x0078d4)
      .setDepth(11).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(width / 2, height / 2 + 35, '기다리기', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    btn.on('pointerdown', () => {
      overlay.destroy();
      popup.destroy();
      title.destroy();
      msg.destroy();
      btn.destroy();
      btnText.destroy();
      this.frozen = false;
    });
  }

  private updateBar() {
    const barW = 276;
    this.progressBar.width = barW * (this.progress / 100);
    this.percentText.setText(`${Math.floor(this.progress)}%`);
  }

  private endGame(success: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.time.delayedCall(800, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }
}
