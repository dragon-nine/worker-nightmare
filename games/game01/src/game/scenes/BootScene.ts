import Phaser from 'phaser';
import { Overlay } from '../Overlay';
import { logScreen, logEvent } from '../services/analytics';

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
      ['bg-game', 'background/game-bg.png'],
      ['rabbit-front', 'character/rabbit-front.png'],
      ['rabbit-back', 'character/rabbit-back.png'],
      ['rabbit-side', 'character/rabbit-side.png'],
      ['btn-forward', 'ui/btn-forward.png'],
      ['btn-switch', 'ui/btn-switch.png'],
      ['btn-pause', 'ui/btn-pause.png'],
      ['gauge-empty', 'ui/gauge-empty.png'],
      ['gauge-full', 'ui/gauge-full.png'],
      ['main-bg', 'main-screen/main-bg.png'],
      ['main-text', 'main-screen/main-text.png'],
      ['main-char', 'main-screen/main-char.png'],
      ['main-btn', 'main-screen/main-btn.png'],
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

    // Menu BGM (localStorage 뮤트 설정 반영)
    const bgmMuted = localStorage.getItem('bgmMuted') !== 'false';
    try {
      if (!this.sound.get('bgm-menu')) {
        const menuBgm = this.sound.add('bgm-menu', { loop: true, volume: 0.4 });
        if (!bgmMuted) menuBgm.play();
      }
    } catch { /* autoplay 차단 — 무시 */ }

    logScreen('screen_boot');

    // Background — 가로 맞춤
    const bg = this.add.image(width / 2, height / 2, 'main-bg');
    const bgScale = width / bg.width;
    bg.setScale(bgScale);

    // Title text
    const titleImg = this.add.image(width / 2, height * 0.28, 'main-text').setAlpha(0);
    const titleScale = (width * 0.85) / titleImg.width;
    titleImg.setScale(titleScale);

    // Character
    const charImg = this.add.image(width / 2, height * 0.52, 'main-char').setAlpha(0);
    const charScale = (width * 0.45) / charImg.width;
    charImg.setScale(charScale);

    // Start button
    const btnImg = this.add.image(width / 2, height * 0.76, 'main-btn').setAlpha(0);
    const btnScale = (width * 0.55) / btnImg.width;
    btnImg.setScale(btnScale);
    btnImg.setInteractive({ useHandCursor: true });

    // Fade-in animations
    this.tweens.add({ targets: titleImg, alpha: 1, y: height * 0.26, duration: 800, delay: 300, ease: 'Power2' });
    this.tweens.add({ targets: charImg, alpha: 1, y: height * 0.50, duration: 800, delay: 600, ease: 'Power2' });
    this.tweens.add({
      targets: btnImg, alpha: 1, duration: 600, delay: 1000,
      onComplete: () => {
        this.tweens.add({ targets: btnImg, scaleX: btnScale * 1.03, scaleY: btnScale * 1.03, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });

    btnImg.on('pointerdown', () => {
      if (localStorage.getItem('sfxMuted') === 'false') try { this.sound.play('sfx-click', { volume: 0.6 }); } catch { /* 무시 */ }
      this.sound.get('bgm-menu')?.stop();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('CommuteScene');
      });
    });

    // 우상단 아이콘들 (홈화면 추가 + 설정)
    const homeBtn = this.add.text(width - 60, 20, '📲', {
      fontSize: '26px',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    homeBtn.on('pointerdown', () => {
      if (localStorage.getItem('sfxMuted') === 'false') try { this.sound.play('sfx-click', { volume: 0.6 }); } catch { /* 무시 */ }
      logEvent('homescreen_guide_open', { from: 'boot' });
      this.showHomeScreenGuide();
    });

    const settingsBtn = this.add.text(width - 20, 20, '⚙', {
      fontSize: '26px', color: '#555577',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerdown', () => {
      if (localStorage.getItem('sfxMuted') === 'false') try { this.sound.play('sfx-click', { volume: 0.6 }); } catch { /* 무시 */ }
      this.showSettings();
    });

    // Credits
    this.add.text(width / 2, height * 0.92, 'DragonNine Studio', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '12px', color: '#ffffff44',
    }).setOrigin(0.5);

  }

  private showSettings() {
    const { width, height } = this.scale;
    const ov = new Overlay(this).open().closeOnDimClick();

    ov.addText(width / 2, height * 0.35, '설정', { fontSize: '32px', color: '#ffffff', fontStyle: 'bold' });

    // BGM 토글
    let bgmMuted = localStorage.getItem('bgmMuted') !== 'false';
    const bgmBtn = ov.add(this.add.rectangle(width / 2, height * 0.47, 220, 48, 0x333355)
      .setStrokeStyle(2, 0x6666aa).setDepth(Overlay.DEPTH).setInteractive({ useHandCursor: true }));
    const bgmLabel = ov.addText(width / 2, height * 0.47,
      `배경음악  ${bgmMuted ? 'OFF' : 'ON'}`,
      { fontSize: '18px', color: bgmMuted ? '#ff6666' : '#66ff66', fontStyle: 'bold' });

    bgmBtn.on('pointerdown', () => {
      bgmMuted = !bgmMuted;
      localStorage.setItem('bgmMuted', String(bgmMuted));
      bgmLabel.setText(`배경음악  ${bgmMuted ? 'OFF' : 'ON'}`);
      bgmLabel.setColor(bgmMuted ? '#ff6666' : '#66ff66');
      const menuBgm = this.sound.get('bgm-menu');
      if (bgmMuted) {
        menuBgm?.stop();
      } else if (menuBgm && !menuBgm.isPlaying) {
        menuBgm.play();
      } else if (!menuBgm) {
        try { this.sound.add('bgm-menu', { loop: true, volume: 0.4 }).play(); } catch { /* 무시 */ }
      }
    });

    // SFX 토글
    let sfxMuted = localStorage.getItem('sfxMuted') !== 'false';
    const sfxBtn = ov.add(this.add.rectangle(width / 2, height * 0.55, 220, 48, 0x333355)
      .setStrokeStyle(2, 0x6666aa).setDepth(Overlay.DEPTH).setInteractive({ useHandCursor: true }));
    const sfxLabel = ov.addText(width / 2, height * 0.55,
      `효과음  ${sfxMuted ? 'OFF' : 'ON'}`,
      { fontSize: '18px', color: sfxMuted ? '#ff6666' : '#66ff66', fontStyle: 'bold' });

    sfxBtn.on('pointerdown', () => {
      sfxMuted = !sfxMuted;
      localStorage.setItem('sfxMuted', String(sfxMuted));
      sfxLabel.setText(`효과음  ${sfxMuted ? 'OFF' : 'ON'}`);
      sfxLabel.setColor(sfxMuted ? '#ff6666' : '#66ff66');
    });

    // 닫기
    // 크레딧
    ov.addText(width / 2, height * 0.74, 'Music by CodeManu (OpenGameArt.org)\nSFX by Kenney.nl', {
      fontSize: '10px', color: '#555577', align: 'center',
    });

    ov.addButton(width / 2, height * 0.65, 160, 48, '닫기', 0x555555,
      () => ov.close(), { color: '#cccccc' });
    // addButton은 alpha 0으로 생성되므로 즉시 보이게
    ov.getItems().forEach(item => { if ('setAlpha' in item) (item as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(1); });
  }

  /** 홈화면 추가 가이드 표시 (CommuteScene에서도 호출 가능하도록 static-like) */
  showHomeScreenGuide() {
    const { width, height } = this.scale;
    const ov = new Overlay(this).open();

    // 닫기 ✕
    const closeBtn = ov.addText(width - 20, height * 0.05, '✕', { fontSize: '28px', color: '#888888' });
    closeBtn.setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => ov.close());

    // D9 로고
    ov.add(this.add.circle(width / 2, height * 0.15, 40, 0xe94560).setDepth(Overlay.DEPTH));
    ov.addText(width / 2, height * 0.15, 'D9', { fontSize: '28px', color: '#ffffff', fontStyle: 'bold' });

    // 타이틀
    ov.addText(width / 2, height * 0.24, '직장인 잔혹시를\n홈 화면에 추가해보세요', {
      fontSize: '24px', color: '#ffffff', fontStyle: 'bold', align: 'center',
    });

    // 스텝 가이드
    const stepY = height * 0.38;
    const stepGap = height * 0.09;
    const leftX = 36;

    ov.addText(leftX + 15, stepY, '1', { fontSize: '22px', color: '#e94560', fontStyle: 'bold' });
    ov.addText(leftX + 45, stepY, '오른쪽 아래  ⬆  아이콘을 누르고,', { fontSize: '16px', color: '#ccccdd' }).setOrigin(0, 0.5);

    ov.addText(leftX + 15, stepY + stepGap, '2', { fontSize: '22px', color: '#e94560', fontStyle: 'bold' });
    ov.addText(leftX + 45, stepY + stepGap, '새로 뜬 창을 스크롤해서', { fontSize: '16px', color: '#ccccdd' }).setOrigin(0, 0.5);

    ov.addText(leftX + 15, stepY + stepGap * 2, '3', { fontSize: '22px', color: '#e94560', fontStyle: 'bold' });
    ov.addText(leftX + 45, stepY + stepGap * 2, '⊕ 홈 화면에 추가  를 선택하세요', { fontSize: '16px', color: '#ccccdd' }).setOrigin(0, 0.5);

    ov.addText(width / 2, height * 0.72, '앱처럼 빠르게 실행할 수 있어요!', { fontSize: '14px', color: '#8888aa' });

    // 확인 버튼
    const { bg, text } = ov.addButton(width / 2, height * 0.82, 200, 50, '확인', 0xe94560, () => {
      if (localStorage.getItem('sfxMuted') === 'false') try { this.sound.play('sfx-click', { volume: 0.6 }); } catch { /* 무시 */ }
      ov.close();
    });
    bg.setAlpha(1); text.setAlpha(1);
  }
}
