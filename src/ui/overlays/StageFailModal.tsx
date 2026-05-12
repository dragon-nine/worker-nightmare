import { gameBus, type GameOverData } from '../../game/event-bus';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { getCurrentStageId } from '../../game/services/game-mode';
import { getStage } from '../../game/services/stages';
import styles from './overlay.module.css';

interface Props { data: GameOverData }

export function StageFailModal({ data }: Props) {
  const scale = useResponsiveScale();
  const stageId = getCurrentStageId();
  const stage = getStage(stageId);
  const targetScore = stage?.targetScore ?? 0;

  const retry = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('restart-game', undefined);
  };

  const goHome = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('go-home', undefined);
  };

  return (
    <div
      className={styles.fadeIn}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        pointerEvents: 'auto',
        padding: 16 * scale,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: `min(86vw, ${340 * scale}px)`,
          padding: `${28 * scale}px ${22 * scale}px`,
          borderRadius: 22 * scale,
          background: 'linear-gradient(180deg, #1e2a3e 0%, #0e1726 100%)',
          border: `${1.5 * scale}px solid rgba(232,89,60,0.45)`,
          boxShadow: `0 ${10 * scale}px ${30 * scale}px rgba(0,0,0,0.5), inset 0 0 ${24 * scale}px rgba(232,89,60,0.06)`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: `${4 * scale}px ${12 * scale}px`,
            borderRadius: 999,
            background: 'rgba(232,89,60,0.18)',
            border: `${1 * scale}px solid rgba(232,89,60,0.45)`,
            marginBottom: 14 * scale,
          }}
        >
          <span style={{ fontSize: 11 * scale, color: '#ff8a7a', fontWeight: 900, fontFamily: 'GMarketSans, sans-serif', letterSpacing: 0.5 }}>
            실패
          </span>
        </div>

        <Text size={36 * scale} weight={900} color="#ffffff" align="center" style={{ marginBottom: 6 * scale, lineHeight: 1 }}>
          다시 도전?
        </Text>
        <Text size={13 * scale} color="rgba(255,255,255,0.6)" align="center" style={{ marginBottom: 22 * scale }}>
          레벨 {stageId} — 목표에 도달하지 못했어요
        </Text>

        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 14 * scale,
            padding: `${14 * scale}px ${18 * scale}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8 * scale,
            marginBottom: 22 * scale,
            border: `${1 * scale}px solid rgba(255,255,255,0.06)`,
          }}
        >
          <Row scale={scale} label="내 점수" value={`${data.score}점`} accent="#ffffff" />
          <Row scale={scale} label="목표" value={`${targetScore}점`} accent="#ffd24a" />
        </div>

        <div style={{ display: 'flex', gap: 10 * scale }}>
          <TapButton
            onTap={goHome}
            pressScale={0.96}
            style={{
              flex: 1,
              padding: `${14 * scale}px`,
              background: 'rgba(255,255,255,0.08)',
              border: `${1 * scale}px solid rgba(255,255,255,0.14)`,
              borderRadius: 12 * scale,
            }}
          >
            <span style={{ fontFamily: 'GMarketSans, sans-serif', fontWeight: 900, fontSize: 14 * scale, color: '#ffffff', letterSpacing: 0.3 }}>
              홈으로
            </span>
          </TapButton>
          <TapButton
            onTap={retry}
            pressScale={0.96}
            style={{
              flex: 1.4,
              padding: `${14 * scale}px`,
              background: 'linear-gradient(180deg, #ffd24a, #f5a623)',
              border: 'none',
              borderRadius: 12 * scale,
              boxShadow: `0 ${4 * scale}px ${12 * scale}px rgba(255,210,74,0.35)`,
            }}
          >
            <span style={{ fontFamily: 'GMarketSans, sans-serif', fontWeight: 900, fontSize: 15 * scale, color: '#241808', letterSpacing: 0.3 }}>
              다시 도전
            </span>
          </TapButton>
        </div>
      </div>
    </div>
  );
}

function Row({ scale, label, value, accent }: { scale: number; label: string; value: string; accent: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text size={12 * scale} color="rgba(255,255,255,0.55)" as="span">{label}</Text>
      <Text size={16 * scale} weight={900} color={accent} as="span">{value}</Text>
    </div>
  );
}
