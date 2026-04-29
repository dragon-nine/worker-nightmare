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
    for (const [key, path, w, h] of gameConfig.assets.spritesheets) {
      if (!this.textures.exists(key)) this.load.spritesheet(key, path, { frameWidth: w, frameHeight: h });
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

    // 스프라이트시트 → 1회 재생 anim 자동 등록 (key: `${textureKey}-walk`).
    // 움직일 때마다 1사이클 돌리고 멈추면 프레임 0 으로 복귀 (Player 가 animationcomplete 에서 처리).
    // 캐릭터 walk variant (back/side, combo 포함) 는 frame 0 (정지 포즈) 을 anim 에서 제외 — 이동 시간에 정확히 매칭되도록.
    // fall / dust 는 frame 0 부터 사용 (효과 시작 프레임).
    const isWalkVariant = (k: string) => /-(back|side)(-combo[12])?$/.test(k);
    for (const [key, , , , frames] of gameConfig.assets.spritesheets) {
      const animKey = `${key}-walk`;
      if (!this.anims.exists(animKey)) {
        const startFrame = isWalkVariant(key) ? 1 : 0;
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(key, { start: startFrame, end: frames - 1 }),
          frameRate: 8,
          repeat: 0,
        });
      }
    }

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
