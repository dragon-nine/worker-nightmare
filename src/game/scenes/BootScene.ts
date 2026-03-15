import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const assets: [string, string][] = [
      ['tile-straight', 'map/straight.png'],
      ['tile-corner-tl', 'map/corner-tl.png'],
      ['tile-corner-tr', 'map/corner-tr.png'],
      ['tile-corner-bl', 'map/corner-bl.png'],
      ['tile-corner-br', 'map/corner-br.png'],
      ['building1', 'obstacles/building1.png'],
      ['building2', 'obstacles/building2.png'],
      ['rabbit', 'character/rabbit.png'],
      ['btn-forward', 'ui/btn-forward.png'],
      ['btn-switch', 'ui/btn-switch.png'],
    ];
    for (const [key, path] of assets) {
      if (!this.textures.exists(key)) this.load.image(key, path);
    }

    // Audio
    this.load.audio('bgm-menu', 'audio/bgm/menu.mp3');
    this.load.audio('bgm-gameplay', 'audio/bgm/gameplay.mp3');
    this.load.audio('sfx-click', 'audio/sfx/click.ogg');
    this.load.audio('sfx-switch', 'audio/sfx/switch.ogg');
    this.load.audio('sfx-forward', 'audio/sfx/forward.ogg');
    this.load.audio('sfx-crash', 'audio/sfx/crash.ogg');
    this.load.audio('sfx-combo', 'audio/sfx/combo.ogg');
    this.load.audio('sfx-time-bonus', 'audio/sfx/time-bonus.ogg');
    this.load.audio('sfx-timer-warning', 'audio/sfx/timer-warning.ogg');
    this.load.audio('sfx-game-over', 'audio/sfx/game-over.ogg');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a14');

    // Menu BGM
    if (!this.sound.get('bgm-menu')) {
      this.sound.add('bgm-menu', { loop: true, volume: 0.4 }).play();
    }

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
      this.sound.play('sfx-click', { volume: 0.6 });
      this.sound.get('bgm-menu')?.stop();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('CommuteScene');
      });
    });

    // Credits
    this.add.text(width / 2, height * 0.90, 'DragonNine Studio', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#333344',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.93, 'Music by CodeManu (OpenGameArt.org) · SFX by Kenney.nl', {
      fontFamily: 'sans-serif', fontSize: '9px', color: '#222233',
    }).setOrigin(0.5);
  }
}
