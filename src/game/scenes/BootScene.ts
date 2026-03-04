import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import { emitGameState } from '../GameBridge';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    GameManager.reset();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a14');

    // Particles
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(1, 3);
      const particle = this.add.circle(x, y, size, 0xffffff, 0.15);
      this.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(30, 80),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      });
    }

    // Title
    const title1 = this.add.text(width / 2, height * 0.25, '직장인', {
      fontFamily: 'sans-serif', fontSize: '52px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const title2 = this.add.text(width / 2, height * 0.4, '잔혹사', {
      fontFamily: 'sans-serif', fontSize: '68px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const sub = this.add.text(width / 2, height * 0.54, '당신의 하루를 견뎌내세요', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#555577',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: title1, alpha: 1, y: height * 0.23, duration: 800, delay: 300, ease: 'Power2' });
    this.tweens.add({ targets: title2, alpha: 1, y: height * 0.38, duration: 800, delay: 600, ease: 'Power2' });
    this.tweens.add({
      targets: sub, alpha: 1, duration: 800, delay: 1000,
      onComplete: () => {
        this.tweens.add({ targets: sub, alpha: 0.3, duration: 1500, yoyo: true, repeat: -1 });
      },
    });

    // Start button
    const btn = this.add.rectangle(width / 2, height * 0.72, 280, 60, 0xe94560)
      .setInteractive({ useHandCursor: true }).setAlpha(0);
    const btnText = this.add.text(width / 2, height * 0.72, '출근하기', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [btn, btnText], alpha: 1, duration: 600, delay: 1400,
      onComplete: () => {
        this.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.03, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });

    btn.on('pointerover', () => btn.setFillStyle(0xd63651));
    btn.on('pointerout', () => btn.setFillStyle(0xe94560));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        const stage = GameManager.getCurrentStage();
        this.scene.start('MinigameIntroScene', {
          stageId: stage.id,
          stageName: stage.name,
          stageEmoji: stage.emoji,
          minigameName: stage.minigame.name,
          minigameDesc: stage.minigame.description,
          minigameSceneKey: stage.minigame.sceneKey,
        });
      });
    });

    // Credits
    this.add.text(width / 2, height * 0.92, 'DragonNine Studio', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#333344',
    }).setOrigin(0.5);

    // ── Debug: 스테이지 바로가기 버튼 ──
    {
      const stages = GameManager.getAllStages();
      const debugY = height * 0.84;
      const totalW = stages.length * 56;
      const startX = width / 2 - totalW / 2 + 28;

      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        const bx = startX + i * 56;
        const dbg = this.add.text(bx, debugY, s.emoji, {
          fontSize: '28px', backgroundColor: '#222244', padding: { x: 6, y: 4 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0.7);

        this.add.text(bx, debugY + 22, s.category, {
          fontFamily: 'sans-serif', fontSize: '10px', color: '#8888aa',
        }).setOrigin(0.5);

        dbg.on('pointerover', () => dbg.setAlpha(1));
        dbg.on('pointerout', () => dbg.setAlpha(0.7));
        dbg.on('pointerdown', () => {
          GameManager.debugJumpTo(i);
          const stage = GameManager.getCurrentStage();
          this.scene.start(stage.minigame.sceneKey, { stageId: stage.id, debug: true });
        });
      }
    }

    emitGameState({ scene: 'BootScene', progress: 0, allCleared: false, stress: 0 });
  }
}
