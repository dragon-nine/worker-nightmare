import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../../game/config';
import { gameBus, type GameScreen, type GameOverData } from '../../game/event-bus';
import { adService } from '../../game/services/ad-service';
import { logScreen } from '../../game/services/analytics';
import { isGoogle, isTossNative } from '../../game/platform';
// billing/leaderboard 는 다른 컴포넌트에서도 정적으로 import 됨 → 동적 import는
// 코드 스플릿 효과가 없으므로 정적 import로 통일 (Vite 경고 해소).
// 두 모듈 모두 ~2KB 얇은 래퍼이고, 무거운 SDK(@apps-in-toss/web-framework, play-games)는
// 모듈 내부에서 별도로 동적 import 하므로 메인 번들 영향 거의 없음.
import { restoreAdRemove } from '../../game/services/billing';
import { initGPGS } from '../../game/services/leaderboard';
import { MainScreen } from '../overlays/MainScreen';
import { SettingsOverlay } from '../overlays/SettingsOverlay';
import { PauseOverlay } from '../overlays/PauseOverlay';
import { GameOverScreen } from '../overlays/GameOverScreen';
import { GameplayHUD } from '../overlays/GameplayHUD';
import { ChallengeOverlay } from '../overlays/ChallengeOverlay';
import { AdRemoveOverlay } from '../overlays/AdRemoveOverlay';
import { StoryScreen } from '../overlays/StoryScreen';
import { ReviveFailModal } from '../overlays/ReviveFailModal';
import { ReviveScreen } from '../overlays/ReviveScreen';
import { MockAdModal } from '../overlays/MockAdModal';
import { CharacterUnlockPopup } from '../overlays/CharacterUnlockPopup';
import { RewardPopup } from '../overlays/RewardPopup';
import { Toast } from './Toast';

const GAME_CONTAINER_ID = 'game-container';

export function GameContainer() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [screen, setScreen] = useState<GameScreen>('loading');
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [challengeScore, setChallengeScore] = useState<number | null>(null);
  const [showAdRemove, setShowAdRemove] = useState(false);
  const [reviveFailReason, setReviveFailReason] = useState<'skipped' | 'failed' | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    // 플랫폼별 초기화
    // ※ admob/toss-ad/mock-ad provider 는 플랫폼 전용이라 동적 import 유지 (실제 코드 스플릿됨)
    // ※ billing.restoreAdRemove / leaderboard.initGPGS 는 정적 import + 직접 호출
    if (isGoogle()) {
      // Google: AdMob + GPGS + 구매복원
      import('../../game/services/admob-provider').then(({ AdMobProvider }) => {
        adService.setProvider(new AdMobProvider());
      }).catch((e) => console.warn('[AdMob] 초기화 실패:', e));
      initGPGS().catch((e) => console.warn('[GPGS] 초기화 실패:', e));
      restoreAdRemove().catch((e) => console.warn('[Billing] 복원 실패:', e));
    } else if (isTossNative()) {
      // 토스 인앱 (실제 SDK 호출 가능): 광고 프로바이더 + 구매복원
      import('../../game/services/toss-ad-provider').then(async ({ TossAdProvider }) => {
        const provider = new TossAdProvider();
        adService.setProvider(provider);
        await provider.preload('revive'); // 부활 광고 우선 로드
      }).catch((e) => console.warn('[TossAd] 초기화 실패:', e));
      restoreAdRemove().catch((e) => console.warn('[Billing] 복원 실패:', e));
    } else if (import.meta.env.DEV) {
      // 일반 브라우저 + DEV: mock 광고 프로바이더 (테스트용)
      import('../../game/services/mock-ad-provider').then(({ MockAdProvider }) => {
        const provider = new MockAdProvider();
        adService.setProvider(provider);
        provider.preload('revive');
        console.log('[Mock] 광고 프로바이더 등록됨 (DEV only)');
      });
    }

    const config = createGameConfig(GAME_CONTAINER_ID);
    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const unsub1 = gameBus.on('screen-change', (s) => {
      setScreen(s);
      // Toss/Firebase 분석 — 화면 전환 추적 (log_name은 snake_case + 'screen_' 접두)
      logScreen(`screen_${s.replace(/-/g, '_')}`);
      // 게임오버 화면을 벗어나면 부활 실패 모달도 정리
      if (s !== 'game-over') setReviveFailReason(null);
    });
    const unsub2 = gameBus.on('game-over-data', (data) => {
      setGameOverData(data);
      // 부활 가능하면 부활 모달 먼저, 아니면 바로 보상/종료 화면
      // screen-change 로 emit → 위 unsub1 이 setScreen + AudioDirector 에도 전파
      gameBus.emit('screen-change', data.canRevive ? 'revive-prompt' : 'game-over');
    });
    const unsub3 = gameBus.on('show-challenge', (score) => setChallengeScore(score));
    const unsub4 = gameBus.on('show-ad-remove', () => setShowAdRemove(true));
    const unsub5 = gameBus.on('revive-fail', (reason) => setReviveFailReason(reason));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        id={GAME_CONTAINER_ID}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          // Phaser canvas를 hit-test에서 제외 — 모든 인풋은 React DOM 오버레이에서 처리.
          // (Phaser config의 input:{touch:false, mouse:false}로 Phaser는 이미 이벤트 무시하지만,
          //  canvas element 자체는 여전히 hit-test 대상이라 iOS WebKit에서 overlay 자식 버튼의
          //  pointer-events:auto 오버라이드가 간헐적으로 무시되는 버그 회피)
          pointerEvents: 'none',
        }}
      />

      {/* React DOM 오버레이 */}
      {(screen === 'main' || screen === 'settings') && <MainScreen />}
      {screen === 'story' && <StoryScreen />}
      {screen === 'settings' && <SettingsOverlay />}
      {(screen === 'playing' || screen === 'paused') && <GameplayHUD />}
      {screen === 'paused' && <PauseOverlay />}
      {screen === 'revive-prompt' && gameOverData && (
        <ReviveScreen data={gameOverData} onSkip={() => gameBus.emit('screen-change', 'game-over')} />
      )}
      {(screen === 'game-over' || screen === 'revive-ad') && gameOverData && <GameOverScreen data={gameOverData} />}
      {challengeScore !== null && (
        <ChallengeOverlay score={challengeScore} onClose={() => setChallengeScore(null)} />
      )}
      {showAdRemove && (
        <AdRemoveOverlay onClose={() => setShowAdRemove(false)} />
      )}

      {/* 부활 광고 실패/스킵 안내 모달 */}
      {screen === 'game-over' && reviveFailReason && (
        <ReviveFailModal
          reason={reviveFailReason}
          onRetry={() => {
            setReviveFailReason(null);
            gameBus.emit('revive', undefined);
          }}
          onClose={() => setReviveFailReason(null)}
        />
      )}

      {/* DEV 전용 — Mock 광고 모달 */}
      {import.meta.env.DEV && <MockAdModal />}

      {/* 전역 보상 팝업 — 항상 마운트, 이벤트 기반 표시 */}
      <CharacterUnlockPopup />
      <RewardPopup />

      {/* 전역 토스트 — 항상 마운트, 이벤트 기반 표시 */}
      <Toast />
    </div>
  );
}
