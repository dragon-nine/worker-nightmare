import Phaser from 'phaser';
import { Analytics, eventLog } from '@apps-in-toss/web-framework';

function safeAnalytics(fn: () => void) {
  try { fn(); } catch { /* 토스 외부 환경에서는 무시 */ }
}

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
      ['building3', 'obstacles/building3.png'],
      ['building4', 'obstacles/building4.png'],
      ['building5', 'obstacles/building5.png'],
      ['rabbit', 'character/rabbit.png'],
      ['btn-forward', 'ui/btn-forward.png'],
      ['btn-switch', 'ui/btn-switch.png'],
      ['btn-pause', 'ui/btn-pause.png'],
      ['gauge-empty', 'ui/gauge-empty.png'],
      ['gauge-full', 'ui/gauge-full.png'],
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

    // Menu BGM (autoplay may be blocked by browser policy)
    try {
      if (!this.sound.get('bgm-menu')) {
        this.sound.add('bgm-menu', { loop: true, volume: 0.4 }).play();
      }
    } catch { /* autoplay 차단 — 무시 */ }

    safeAnalytics(() => Analytics.screen({ log_name: 'screen_boot' }));

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
      fontFamily: 'GMarketSans, sans-serif', fontSize: '52px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const title2 = this.add.text(width / 2, height * 0.4, '잔혹사', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '68px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const sub = this.add.text(width / 2, height * 0.54, '당신의 하루를 견뎌내세요', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '18px', color: '#555577',
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
      fontFamily: 'GMarketSans, sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
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
      try { this.sound.play('sfx-click', { volume: 0.6 }); } catch { /* 무시 */ }
      this.sound.get('bgm-menu')?.stop();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('CommuteScene');
      });
    });

    // 홈화면 추가 버튼
    const homeBtn = this.add.text(width / 2, height * 0.82, '홈 화면에 추가', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '14px', color: '#6666aa',
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    homeBtn.on('pointerover', () => homeBtn.setColor('#8888cc'));
    homeBtn.on('pointerout', () => homeBtn.setColor('#6666aa'));
    homeBtn.on('pointerdown', () => {
      try { this.sound.play('sfx-click', { volume: 0.6 }); } catch { /* 무시 */ }
      safeAnalytics(() => eventLog({ log_name: 'homescreen_guide_open', log_type: 'click', params: { from: 'boot' } }));
      this.showHomeScreenGuide();
    });

    this.tweens.add({ targets: homeBtn, alpha: 1, duration: 600, delay: 1800 });

    // Credits
    this.add.text(width / 2, height * 0.90, 'DragonNine Studio', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '12px', color: '#333344',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.93, 'Music by CodeManu (OpenGameArt.org) · SFX by Kenney.nl', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '9px', color: '#222233',
    }).setOrigin(0.5);
  }

  /** 홈화면 추가 가이드 표시 (CommuteScene에서도 호출 가능하도록 static-like) */
  showHomeScreenGuide() {
    const { width, height } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setDepth(600).setInteractive();
    items.push(overlay);

    // 닫기 버튼
    const closeBtn = this.add.text(width - 20, 20, '✕', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '28px', color: '#888888',
    }).setOrigin(1, 0).setDepth(601).setInteractive({ useHandCursor: true });
    items.push(closeBtn);

    // 앱 아이콘 (D9 로고)
    const iconBg = this.add.circle(width / 2, height * 0.15, 40, 0xe94560).setDepth(601);
    const iconText = this.add.text(width / 2, height * 0.15, 'D9', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(602);
    items.push(iconBg, iconText);

    // 타이틀
    const guideTitle = this.add.text(width / 2, height * 0.24, '직장인 잔혹사를\n홈 화면에 추가해보세요', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setDepth(601);
    items.push(guideTitle);

    // 스텝 가이드
    const stepStyle = { fontFamily: 'GMarketSans, sans-serif', fontSize: '16px', color: '#ccccdd', lineSpacing: 6 };
    const numStyle = { fontFamily: 'GMarketSans, sans-serif', fontSize: '22px', color: '#e94560', fontStyle: 'bold' as const };

    const stepY = height * 0.38;
    const stepGap = height * 0.09;
    const leftX = 36;

    // Step 1
    const n1 = this.add.text(leftX, stepY, '1', numStyle).setDepth(601);
    const s1 = this.add.text(leftX + 30, stepY, '오른쪽 아래  ⬆  아이콘을 누르고,', stepStyle).setDepth(601);
    items.push(n1, s1);

    // Step 2
    const n2 = this.add.text(leftX, stepY + stepGap, '2', numStyle).setDepth(601);
    const s2 = this.add.text(leftX + 30, stepY + stepGap, '새로 뜬 창을 스크롤해서', stepStyle).setDepth(601);
    items.push(n2, s2);

    // Step 3
    const n3 = this.add.text(leftX, stepY + stepGap * 2, '3', numStyle).setDepth(601);
    const s3 = this.add.text(leftX + 30, stepY + stepGap * 2, '⊕ 홈 화면에 추가  를 선택하세요', stepStyle).setDepth(601);
    items.push(n3, s3);

    // 장점 안내
    const benefit = this.add.text(width / 2, height * 0.72, '앱처럼 빠르게 실행할 수 있어요!', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '14px', color: '#8888aa',
    }).setOrigin(0.5).setDepth(601);
    items.push(benefit);

    // 확인 버튼
    const okBtn = this.add.rectangle(width / 2, height * 0.82, 200, 50, 0xe94560)
      .setInteractive({ useHandCursor: true }).setDepth(601);
    const okText = this.add.text(width / 2, height * 0.82, '확인', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(602);
    items.push(okBtn, okText);

    const close = () => items.forEach(item => item.destroy());
    closeBtn.on('pointerdown', close);
    okBtn.on('pointerdown', () => {
      try { this.sound.play('sfx-click', { volume: 0.6 }); } catch { /* 무시 */ }
      close();
    });
  }
}
