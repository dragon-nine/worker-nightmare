import { gameBus, type StageClearData } from '../../game/event-bus';
import { TapButton } from '../components/TapButton';
import { setGameMode, setCurrentStageId } from '../../game/services/game-mode';
import { getNextStageId, isStageUnlocked } from '../../game/services/stages';

interface Props { data: StageClearData }

export function StageClearScreen({ data }: Props) {
  const nextId = getNextStageId();
  const hasNext = !data.isLastStage && isStageUnlocked(nextId) && nextId !== data.stageId;

  const playNext = () => {
    if (!hasNext) return;
    gameBus.emit('play-sfx', 'sfx-click');
    setGameMode('stage');
    setCurrentStageId(nextId);
    // 씬 재시작 — 점수/타이머 등 모든 상태 초기화 후 새 stage id 로 재진입
    gameBus.emit('restart-game', undefined);
  };

  const backToStages = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    // 씬은 그대로 (gameOver 상태) — 화면만 stage-select 로 이동.
    // 다음 스테이지 탭 시 restart-game 이 씬을 리셋함.
    gameBus.emit('screen-change', 'stage-select');
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(255,210,74,0.95) 0%, rgba(240,160,48,0.95) 100%)',
        color: '#1a1108',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        pointerEvents: 'auto',
        padding: 32,
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -2 }}>퇴근!</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>
        레벨 {data.stageId} 클리어
      </div>

      <div
        style={{
          background: 'rgba(0,0,0,0.12)',
          borderRadius: 16,
          padding: '20px 28px',
          minWidth: 240,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <Row label="점수" value={`${data.score}점`} />
        <Row label="목표" value={`${data.targetScore}점`} />
        <Row label="보상" value={`🪙 ${data.rewardCoins}`} highlight />
      </div>

      {data.isLastStage && (
        <div style={{ fontSize: 16, fontWeight: 700, color: '#5a3a08' }}>
          🎉 모든 레벨 클리어! 도전 모드도 도전해보세요.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {hasNext && (
          <TapButton
            onTap={playNext}
            style={{
              padding: '14px 28px',
              background: '#1a1108',
              color: '#ffe28a',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
            }}
          >
            다음 레벨 →
          </TapButton>
        )}
        <TapButton
          onTap={backToStages}
          style={{
            padding: '14px 28px',
            background: 'rgba(0,0,0,0.18)',
            color: '#1a1108',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            border: 'none',
          }}
        >
          레벨 선택
        </TapButton>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, opacity: 0.7 }}>{label}</span>
      <span style={{ fontSize: highlight ? 18 : 15, fontWeight: highlight ? 800 : 600 }}>{value}</span>
    </div>
  );
}
