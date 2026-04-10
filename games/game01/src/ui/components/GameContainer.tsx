import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../../game/config';
import { gameBus, type GameScreen, type GameOverData } from '../../game/event-bus';
import { loadQuotes } from '../../game/game-over-quotes';
import { adService } from '../../game/services/ad-service';
import { isGoogle, isTossNative } from '../../game/platform';
import { MainScreen } from '../overlays/MainScreen';
import { SettingsOverlay } from '../overlays/SettingsOverlay';
import { PauseOverlay } from '../overlays/PauseOverlay';
import { GameOverScreen } from '../overlays/GameOverScreen';
import { GameplayHUD } from '../overlays/GameplayHUD';
import { ChallengeOverlay } from '../overlays/ChallengeOverlay';
import { AdRemoveOverlay } from '../overlays/AdRemoveOverlay';
import { StoryScreen } from '../overlays/StoryScreen';
import { ReviveFailModal } from '../overlays/ReviveFailModal';
import { MockAdModal } from '../overlays/MockAdModal';
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

    loadQuotes(); // R2에서 게임오버 멘트 미리 로드

    // 플랫폼별 초기화
    if (isGoogle()) {
      // Google: AdMob + GPGS + 구매복원
      import('../../game/services/admob-provider').then(({ AdMobProvider }) => {
        adService.setProvider(new AdMobProvider());
      }).catch((e) => console.warn('[AdMob] 초기화 실패:', e));
      import('../../game/services/leaderboard').then(({ initGPGS }) => {
        initGPGS();
      }).catch((e) => console.warn('[GPGS] 초기화 실패:', e));
      import('../../game/services/billing').then(({ restoreAdRemove }) => {
        restoreAdRemove();
      }).catch((e) => console.warn('[Billing] 복원 실패:', e));
    } else if (isTossNative()) {
      // 토스 인앱 (실제 SDK 호출 가능): 광고 프로바이더 + 구매복원
      import('../../game/services/toss-ad-provider').then(async ({ TossAdProvider }) => {
        const provider = new TossAdProvider();
        adService.setProvider(provider);
        await provider.preload(); // 광고 로드 완료까지 대기
      }).catch((e) => console.warn('[TossAd] 초기화 실패:', e));
      import('../../game/services/billing').then(({ restoreAdRemove }) => {
        restoreAdRemove();
      }).catch((e) => console.warn('[Billing] 복원 실패:', e));
    } else if (import.meta.env.DEV) {
      // 일반 브라우저 + DEV: mock 광고 프로바이더 (테스트용)
      import('../../game/services/mock-ad-provider').then(({ MockAdProvider }) => {
        const provider = new MockAdProvider();
        adService.setProvider(provider);
        provider.preload();
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
      // 게임오버 화면을 벗어나면 부활 실패 모달도 정리
      if (s !== 'game-over') setReviveFailReason(null);
    });
    const unsub2 = gameBus.on('game-over-data', (data) => {
      setGameOverData(data);
      setScreen('game-over');
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
        }}
      />

      {/* React DOM 오버레이 */}
      {(screen === 'main' || screen === 'settings') && <MainScreen />}
      {screen === 'story' && <StoryScreen />}
      {screen === 'settings' && <SettingsOverlay />}
      {(screen === 'playing' || screen === 'paused') && <GameplayHUD />}
      {screen === 'paused' && <PauseOverlay />}
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

      {/* 전역 토스트 — 항상 마운트, 이벤트 기반 표시 */}
      <Toast />
    </div>
  );
}
