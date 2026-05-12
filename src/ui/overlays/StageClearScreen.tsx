import { gameBus, type StageClearData } from '../../game/event-bus';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import { CoinIcon } from '../components/CurrencyIcons';
import { setGameMode, setCurrentStageId } from '../../game/services/game-mode';
import { getNextStageId, isStageUnlocked } from '../../game/services/stages';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import styles from './overlay.module.css';

interface Props { data: StageClearData }

export function StageClearScreen({ data }: Props) {
  const scale = useResponsiveScale();
  const nextId = getNextStageId();
  const hasNext = !data.isLastStage && isStageUnlocked(nextId) && nextId !== data.stageId;

  const playNext = () => {
    if (!hasNext) return;
    gameBus.emit('play-sfx', 'sfx-click');
    setGameMode('stage');
    setCurrentStageId(nextId);
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
          background: 'linear-gradient(180deg, #ffd24a 0%, #f5a623 100%)',
          border: `${2 * scale}px solid rgba(255,255,255,0.45)`,
          boxShadow: `0 ${10 * scale}px ${30 * scale}px rgba(0,0,0,0.5), inset 0 0 ${30 * scale}px rgba(255,255,255,0.18)`,
          textAlign: 'center',
          color: '#1a1108',
        }}
      >
        <Text size={52 * scale} weight={900} color="#1a1108" align="center" style={{ marginBottom: 4 * scale, letterSpacing: -1, lineHeight: 1 }}>
          퇴근!
        </Text>
        <Text size={16 * scale} weight={700} color="#3a2710" align="center" style={{ marginBottom: 22 * scale }}>
          레벨 {data.stageId} 클리어
        </Text>

        {/* 결과 카드 */}
        <div
          style={{
            background: 'rgba(0,0,0,0.10)',
            borderRadius: 14 * scale,
            padding: `${16 * scale}px ${20 * scale}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10 * scale,
            marginBottom: 20 * scale,
          }}
        >
          <Row scale={scale} label="점수" value={`${data.score}점`} />
          <Row scale={scale} label="목표" value={`${data.targetScore}점`} />
          <RowReward scale={scale} amount={data.rewardCoins} />
        </div>

        <div style={{ display: 'flex', gap: 10 * scale }}>
          <TapButton
            onTap={goHome}
            pressScale={0.96}
            style={{
              flex: 1,
              padding: `${14 * scale}px`,
              background: 'rgba(0,0,0,0.20)',
              borderRadius: 12 * scale,
              border: 'none',
            }}
          >
            <span style={{ fontFamily: 'GMarketSans, sans-serif', fontWeight: 900, fontSize: 14 * scale, color: '#1a1108', letterSpacing: 0.3 }}>
              홈으로
            </span>
          </TapButton>
          {hasNext && (
            <TapButton
              onTap={playNext}
              pressScale={0.96}
              style={{
                flex: 1.4,
                padding: `${14 * scale}px`,
                background: '#1a1108',
                borderRadius: 12 * scale,
                border: 'none',
                boxShadow: `0 ${3 * scale}px ${8 * scale}px rgba(0,0,0,0.25)`,
              }}
            >
              <span style={{ fontFamily: 'GMarketSans, sans-serif', fontWeight: 900, fontSize: 14 * scale, color: '#ffe28a', letterSpacing: 0.3 }}>
                다음 레벨 →
              </span>
            </TapButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ scale, label, value }: { scale: number; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text size={13 * scale} weight={700} color="rgba(26,17,8,0.65)" as="span">{label}</Text>
      <Text size={16 * scale} weight={900} color="#1a1108" as="span">{value}</Text>
    </div>
  );
}

function RowReward({ scale, amount }: { scale: number; amount: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text size={13 * scale} weight={700} color="rgba(26,17,8,0.65)" as="span">보상</Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 * scale }}>
        <CoinIcon size={20 * scale} />
        <Text size={18 * scale} weight={900} color="#1a1108" as="span">{amount}</Text>
      </div>
    </div>
  );
}
