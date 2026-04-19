import { logEvent, logClick } from './services/analytics';
import { adService } from './services/ad-service';
import { isAdRemoved } from './services/billing';
import { gameBus } from './event-bus';
import { storage } from './services/storage';
import { clearBattle } from './services/battle-state';
import { resetGameMode } from './services/game-mode';
import { HUD } from './HUD';
import { isToss, isTossNative } from './platform';
import { revive as doRevive, type LifecycleDeps } from './GameLifecycle';

const REVIVE_GEM_COST = 2;

export interface ReactListenerDeps {
  scene: Phaser.Scene;
  hud: HUD;
  getGameOver(): boolean;
  getIsFalling(): boolean;
  getInputLocked(): boolean;
  getScore(): number;
  startGame(): void;
  switchLane(): void;
  moveForward(): void;
  getLifecycleDeps(): LifecycleDeps;
}

export function setupReactListeners(deps: ReactListenerDeps) {
  const unsubSwitch = gameBus.on('action-switch', () => {
    if (deps.getGameOver() || deps.getIsFalling() || deps.hud.paused || deps.getInputLocked()) return;
    vibrate(10);
    deps.startGame();
    deps.switchLane();
  });

  const unsubForward = gameBus.on('action-forward', () => {
    if (deps.getGameOver() || deps.getIsFalling() || deps.hud.paused || deps.getInputLocked()) return;
    vibrate(10);
    deps.startGame();
    deps.moveForward();
  });

  const unsubRevive = gameBus.on('revive', () => {
    // 이미 광고 진행 중이면 무시 (연타 방지 — 1차 가드)
    // ad-service 내부에도 dedupe가 있어 2차 가드.
    if (deps.scene.scene.isPaused('CommuteScene')) return;

    const lifecycleDeps = deps.getLifecycleDeps();

    // 부활 광고 제거 구매한 사용자 — 광고 바이패스하고 즉시 부활.
    // (이 분기는 부활 전용. 상점의 무료 보상 광고는 그대로 표시됨.)
    if (isAdRemoved()) {
      logEvent('revive_ad_bypass', { score: deps.getScore() });
      gameBus.emit('screen-change', 'playing');
      doRevive(lifecycleDeps);
      return;
    }

    logEvent('revive_ad_click', { score: deps.getScore() });
    gameBus.emit('screen-change', 'revive-ad');

    // 광고 동안 게임 시뮬레이션 정지 (delta 폭주 방지) — BGM은 AudioDirector가 처리
    deps.scene.scene.pause();

    adService.showRewarded('revive', (result) => {
      // 광고 종료 후 게임 시뮬레이션 재개
      deps.scene.scene.resume();

      if (result.kind === 'rewarded') {
        storage.recordAdWatched();
        gameBus.emit('screen-change', 'playing');
        doRevive(lifecycleDeps);
      } else {
        // 스킵 또는 실패 → 부활 안 함, 게임오버 화면으로 복귀 + 안내 모달
        gameBus.emit('screen-change', 'game-over');
        gameBus.emit('revive-fail', result.kind);
      }
    });
  });

  const unsubRestart = gameBus.on('restart-game', () => {
    logClick('game_restart');
    // go-home와 동일한 정리 + CommuteScene 재시작 (BootScene 경유 X)
    adService.cancel();
    deps.hud.forceResume();
    if (deps.scene.scene.isPaused('CommuteScene')) {
      deps.scene.scene.resume();
    }
    gameBus.emit('screen-change', 'playing');
    deps.scene.scene.restart();
  });

  const unsubHome = gameBus.on('go-home', () => {
    logClick('game_home');
    clearBattle();
    resetGameMode();
    // 진행 중인 광고 결과 콜백을 무효화 (stale 콜백 방지)
    adService.cancel();
    // pause 상태 그대로 BootScene으로 전환 시 다음 게임에서 tween/time stale 상태로
    // 시작되는 현상 방지 — HUD가 관리하는 모든 pause 축을 명시적으로 해제.
    deps.hud.forceResume();
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

  // toggle-bgm 은 AudioDirector 가 단독 처리 (여기서 중복 구독 제거)

  const unsubGodMode = gameBus.on('toggle-godmode', () => {
    storage.toggleBool('godMode');
  });

  // 보석으로 부활 (광고 X)
  const unsubReviveGem = gameBus.on('revive-with-gems', () => {
    const gems = storage.getNum('gems');
    if (gems < REVIVE_GEM_COST) {
      gameBus.emit('toast', `보석 ${REVIVE_GEM_COST}개가 필요해요`);
      return;
    }
    storage.addNum('gems', -REVIVE_GEM_COST);
    logEvent('revive_gem', { score: deps.getScore(), cost: REVIVE_GEM_COST });
    gameBus.emit('screen-change', 'playing');
    doRevive(deps.getLifecycleDeps());
  });

  deps.scene.events.on('shutdown', () => {
    // 진행 중인 광고가 있으면 결과 무시 (씬이 사라진 뒤 콜백 발생 방지)
    adService.cancel();
    unsubSwitch();
    unsubForward();
    unsubRevive();
    unsubRestart();
    unsubHome();
    unsubPause();
    unsubPlaySfx();
    unsubGodMode();
    unsubReviveGem();
  });
}

// 토스 햅틱 — 모듈 레벨에서 1회만 로드해 참조 캐시.
// 매 탭마다 import() 호출 시 생기는 Promise/microtask 오버헤드로 인한
// 입력 드롭 현상 회피. (iOS WebKit에서 microtask 중 터치 이벤트 드롭 알려진 이슈)
type TossHaptic = (opts: { type: 'tap' }) => void;
let cachedTossHaptic: TossHaptic | null = null;
if (isToss() && isTossNative()) {
  import('@apps-in-toss/web-framework')
    .then((m) => { cachedTossHaptic = m.generateHapticFeedback as TossHaptic; })
    .catch(() => { /* 미지원 환경 무시 */ });
}

function vibrate(pattern: number | number[]) {
  // 토스 네이티브: 캐시된 함수 참조 사용 (동기 호출, Promise X)
  // ※ try/catch 필수 — 샌드박스 등 일부 환경에서 throw하면 호출부(endGame 등)가 중단될 수 있음
  if (cachedTossHaptic) {
    try { cachedTossHaptic({ type: 'tap' }); } catch { /* 미지원 환경 무시 */ }
    return;
  }
  // 토스 환경인데 아직 로드 중이면 스킵 (첫 탭 한정 — 로딩 끝나면 위 분기로)
  if (isToss() && isTossNative()) return;
  // 그 외(구글/웹): 표준 Vibration API
  try { navigator.vibrate?.(pattern); } catch { /* 미지원 환경 무시 */ }
}
