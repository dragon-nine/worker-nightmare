import Phaser from 'phaser';
import { gameBus } from '../event-bus';
import { logScreen } from '../services/analytics';

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
      ['tile-road-start', 'map/road-start.png'],
      ['bg-1', 'background/bg-1.jpg'],
      ['bg-2', 'background/bg-2.jpg'],
      ['rabbit-front', 'character/rabbit-front.png'],
      ['rabbit-back', 'character/rabbit-back.png'],
      ['rabbit-side', 'character/rabbit-side.png'],
      ['btn-forward', 'ui/btn-forward.png'],
      ['btn-switch', 'ui/btn-switch.png'],
      ['btn-pause', 'ui/btn-pause.png'],
      ['gauge-empty', 'ui/gauge-empty.png'],
      ['gauge-full', 'ui/gauge-full.png'],
      // 메인 화면 이미지는 React에서 직접 로드하지만,
      // 게임오버에서 사용하는 이미지도 여기서 프리로드
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
    this.load.audio('sfx-click', 'audio/sfx/click.ogg');
    this.load.audio('sfx-switch', 'audio/sfx/switch.ogg');
    this.load.audio('sfx-forward', 'audio/sfx/forward.ogg');
    this.load.audio('sfx-crash', 'audio/sfx/crash.ogg');
    this.load.audio('sfx-combo', 'audio/sfx/combo.ogg');
    this.load.audio('sfx-timer-warning', 'audio/sfx/timer-warning.ogg');
    this.load.audio('sfx-game-over', 'audio/sfx/game-over.ogg');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a14');

    // Set LINEAR filter on all loaded textures
    this.textures.getTextureKeys().forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.LINEAR);
    });

    // Menu BGM
    const bgmMuted = localStorage.getItem('bgmMuted') === 'true';
    try {
      const existing = this.sound.get('bgm-menu');
      if (existing) {
        if (!bgmMuted && !existing.isPlaying) {
          (existing as Phaser.Sound.WebAudioSound).play();
        }
      } else {
        const menuBgm = this.sound.add('bgm-menu', { loop: true, volume: 0.4 });
        if (!bgmMuted) menuBgm.play();
      }
    } catch { /* autoplay 차단 — 무시 */ }

    logScreen('screen_boot');

    // React에서 메인 화면 렌더링 → 'main' 스크린 표시
    gameBus.emit('screen-change', 'main');

    // React → Phaser 이벤트 리스너
    const unsubStart = gameBus.on('start-game', () => {
      // BGM은 멈추지 않고 계속 재생
      this.scene.start('CommuteScene');
      unsubStart();
    });

    const unsubPlaySfx = gameBus.on('play-sfx', (key) => {
      if (key && localStorage.getItem('sfxMuted') !== 'true') {
        try { this.sound.play(key, { volume: 0.6 }); } catch { /* 무시 */ }
      }
    });

    const unsubToggleBgm = gameBus.on('toggle-bgm', () => {
      const muted = localStorage.getItem('bgmMuted') === 'true';
      const menuBgm = this.sound.get('bgm-menu');
      if (muted) {
        menuBgm?.stop();
      } else if (menuBgm && !menuBgm.isPlaying) {
        menuBgm.play();
      } else if (!menuBgm) {
        try { this.sound.add('bgm-menu', { loop: true, volume: 0.4 }).play(); } catch { /* 무시 */ }
      }
    });

    // 씬 전환 시 정리
    this.events.on('shutdown', () => {
      unsubStart();
      unsubPlaySfx();
      unsubToggleBgm();
    });
  }
}
