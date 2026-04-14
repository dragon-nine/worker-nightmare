import Phaser from 'phaser';
import { gameBus } from '../event-bus';
import { storage } from '../services/storage';
import { audioDirector } from '../services/audio-director';
import { gameConfig } from '../game.config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    for (const [key, path] of gameConfig.assets.images) {
      if (!this.textures.exists(key)) this.load.image(key, path);
    }
    for (const [key, path, w, h] of gameConfig.assets.svgs) {
      if (!this.textures.exists(key)) this.load.svg(key, path, { width: w, height: h });
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

    // BGM 은 AudioDirector 가 단독 관리 — 화면/광고/가시성/음소거 반영
    audioDirector.init(this.sound);

    // 중요: 리스너부터 먼저 등록 (메인 화면 표시 전에 준비 완료)
    const unsubStart = gameBus.on('start-game', () => {
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

    // 씬 전환 시 정리
    this.events.on('shutdown', () => {
      unsubStart();
      unsubPlaySfx();
    });
  }
}
