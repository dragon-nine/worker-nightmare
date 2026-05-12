import { useEffect, useState } from 'react';
import { gameBus } from '../../game/event-bus';
import { setGameMode, setCurrentStageId } from '../../game/services/game-mode';
import { getStage } from '../../game/services/stages';
import { clearBattle } from '../../game/services/battle-state';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import styles from './overlay.module.css';

export function StageIntroOverlay() {
  const scale = useResponsiveScale();
  const [stageId, setStageId] = useState<number | null>(null);

  useEffect(() => {
    return gameBus.on('stage-intro-show', (id) => setStageId(id));
  }, []);

  if (stageId == null) return null;
  const stageDef = getStage(stageId);
  if (!stageDef) {
    setStageId(null);
    return null;
  }

  const handleStart = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    setStageId(null);
    clearBattle();
    setGameMode('stage');
    setCurrentStageId(stageDef.id);
    gameBus.emit('start-game', undefined);
    gameBus.emit('restart-game', undefined);
  };

  const handleCancel = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    setStageId(null);
  };

  return (
    <div
      className={styles.fadeIn}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        pointerEvents: 'auto',
        padding: 16 * scale,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: `min(82vw, ${320 * scale}px)`,
          padding: `${28 * scale}px ${22 * scale}px`,
          borderRadius: 20 * scale,
          background: 'linear-gradient(180deg, #1e2a3e 0%, #0e1726 100%)',
          border: `${1.5 * scale}px solid rgba(255,210,74,0.45)`,
          boxShadow: `0 ${10 * scale}px ${30 * scale}px rgba(0,0,0,0.5), inset 0 0 ${24 * scale}px rgba(255,210,74,0.06)`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: `${4 * scale}px ${12 * scale}px`,
            borderRadius: 999,
            background: 'rgba(255,210,74,0.15)',
            border: `${1 * scale}px solid rgba(255,210,74,0.4)`,
            marginBottom: 16 * scale,
          }}
        >
          <span style={{ fontSize: 11 * scale, color: '#ffd24a', fontWeight: 900, fontFamily: 'GMarketSans, sans-serif', letterSpacing: 0.5 }}>
            STAGE
          </span>
        </div>

        <Text size={44 * scale} weight={900} color="#ffffff" align="center" style={{ marginBottom: 6 * scale, lineHeight: 1 }}>
          레벨 {stageDef.id}
        </Text>

        <Text size={12 * scale} color="rgba(255,255,255,0.6)" align="center" style={{ marginBottom: 22 * scale, letterSpacing: 0.5 }}>
          목표 점수
        </Text>

        <Text size={36 * scale} weight={900} color="#ffd24a" align="center" style={{ marginBottom: 24 * scale, lineHeight: 1 }}>
          {stageDef.targetScore}점
        </Text>

        <div style={{ display: 'flex', gap: 10 * scale }}>
          <TapButton
            onTap={handleCancel}
            pressScale={0.96}
            style={{
              flex: 1,
              padding: `${14 * scale}px`,
              borderRadius: 14 * scale,
              background: 'rgba(255,255,255,0.08)',
              border: `${1 * scale}px solid rgba(255,255,255,0.14)`,
            }}
          >
            <span style={{ fontFamily: 'GMarketSans, sans-serif', fontWeight: 900, fontSize: 14 * scale, color: '#ffffff', letterSpacing: 0.3 }}>
              취소
            </span>
          </TapButton>
          <TapButton
            onTap={handleStart}
            pressScale={0.96}
            style={{
              flex: 1.4,
              padding: `${14 * scale}px`,
              borderRadius: 14 * scale,
              background: 'linear-gradient(180deg, #ffd24a, #f5a623)',
              border: 'none',
              boxShadow: `0 ${4 * scale}px ${14 * scale}px rgba(255,210,74,0.4)`,
            }}
          >
            <span style={{ fontFamily: 'GMarketSans, sans-serif', fontWeight: 900, fontSize: 15 * scale, color: '#241808', letterSpacing: 0.5 }}>
              시작하기
            </span>
          </TapButton>
        </div>
      </div>
    </div>
  );
}
