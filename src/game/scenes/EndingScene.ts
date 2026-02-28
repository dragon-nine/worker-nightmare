import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import { emitGameState } from '../GameBridge';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a2e');

    // 축하 파티클
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, width);
      const colors = [0xe94560, 0x00b894, 0x3182f6, 0xffd700, 0xff6b35];
      const color = Phaser.Math.RND.pick(colors);
      const size = Phaser.Math.Between(3, 8);
      const confetti = this.add.rectangle(x, -20, size, size * 2, color);

      this.tweens.add({
        targets: confetti,
        y: height + 20,
        x: x + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(0, 720),
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1500),
        repeat: -1,
      });
    }

    // 엔딩 텍스트
    this.add.text(width / 2, height * 0.12, '🎊', { fontSize: '72px' }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.3, '퇴사 완료!', {
      fontFamily: 'sans-serif', fontSize: '52px', color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.44, '오늘부로 자유의 몸입니다', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#aaaacc',
    }).setOrigin(0.5);

    // 통계
    this.add.text(width / 2, height * 0.62, [
      '📊 오늘의 기록',
      '',
      '출근 → 퇴사까지  |  10개 미션 완수',
      '',
      '당신은 진정한 직장인입니다.',
    ].join('\n'), {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#888899',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    // 다시하기 버튼
    const btn = this.add.rectangle(width / 2, height * 0.85, 280, 56, 0xe94560)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.85, '다시 출근하기', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      GameManager.reset();
      this.scene.start('BootScene');
    });

    emitGameState({ scene: 'EndingScene', progress: GameManager.progress, allCleared: GameManager.allCleared });
  }
}
