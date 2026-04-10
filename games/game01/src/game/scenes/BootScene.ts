import Phaser from 'phaser';
import { gameBus } from '../event-bus';
import { logScreen } from '../services/analytics';
import { storage } from '../services/storage';
import { gameConfig } from '../game.config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    for (const [key, path] of gameConfig.assets.images) {
      if (!this.textures.exists(key)) this.load.image(key, path);
    }
    for (const [key, path] of gameConfig.assets.audio) {
      this.load.audio(key, path);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a14');

    // Set LINEAR filter on all loaded textures
    this.textures.getTextureKeys().forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.LINEAR);
    });

    // Menu BGM
    const bgmMuted = storage.getBool('bgmMuted');
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

    // 중요: 리스너부터 먼저 등록 (메인 화면 표시 전에 준비 완료)
    const unsubStart = gameBus.on('start-game', () => {
      // BGM은 멈추지 않고 계속 재생
      this.scene.start('CommuteScene');
      unsubStart();
    });

    // React에서 메인 화면 렌더링 → 'main' 스크린 표시 (리스너 등록 후)
    gameBus.emit('screen-change', 'main');

    const unsubPlaySfx = gameBus.on('play-sfx', (key) => {
      if (key && !storage.getBool('sfxMuted')) {
        try { this.sound.play(key, { volume: 0.6 }); } catch { /* 무시 */ }
      }
    });

    const unsubToggleBgm = gameBus.on('toggle-bgm', () => {
      const muted = storage.getBool('bgmMuted');
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
