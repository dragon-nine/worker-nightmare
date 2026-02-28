import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지6: 웹서핑 숨기기
 * 비율 조정, 하단 버튼 넓히기
 */
export class AltTabScene extends Phaser.Scene {
  private stageId = 0;
  private round = 0;
  private maxRounds = 3;
  private danger = false;
  private ended = false;
  private workBtn!: Phaser.GameObjects.Rectangle;
  private roundText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'AltTabScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.round = 0;
    this.ended = false;
    this.danger = false;
  }

  create() {
    const { width, height } = this.scale;

    this.roundText = this.add.text(width / 2, 25, `라운드 ${this.round + 1} / ${this.maxRounds}`, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#888888',
    }).setOrigin(0.5).setDepth(5);

    // 딴짓 화면 표시
    this.showFunScreen();

    // 업무 전환 버튼 (하단 — 넓은 가로 버튼)
    this.workBtn = this.add.rectangle(width / 2, height - 40, width - 60, 56, 0x333333)
      .setInteractive({ useHandCursor: true }).setDepth(5).setAlpha(0.6);
    this.add.text(width / 2, height - 40, '⌨️ Alt + Tab (업무 전환)', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5);

    this.workBtn.on('pointerdown', () => this.onAltTab());

    // 첫 경고 시작
    this.scheduleWarning();

    emitGameState({ scene: 'AltTabScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared });
  }

  private showFunScreen() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#ffffff');

    const sites = [
      { title: '오늘의 핫딜 🔥', content: '에어팟 프로 2 — 역대 최저가!\n삼성 TV 65인치 — 한정 수량!' },
      { title: '실시간 뉴스 📰', content: '"직장인 번아웃 역대 최고치"\n"AI가 대체할 직업 TOP 10"' },
      { title: '여행 특가 ✈️', content: '제주도 왕복 29,900원~\n오사카 항공권 50% 할인!' },
    ];
    const site = Phaser.Math.RND.pick(sites);

    this.add.text(width / 2, height * 0.18, site.title, {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#1a1a1a', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.4, site.content, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#444444',
      align: 'center', lineSpacing: 14,
    }).setOrigin(0.5);
  }

  private scheduleWarning() {
    const delay = Phaser.Math.Between(1500, 3500);
    this.time.delayedCall(delay, () => {
      if (this.ended) return;
      this.showWarning();
    });
  }

  private showWarning() {
    this.danger = true;
    const { width, height } = this.scale;

    // 빨간 경고
    this.cameras.main.setBackgroundColor('#fff0f0');
    const warning = this.add.text(width / 2, height * 0.5, '👞 발자국 소리!', {
      fontFamily: 'sans-serif', fontSize: '38px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    this.cameras.main.shake(500, 0.005);
    this.workBtn.setAlpha(1);
    this.workBtn.setFillStyle(0xe94560);

    // 1초 내 반응 못하면 실패
    this.time.delayedCall(1000, () => {
      if (this.danger && !this.ended) {
        this.ended = true;
        warning.setText('👀 들켰다!');
        this.time.delayedCall(1000, () => {
          this.scene.start('ResultScene', { stageId: this.stageId, success: false });
        });
      }
    });
  }

  private onAltTab() {
    if (this.ended) return;

    if (!this.danger) {
      return;
    }

    this.danger = false;
    this.round++;
    this.roundText.setText(`라운드 ${Math.min(this.round + 1, this.maxRounds)} / ${this.maxRounds}`);

    const { width, height } = this.scale;

    // 업무 화면 잠깐 표시
    this.cameras.main.setBackgroundColor('#f0f0f0');
    const safe = this.add.text(width / 2, height * 0.5, '📊 엑셀 보는 중...', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#00b894', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    this.workBtn.setAlpha(0.6);
    this.workBtn.setFillStyle(0x333333);

    if (this.round >= this.maxRounds) {
      this.ended = true;
      this.time.delayedCall(800, () => {
        this.scene.start('ResultScene', { stageId: this.stageId, success: true });
      });
    } else {
      this.time.delayedCall(1000, () => {
        safe.destroy();
        this.cameras.main.setBackgroundColor('#ffffff');
        this.scheduleWarning();
      });
    }
  }
}
