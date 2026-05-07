import { gameBus } from '../../game/event-bus';
import { TapButton } from '../components/TapButton';
import {
  STAGES, getLastClearedStage, isStageUnlocked, isStageCleared,
} from '../../game/services/stages';
import { setGameMode, setCurrentStageId } from '../../game/services/game-mode';

export function StageSelectScreen() {
  const lastCleared = getLastClearedStage();

  const startStage = (id: number) => {
    if (!isStageUnlocked(id)) return;
    gameBus.emit('play-sfx', 'sfx-click');
    setGameMode('stage');
    setCurrentStageId(id);
    // 첫 진입 = start-game (BootScene 가 처리), 재진입 = restart-game (ReactListeners 가 처리).
    // 둘 중 활성 listener 하나만 동작 — 양쪽 emit 안전.
    gameBus.emit('start-game', undefined);
    gameBus.emit('restart-game', undefined);
  };

  const goHome = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('screen-change', 'main');
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, #1e2a3e 0%, #0e1726 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
        padding: '24px 20px 32px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <TapButton
          onTap={goHome}
          style={{
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: 'white',
            fontSize: 14,
            border: 'none',
          }}
        >
          ← 홈
        </TapButton>
        <div style={{ fontSize: 18, fontWeight: 700 }}>레벨 선택</div>
        <div style={{ width: 44 }} />
      </div>

      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 16, textAlign: 'center' }}>
        클리어한 레벨: {lastCleared} / {STAGES.length}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflow: 'auto' }}>
        {STAGES.map((stage) => {
          const unlocked = isStageUnlocked(stage.id);
          const cleared = isStageCleared(stage.id);
          return (
            <TapButton
              key={stage.id}
              onTap={() => startStage(stage.id)}
              style={{
                padding: '16px 20px',
                background: unlocked
                  ? cleared
                    ? 'linear-gradient(135deg, rgba(255,210,74,0.18), rgba(240,160,48,0.08))'
                    : 'linear-gradient(135deg, rgba(80,140,220,0.20), rgba(40,90,160,0.10))'
                  : 'rgba(255,255,255,0.04)',
                borderRadius: 14,
                border: unlocked
                  ? cleared
                    ? '1.5px solid rgba(255,210,74,0.4)'
                    : '1.5px solid rgba(120,170,240,0.4)'
                  : '1.5px solid rgba(255,255,255,0.06)',
                opacity: unlocked ? 1 : 0.5,
                color: 'white',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              pressScale={unlocked ? 0.96 : 1}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                  레벨 {stage.id}
                  {cleared && <span style={{ marginLeft: 8, color: '#ffd24a' }}>✓ 클리어</span>}
                  {!unlocked && <span style={{ marginLeft: 8, opacity: 0.6 }}>🔒</span>}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  목표: {stage.targetScore}점 · 보상: 🪙 {stage.rewardCoins}
                </div>
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                {unlocked ? '시작 →' : ''}
              </div>
            </TapButton>
          );
        })}
      </div>
    </div>
  );
}
