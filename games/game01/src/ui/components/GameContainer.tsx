import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../../game/config';
import { gameBus, type GameScreen, type GameOverData } from '../../game/event-bus';
import { loadQuotes } from '../../game/game-over-quotes';
import { adService } from '../../game/services/ad-service';
import { isGoogle } from '../../game/platform';
import { MainScreen } from '../overlays/MainScreen';
import { SettingsOverlay } from '../overlays/SettingsOverlay';
import { PauseOverlay } from '../overlays/PauseOverlay';
import { GameOverScreen } from '../overlays/GameOverScreen';
import { GameplayHUD } from '../overlays/GameplayHUD';
import { ChallengeOverlay } from '../overlays/ChallengeOverlay';
import { AdRemoveOverlay } from '../overlays/AdRemoveOverlay';

const GAME_CONTAINER_ID = 'game-container';

export function GameContainer() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [screen, setScreen] = useState<GameScreen>('main');
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [challengeScore, setChallengeScore] = useState<number | null>(null);
  const [showAdRemove, setShowAdRemove] = useState(false);

  useEffect(() => {
    if (gameRef.current) return;

    loadQuotes(); // R2에서 게임오버 멘트 미리 로드

    // Google(Capacitor) 환경에서 AdMob + GPGS 초기화
    if (isGoogle()) {
      import('../../game/services/admob-provider').then(({ AdMobProvider }) => {
        adService.setProvider(new AdMobProvider());
      }).catch((e) => console.warn('[AdMob] 초기화 실패:', e));
      import('../../game/services/leaderboard').then(({ initGPGS }) => {
        initGPGS();
      }).catch((e) => console.warn('[GPGS] 초기화 실패:', e));
    }

    const config = createGameConfig(GAME_CONTAINER_ID);
    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const unsub1 = gameBus.on('screen-change', (s) => setScreen(s));
    const unsub2 = gameBus.on('game-over-data', (data) => {
      setGameOverData(data);
      setScreen('game-over');
    });
    const unsub3 = gameBus.on('show-challenge', (score) => setChallengeScore(score));
    const unsub4 = gameBus.on('show-ad-remove', () => setShowAdRemove(true));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
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
      {screen === 'settings' && <SettingsOverlay />}
      {(screen === 'playing' || screen === 'paused') && <GameplayHUD />}
      {screen === 'paused' && <PauseOverlay />}
      {screen === 'game-over' && gameOverData && <GameOverScreen data={gameOverData} />}
      {challengeScore !== null && (
        <ChallengeOverlay score={challengeScore} onClose={() => setChallengeScore(null)} />
      )}
      {showAdRemove && (
        <AdRemoveOverlay onClose={() => setShowAdRemove(false)} />
      )}
    </div>
  );
}
