import Phaser from 'phaser';
import { Overlay } from '../Overlay';
import { logScreen } from '../services/analytics';
import { computeLayout, DESIGN_W } from '../layout-types';
import { loadLayout } from '../layout-loader';

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
      ['settings-bg', 'ui/settings/settings-bg.png'],
      ['settings-close', 'ui/settings/settings-close.png'],
      ['toggle-on', 'ui/settings/toggle-on.png'],
      ['toggle-off', 'ui/settings/toggle-off.png'],
      ['btn-settings', 'ui/btn-settings.png'],
      ['go-rabbit', 'game-over-screen/gameover-rabbit.png'],
      ['go-btn-revive', 'game-over-screen/btn-revive.png'],
      ['go-btn-home', 'game-over-screen/btn-home.png'],
      ['go-btn-challenge', 'game-over-screen/btn-challenge.png'],
      ['go-btn-ranking', 'game-over-screen/btn-ranking.png'],
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
    console.log('[Layout] screen:', width, 'x', height, 'scale:', width / DESIGN_W, 'dpr:', window.devicePixelRatio);
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

    // Set LINEAR filter on all loaded textures for smooth downscaling
    this.textures.getTextureKeys().forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.LINEAR);
    });

    // Background — scale to cover
    const bg = this.add.image(width / 2, height / 2, 'main-bg');
    bg.setScale(Math.max(width / bg.width, height / bg.height));

    // Create game objects first (position later via layout engine)
    const titleImg = this.add.image(0, 0, 'main-text').setAlpha(0);
    const charImg = this.add.image(0, 0, 'main-char').setAlpha(0);
    const s = width / DESIGN_W;
    const best = localStorage.getItem('bestScore') || '0';
    const bestRecord = this.add.text(0, 0, `최고기록 ${best}`, {
      fontFamily: 'GMarketSans, sans-serif',
      fontSize: `${Math.round(22 * s)}px`, color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: Math.round(4 * s),
    }).setOrigin(0.5).setAlpha(0);
    const btnImg = this.add.image(0, 0, 'main-btn').setAlpha(0);
    btnImg.setInteractive({ useHandCursor: true });
    const settingsBtn = this.add.image(0, 0, 'btn-settings').setInteractive({ useHandCursor: true });

    // Map IDs to game objects
    const objMap: Record<string, Phaser.GameObjects.Image | Phaser.GameObjects.Text> = {
      'main-text': titleImg, 'main-char': charImg, 'bestScore': bestRecord, 'main-btn': btnImg, 'btn-settings': settingsBtn,
    };

    // Apply layout then start animations
    loadLayout('game01', 'main-screen').then((elements) => {
      const positions = computeLayout(
        elements, width, height,
        (id) => { if (!this.textures.exists(id)) return null; const f = this.textures.get(id).getSourceImage(); return { w: f.width, h: f.height }; },
        (id) => { const obj = objMap[id]; return obj instanceof Phaser.GameObjects.Text ? { w: obj.width, h: obj.height } : null; },
      );
      for (const pos of positions) {
        const obj = objMap[pos.id];
        if (!obj) continue;
        obj.setPosition(pos.x, pos.y);
        obj.setOrigin(pos.originX, pos.originY);
        if (obj instanceof Phaser.GameObjects.Image) {
          obj.setDisplaySize(pos.displayWidth, pos.displayHeight);
        }
      }

      // Fade-in animations (after layout applied)
      const btnScale = btnImg.scaleX;
      this.tweens.add({ targets: titleImg, alpha: 1, y: titleImg.y - height * 0.02, duration: 800, delay: 300, ease: 'Power2' });
      this.tweens.add({ targets: charImg, alpha: 1, y: charImg.y - height * 0.02, duration: 800, delay: 600, ease: 'Power2' });
      this.tweens.add({ targets: bestRecord, alpha: 1, duration: 600, delay: 900, ease: 'Power2' });
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

    settingsBtn.on('pointerdown', () => {
      if (localStorage.getItem('sfxMuted') === 'false') try { this.sound.play('sfx-click', { volume: 0.6 }); } catch { /* 무시 */ }
      this.showSettings();
    });

    }); // end loadLayout.then
  }

  private showSettings() {
    const { width, height } = this.scale;
    const ov = new Overlay(this).open().closeOnDimClick();

    // 설정 패널 배경 (892x737 원본 비율)
    const panelW = width * 0.82;
    const panelH = panelW * (737 / 892);
    const panelY = height * 0.5;
    ov.add(
      this.add.image(width / 2, panelY, 'settings-bg')
        .setDisplaySize(panelW, panelH)
        .setDepth(Overlay.DEPTH)
    );

    // 상단 바 영역 (패널 높이의 약 22%가 연두색 바)
    const barH = panelH * 0.22;
    const barY = panelY - panelH / 2 + barH / 2;

    // "설정" 타이틀
    ov.addText(width / 2 - panelW * 0.05, barY, '설정', {
      fontSize: `${Math.round(panelW * 0.08)}px`, color: '#ffffff', fontStyle: 'bold',
    });

    // X 닫기 버튼 (우상단)
    const closeSize = panelW * 0.1;
    const closeX = width / 2 + panelW / 2 - closeSize * 0.8;
    const closeY = barY;
    const closeImg = ov.add(
      this.add.image(closeX, closeY, 'settings-close')
        .setDisplaySize(closeSize, closeSize)
        .setDepth(Overlay.DEPTH + 1)
        .setInteractive({ useHandCursor: true })
    );
    closeImg.on('pointerdown', () => {
      if (localStorage.getItem('sfxMuted') === 'false') try { this.sound.play('sfx-click', { volume: 0.6 }); } catch { /* 무시 */ }
      ov.close();
    });

    // 컨텐츠 영역
    const contentTop = panelY - panelH / 2 + barH;
    const contentH = panelH - barH;

    // 토글 크기
    const toggleW = panelW * 0.28;
    const toggleH = toggleW * (105 / 224);
    const toggleX = width / 2 - panelW * 0.18;
    const iconSize = panelW * 0.07;
    const labelX = width / 2 + panelW * 0.12;

    // 2개 행을 컨텐츠 영역 내 상하 중앙 정렬
    const rowGap = contentH * 0.30;
    const totalRowsH = rowGap; // 2개 행 사이 간격
    const musicY = contentTop + (contentH - totalRowsH) / 2;
    let bgmMuted = localStorage.getItem('bgmMuted') !== 'false';

    const bgmToggle = ov.add(
      this.add.image(toggleX, musicY, bgmMuted ? 'toggle-off' : 'toggle-on')
        .setDisplaySize(toggleW, toggleH)
        .setDepth(Overlay.DEPTH + 1)
        .setInteractive({ useHandCursor: true })
    );
    ov.addText(labelX - iconSize, musicY, '🎹', { fontSize: `${Math.round(iconSize)}px` });
    ov.addText(labelX + iconSize * 0.8, musicY, '음악', {
      fontSize: `${Math.round(panelW * 0.065)}px`, color: '#ffffff', fontStyle: 'bold',
    });

    bgmToggle.on('pointerdown', () => {
      bgmMuted = !bgmMuted;
      localStorage.setItem('bgmMuted', String(bgmMuted));
      (bgmToggle as Phaser.GameObjects.Image).setTexture(bgmMuted ? 'toggle-off' : 'toggle-on');
      const menuBgm = this.sound.get('bgm-menu');
      if (bgmMuted) {
        menuBgm?.stop();
      } else if (menuBgm && !menuBgm.isPlaying) {
        menuBgm.play();
      } else if (!menuBgm) {
        try { this.sound.add('bgm-menu', { loop: true, volume: 0.4 }).play(); } catch { /* 무시 */ }
      }
    });

    // ── 사운드 토글 ──
    const sfxY = musicY + rowGap;
    let sfxMuted = localStorage.getItem('sfxMuted') !== 'false';

    const sfxToggle = ov.add(
      this.add.image(toggleX, sfxY, sfxMuted ? 'toggle-off' : 'toggle-on')
        .setDisplaySize(toggleW, toggleH)
        .setDepth(Overlay.DEPTH + 1)
        .setInteractive({ useHandCursor: true })
    );
    ov.addText(labelX - iconSize, sfxY, '🔔', { fontSize: `${Math.round(iconSize)}px` });
    ov.addText(labelX + iconSize * 0.8, sfxY, '사운드', {
      fontSize: `${Math.round(panelW * 0.065)}px`, color: '#ffffff', fontStyle: 'bold',
    });

    sfxToggle.on('pointerdown', () => {
      sfxMuted = !sfxMuted;
      localStorage.setItem('sfxMuted', String(sfxMuted));
      (sfxToggle as Phaser.GameObjects.Image).setTexture(sfxMuted ? 'toggle-off' : 'toggle-on');
    });

    // 모든 아이템 즉시 표시
    ov.getItems().forEach(item => { if ('setAlpha' in item) (item as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(1); });
  }

}
