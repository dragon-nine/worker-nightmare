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
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // 타이틀
    this.add.text(width / 2, height * 0.3, '직장인', {
      fontFamily: 'sans-serif', fontSize: '52px', color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, '잔혹사', {
      fontFamily: 'sans-serif', fontSize: '64px', color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 서브타이틀
    const sub = this.add.text(width / 2, height * 0.48, '오늘도 출근합니다...', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#666688',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: sub, alpha: 0.4, duration: 1200, yoyo: true, repeat: -1,
    });

    // 시작 버튼
    const btn = this.add.rectangle(width / 2, height * 0.65, 240, 56, 0xe94560)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.65, '출근하기', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0xd63651));
    btn.on('pointerout', () => btn.setFillStyle(0xe94560));
    btn.on('pointerdown', () => this.scene.start('StageSelectScene'));

    // 크레딧
    this.add.text(width / 2, height * 0.9, 'DragonNine Studio', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#444466',
    }).setOrigin(0.5);

    emitGameState({ scene: 'BootScene', progress: GameManager.progress, allCleared: GameManager.allCleared });
  }
}
