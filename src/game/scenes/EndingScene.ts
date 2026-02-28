import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import { emitGameState } from '../GameBridge';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a1e');

    const grade = GameManager.getGrade();
    const successCount = GameManager.successCount;
    const stress = Math.floor(GameManager.stress);

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

    // 헤더
    this.add.text(width / 2, 30, '🎊  퇴사 완료!  🎊', {
      fontFamily: 'sans-serif', fontSize: '36px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 결과 카드 배경
    const cardW = 440;
    const cardH = 340;
    const cardX = width / 2;
    const cardY = height * 0.5 + 10;
    this.add.rectangle(cardX, cardY, cardW, cardH, 0x16213e)
      .setStrokeStyle(2, 0x3182f6);

    // 카드 타이틀
    this.add.text(cardX, cardY - cardH / 2 + 28, '당신의 직장인 리포트', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#aaaacc', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 구분선
    this.add.rectangle(cardX, cardY - cardH / 2 + 48, cardW - 40, 1, 0x333355);

    // 스탯
    const statStartY = cardY - cardH / 2 + 70;
    const leftCol = cardX - 100;
    const rightCol = cardX + 60;

    const stats = [
      ['출근', '07:00 AM'],
      ['퇴근', '23:00 PM'],
      ['생존율', `${successCount} / 10`],
      ['스트레스', `${stress}%`],
    ];

    stats.forEach(([label, value], i) => {
      const y = statStartY + i * 30;
      this.add.text(leftCol, y, label, {
        fontFamily: 'sans-serif', fontSize: '15px', color: '#888899',
      }).setOrigin(0, 0.5);
      this.add.text(rightCol, y, value, {
        fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
    });

    // 구분선 2
    const gradeLineY = statStartY + stats.length * 30 + 10;
    this.add.rectangle(cardX, gradeLineY, cardW - 60, 1, 0x333355);

    // 등급 표시
    const gradeCenterY = gradeLineY + 50;

    this.add.text(cardX, gradeCenterY - 8, '── 등급 ──', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#666688',
    }).setOrigin(0.5);

    const gradeText = this.add.text(cardX, gradeCenterY + 28, `${grade.emoji} "${grade.title}" ${grade.emoji}`, {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: gradeText, scale: 1, duration: 500, delay: 800, ease: 'Back.easeOut',
    });

    this.add.text(cardX, gradeCenterY + 60, `"${grade.comment}"`, {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#aaaaaa',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // 다시 출근 버튼
    const btnY = height - 40;
    const btn = this.add.rectangle(width / 2, btnY, 240, 48, 0xe94560)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, btnY, '🔄 다시 출근하기', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      GameManager.reset();
      this.scene.start('BootScene');
    });

    emitGameState({
      scene: 'EndingScene',
      progress: GameManager.progress,
      allCleared: true,
      stress: GameManager.stress,
      successCount: GameManager.successCount,
    });
  }
}
