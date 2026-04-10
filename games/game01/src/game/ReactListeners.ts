import { logEvent, logClick } from './services/analytics';
import { adService } from './services/ad-service';
import { gameBus } from './event-bus';
import { storage } from './services/storage';
import { HUD } from './HUD';
import { isToss, isTossNative } from './platform';
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
    // 이미 광고 진행 중이면 무시 (연타 방지 — 1차 가드)
    // ad-service 내부에도 dedupe가 있어 2차 가드.
    if (deps.scene.scene.isPaused('CommuteScene')) return;

    logEvent('revive_ad_click', { score: deps.getScore() });
    gameBus.emit('screen-change', 'revive-ad');

    // 광고 동안 게임 시뮬레이션 정지 (delta 폭주 방지)
    deps.scene.scene.pause();
    const lifecycleDeps = deps.getLifecycleDeps();
    const bgm = lifecycleDeps.getBgm();
    bgm?.pause();

    adService.showRewarded((result) => {
      // 광고 종료 후 게임 시뮬레이션 재개
      deps.scene.scene.resume();
      if (bgm) (bgm as Phaser.Sound.WebAudioSound).resume();

      if (result.kind === 'rewarded') {
        gameBus.emit('screen-change', 'playing');
        doRevive(lifecycleDeps);
      } else {
        // 스킵 또는 실패 → 부활 안 함, 게임오버 화면으로 복귀 + 안내 모달
        gameBus.emit('screen-change', 'game-over');
        gameBus.emit('revive-fail', result.kind);
      }
    });
  });

  const unsubHome = gameBus.on('go-home', () => {
    logClick('game_home');
    // 진행 중인 광고 결과 콜백을 무효화 (stale 콜백 방지)
    adService.cancel();
    // pause 상태로 BootScene으로 이동 시 문제 방지
    if (deps.scene.scene.isPaused('CommuteScene')) {
      deps.scene.scene.resume();
    }
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
    // 진행 중인 광고가 있으면 결과 무시 (씬이 사라진 뒤 콜백 발생 방지)
    adService.cancel();
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
  // 토스 네이티브: 자체 햅틱 SDK 사용 (iOS/Android 모두 지원)
  if (isToss() && isTossNative()) {
    import('@apps-in-toss/web-framework').then(({ generateHapticFeedback }) => {
      generateHapticFeedback({ type: 'tap' });
    }).catch(() => { /* 미지원 환경 무시 */ });
    return;
  }
  // 그 외(구글/웹): 표준 Vibration API
  try { navigator.vibrate?.(pattern); } catch { /* 미지원 환경 무시 */ }
}
