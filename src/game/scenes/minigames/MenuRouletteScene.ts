import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지3: 메뉴 결정 장애
 * - 메뉴 텍스트가 빠르게 순환
 * - 타겟 메뉴가 위에 표시됨
 * - 터치해서 멈출 때 타겟 메뉴와 일치하면 성공
 * - 3번 기회
 */
export class MenuRouletteScene extends Phaser.Scene {
  private stageId = 0;
  private menus = ['짜장면', '짬뽕', '김치찌개', '돈까스', '비빔밥', '냉면', '칼국수', '제육볶음'];
  private targetMenu = '';
  private currentIdx = 0;
  private spinning = true;
  private attemptsLeft = 3;
  private ended = false;
  private menuText!: Phaser.GameObjects.Text;
  private attemptText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuRouletteScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.attemptsLeft = 3;
    this.ended = false;
    this.spinning = true;
    this.currentIdx = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#fff3e0');

    // 부장님 주문
    this.targetMenu = Phaser.Math.RND.pick(this.menus);

    this.add.text(width / 2, 60, '🤵 부장님 왈:', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#888888',
    }).setOrigin(0.5);

    this.add.text(width / 2, 95, `"${this.targetMenu} 먹자"`, {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 룰렛 영역
    this.add.rectangle(width / 2, height * 0.45, 280, 80, 0xffffff)
      .setStrokeStyle(3, 0xe94560);

    // 화살표
    this.add.text(width / 2 - 155, height * 0.45, '▶', {
      fontSize: '24px', color: '#e94560',
    }).setOrigin(0.5);

    this.menuText = this.add.text(width / 2, height * 0.45, '', {
      fontFamily: 'sans-serif', fontSize: '36px', color: '#1a1a1a', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 기회 표시
    this.attemptText = this.add.text(width / 2, height * 0.6, `남은 기회: ${this.attemptsLeft}`, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#888888',
    }).setOrigin(0.5);

    // 멈추기 버튼
    const stopBtn = this.add.rectangle(width / 2, height * 0.72, 200, 56, 0xe94560)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.72, '여기!', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    stopBtn.on('pointerdown', () => this.onStop());

    // 메뉴 순환
    this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (!this.spinning) return;
        this.currentIdx = (this.currentIdx + 1) % this.menus.length;
        this.menuText.setText(this.menus[this.currentIdx]);
      },
    });

    emitGameState({ scene: 'MenuRouletteScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared });
  }

  private onStop() {
    if (!this.spinning || this.ended) return;
    this.spinning = false;

    const selected = this.menus[this.currentIdx];
    const { width, height } = this.scale;

    if (selected === this.targetMenu) {
      this.ended = true;
      this.menuText.setColor('#00b894');
      this.add.text(width / 2, height * 0.55, '부장님 만족!', {
        fontFamily: 'sans-serif', fontSize: '18px', color: '#00b894', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.time.delayedCall(1200, () => {
        this.scene.start('ResultScene', { stageId: this.stageId, success: true });
      });
    } else {
      this.attemptsLeft--;
      this.attemptText.setText(`남은 기회: ${this.attemptsLeft}`);

      this.menuText.setColor('#ff4444');
      const miss = this.add.text(width / 2, height * 0.55, `"${selected}"은(는) 아니야...`, {
        fontFamily: 'sans-serif', fontSize: '14px', color: '#ff4444',
      }).setOrigin(0.5);

      if (this.attemptsLeft <= 0) {
        this.ended = true;
        this.time.delayedCall(1000, () => {
          this.scene.start('ResultScene', { stageId: this.stageId, success: false });
        });
      } else {
        this.time.delayedCall(800, () => {
          miss.destroy();
          this.menuText.setColor('#1a1a1a');
          this.spinning = true;
        });
      }
    }
  }
}
