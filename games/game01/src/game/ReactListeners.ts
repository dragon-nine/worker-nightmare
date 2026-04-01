import { logEvent, logClick } from './services/analytics';
import { adService } from './services/ad-service';
import { gameBus } from './event-bus';
import { storage } from './services/storage';
import { HUD } from './HUD';
import { revive as doRevive, type LifecycleDeps } from './GameLifecycle';

export interface ReactListenerDeps {
  scene: Phaser.Scene;
  hud: HUD;
  getGameOver(): boolean;
  getIsFalling(): boolean;
  getScore(): number;
  startGame(): void;
  switchLane(): void;
  moveForward(): void;
  getLifecycleDeps(): LifecycleDeps;
}

export function setupReactListeners(deps: ReactListenerDeps) {
  const unsubSwitch = gameBus.on('action-switch', () => {
    if (deps.getGameOver() || deps.getIsFalling() || deps.hud.paused) return;
    vibrate(10);
    deps.startGame();
    deps.switchLane();
  });

  const unsubForward = gameBus.on('action-forward', () => {
    if (deps.getGameOver() || deps.getIsFalling() || deps.hud.paused) return;
    vibrate(10);
    deps.startGame();
    deps.moveForward();
  });

  const unsubRevive = gameBus.on('revive', () => {
    logEvent('revive_ad_click', { score: deps.getScore() });
    gameBus.emit('screen-change', 'revive-ad');
    adService.showRewarded(() => {
      gameBus.emit('screen-change', 'playing');
      doRevive(deps.getLifecycleDeps());
    });
  });

  const unsubHome = gameBus.on('go-home', () => {
    logClick('game_home');
    gameBus.emit('screen-change', 'main');
    deps.scene.scene.start('BootScene');
  });

  const unsubPause = gameBus.on('resume-game', () => {
    deps.hud.togglePause();
  });

  const unsubPlaySfx = gameBus.on('play-sfx', (key) => {
    if (key && !deps.hud.isSfxMuted()) {
      try { deps.scene.sound.play(key, { volume: 0.6 }); } catch { /* 무시 */ }
    }
  });

  const unsubToggleBgm = gameBus.on('toggle-bgm', () => {
    const bgm = deps.scene.sound.get('bgm-menu');
    if (bgm) (bgm as Phaser.Sound.WebAudioSound).setMute(storage.getBool('bgmMuted'));
  });

  const unsubGodMode = gameBus.on('toggle-godmode', () => {
    storage.toggleBool('godMode');
  });

  deps.scene.events.on('shutdown', () => {
    unsubSwitch();
    unsubForward();
    unsubRevive();
    unsubHome();
    unsubPause();
    unsubPlaySfx();
    unsubToggleBgm();
    unsubGodMode();
  });
}

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* 미지원 환경 무시 */ }
}
