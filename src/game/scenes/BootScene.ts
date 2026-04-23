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

    // 첫 진입 유저(튜토리얼 미완)는 홈 스킵하고 바로 스토리 화면 (탭하면 튜토리얼 시작).
    // 재진입 유저는 기존대로 메인 홈.
    const initialScreen = storage.getBool('tutorialDone') ? 'main' : 'story';
    gameBus.emit('screen-change', initialScreen);

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
