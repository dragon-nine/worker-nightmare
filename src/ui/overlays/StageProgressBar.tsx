import { useEffect, useMemo, useRef, useState } from 'react';
import { gameBus } from '../../game/event-bus';
import { isStageMode, getCurrentStageId } from '../../game/services/game-mode';
import { getStage } from '../../game/services/stages';

interface Props {
  scale: number;
}

/**
 * 스테이지 모드 좌측 세로 진행 바 — 점수 / 목표 점수 비율로 채워짐.
 * 대전 모드 아닐 때만 마운트 (위치 충돌 회피).
 */
export function StageProgressBar({ scale }: Props) {
  const fillRef = useRef<HTMLDivElement>(null);
  const [stageActive] = useState(() => isStageMode());
  const targetScore = useMemo(() => {
    if (!stageActive) return 0;
    return getStage(getCurrentStageId())?.targetScore ?? 0;
  }, [stageActive]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (targetScore <= 0) return;
    return gameBus.on('score-update', (s) => {
      setScore(s);
      if (!fillRef.current) return;
      const pct = Math.max(0, Math.min(1, s / targetScore));
      fillRef.current.style.height = `${pct * 100}%`;
    });
  }, [targetScore]);

  if (!stageActive || targetScore <= 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 14 * scale,
        top: '22%',
        bottom: '28%',
        width: 12 * scale,
        zIndex: 5,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6 * scale,
      }}
    >
      {/* 목표 라벨 (상단) */}
      <div
        style={{
          padding: `${2 * scale}px ${6 * scale}px`,
          borderRadius: 999,
          background: 'rgba(0,0,0,0.55)',
          border: `${1 * scale}px solid rgba(255,210,74,0.5)`,
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 9 * scale,
          color: '#ffd24a',
          letterSpacing: 0.3,
          whiteSpace: 'nowrap',
        }}
      >
        {targetScore}
      </div>

      {/* 게이지 */}
      <div
        style={{
          flex: 1,
          width: '100%',
          background: 'rgba(0,0,0,0.55)',
          border: `${1 * scale}px solid rgba(255,255,255,0.15)`,
          borderRadius: 6 * scale,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column-reverse',
        }}
      >
        <div
          ref={fillRef}
          style={{
            width: '100%',
            height: '0%',
            background: 'linear-gradient(180deg, #ffd24a 0%, #f5a623 100%)',
            transition: 'height 0.2s ease-out',
            boxShadow: '0 0 8px rgba(255,210,74,0.5)',
          }}
        />
      </div>

      {/* 현재 점수 (하단) */}
      <div
        style={{
          padding: `${2 * scale}px ${6 * scale}px`,
          borderRadius: 999,
          background: 'rgba(0,0,0,0.55)',
          border: `${1 * scale}px solid rgba(255,255,255,0.25)`,
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 9 * scale,
          color: '#fff',
          letterSpacing: 0.3,
          whiteSpace: 'nowrap',
        }}
      >
        {score}
      </div>
    </div>
  );
}
