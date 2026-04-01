import { useState, useEffect, useCallback } from 'react';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';
import { useLayout } from '../hooks/useLayout';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

const IMAGE_MAP: Record<string, string> = {
  'gauge-bar': 'ui/gauge-empty.png',
  'btn-pause': 'ui/btn-pause.png',
  'btn-switch': 'ui/btn-switch.png',
  'btn-forward': 'ui/btn-forward.png',
};

export function GameplayHUD() {
  const { positions, elements, scale, ready } = useLayout('gameplay', IMAGE_MAP);
  const [score, setScore] = useState(0);
  const [timerPct, setTimerPct] = useState(1);
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);
  const tutorialDone = storage.getBool('tutorialDone');
  const [guideHint, setGuideHint] = useState<'forward' | 'switch' | null>(tutorialDone ? null : 'forward');

  useEffect(() => {
    const unsub1 = gameBus.on('score-update', setScore);
    const unsub2 = gameBus.on('timer-update', setTimerPct);
    const unsub3 = gameBus.on('guide-hint', setGuideHint);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const handleSwitch = useCallback(() => {
    gameBus.emit('action-switch', undefined);
  }, []);

  const handleForward = useCallback(() => {
    gameBus.emit('action-forward', undefined);
  }, []);

  const handlePause = useCallback(() => {
    gameBus.emit('action-pause', undefined);
  }, []);

  const handleBtnDown = useCallback((id: string) => {
    setPressedBtn(id);
    setTimeout(() => setPressedBtn(null), 80);
  }, []);

  if (!ready) return null;

  const pos = (id: string) => positions.get(id);

  const boxStyle = (id: string): React.CSSProperties => {
    const p = pos(id);
    if (!p) return { display: 'none' };
    return {
      position: 'absolute',
      left: p.x - p.displayWidth * p.originX,
      top: p.y - p.displayHeight * p.originY,
      width: p.displayWidth,
      height: p.displayHeight,
    };
  };

  const gaugePos = pos('gauge-bar');
  const scoreEl = elements.find(e => e.id === 'scoreText');
  const scoreFontSize = (scoreEl?.textStyle?.fontSizePx || 90) * scale;
  const scoreStrokeW = (scoreEl?.textStyle?.strokeWidth || 6) * scale;
  const scoreStrokeColor = scoreEl?.textStyle?.strokeColor || '#000';

  return (
    <div className={styles.overlay} style={{ pointerEvents: 'none' }}>
      {/* 게이지바 */}
      {gaugePos && (
        <div style={boxStyle('gauge-bar')}>
          {/* 빈 게이지 배경 */}
          <img
            src={`${BASE}ui/gauge-empty.png`}
            alt=""
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
            draggable={false}
          />
          {/* 찬 게이지 (대각선 클립 — Phaser 원본과 동일: slant = height * 0.424) */}
          <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
          }}>
            {(() => {
              const w = gaugePos.displayWidth;
              const h = gaugePos.displayHeight;
              const slant = h * 0.424; // 대각선 기울기 (113도)
              const slantPct = (slant / w) * 100;
              const fillPct = timerPct * 100;
              const bottomPct = Math.max(0, fillPct - slantPct);
              return (
                <div style={{
                  width: '100%',
                  height: '100%',
                  clipPath: `polygon(0% 0%, ${fillPct}% 0%, ${bottomPct}% 100%, 0% 100%)`,
                }}>
                  <img
                    src={`${BASE}ui/gauge-full.png`}
                    alt=""
                    style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
                    draggable={false}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 일시정지 버튼 */}
      <div
        style={{ ...boxStyle('btn-pause'), pointerEvents: 'auto', cursor: 'pointer' }}
        onClick={handlePause}
      >
        <img
          src={`${BASE}ui/btn-pause.png`}
          alt="일시정지"
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
          draggable={false}
        />
      </div>

      {/* 점수 */}
      {pos('scoreText') && (
        <div style={{
          ...boxStyle('scoreText'),
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          fontSize: scoreFontSize,
          fontWeight: 700,
          fontFamily: 'GMarketSans, sans-serif',
          color: scoreEl?.textStyle?.color || '#fff',
          WebkitTextStroke: `${scoreStrokeW}px ${scoreStrokeColor}`,
          paintOrder: 'stroke fill',
        }}>
          {score}
        </div>
      )}

      {/* 좌측 버튼 (방향 전환) */}
      <div
        style={{
          ...boxStyle('btn-switch'),
          pointerEvents: 'auto',
          cursor: 'pointer',
          transform: pressedBtn === 'btn-switch' ? 'scale(0.85)' : undefined,
          transition: 'transform 0.08s ease-out',
        }}
        onPointerDown={() => { handleBtnDown('btn-switch'); handleSwitch(); }}
      >
        <img
          src={`${BASE}ui/btn-switch.png`}
          alt="전환"
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
          draggable={false}
        />
      </div>

      {/* 우측 버튼 (전진) */}
      <div
        style={{
          ...boxStyle('btn-forward'),
          pointerEvents: 'auto',
          cursor: 'pointer',
          transform: pressedBtn === 'btn-forward' ? 'scale(0.85)' : undefined,
          transition: 'transform 0.08s ease-out',
        }}
        onPointerDown={() => { handleBtnDown('btn-forward'); handleForward(); }}
      >
        <img
          src={`${BASE}ui/btn-forward.png`}
          alt="전진"
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
          draggable={false}
        />
      </div>
      {/* 튜토리얼 가이드 — 눌러야 할 버튼만 표시 */}
      {guideHint && (
        <>
          <style>{`
            @keyframes guideGlow {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
            @keyframes guideFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>

          {guideHint === 'forward' && pos('btn-forward') && (() => {
            const p = pos('btn-forward')!;
            const left = p.x - p.displayWidth * p.originX;
            const top = p.y - p.displayHeight * p.originY;
            return (
              <>
                <div style={{
                  position: 'absolute',
                  left: left + p.displayWidth * 0.075,
                  top: top + p.displayHeight * 0.075,
                  width: p.displayWidth * 0.85,
                  height: p.displayHeight * 0.85,
                  borderRadius: '50%',
                  border: `${2 * scale}px solid #00e5ff`,
                  boxShadow: '0 0 10px #00e5ff, 0 0 20px #00e5ff60',
                  animation: 'guideGlow 1.2s ease-in-out infinite, guideFadeIn 0.5s ease-out',
                }} />
                <div style={{
                  position: 'absolute', left, top: top - 40 * scale, width: p.displayWidth,
                  textAlign: 'center', animation: 'guideFadeIn 0.5s ease-out',
                }}>
                  <span style={{
                    color: '#fff', fontSize: 28 * scale, fontWeight: 900,
                    fontFamily: 'GMarketSans, sans-serif',
                    textShadow: '0 0 10px #00e5ff, 0 0 20px #00e5ff60',
                    WebkitTextStroke: `${2 * scale}px #000`,
                    paintOrder: 'stroke fill',
                  }}>
                    앞으로!
                  </span>
                </div>
              </>
            );
          })()}

          {guideHint === 'switch' && pos('btn-switch') && (() => {
            const p = pos('btn-switch')!;
            const left = p.x - p.displayWidth * p.originX;
            const top = p.y - p.displayHeight * p.originY;
            return (
              <>
                <div style={{
                  position: 'absolute',
                  left: left + p.displayWidth * 0.075,
                  top: top + p.displayHeight * 0.075,
                  width: p.displayWidth * 0.85,
                  height: p.displayHeight * 0.85,
                  borderRadius: '50%',
                  border: `${2 * scale}px solid #ff3b3b`,
                  boxShadow: '0 0 10px #ff3b3b, 0 0 20px #ff3b3b60',
                  animation: 'guideGlow 1.2s ease-in-out infinite, guideFadeIn 0.5s ease-out',
                }} />
                <div style={{
                  position: 'absolute', left, top: top - 40 * scale, width: p.displayWidth,
                  textAlign: 'center', animation: 'guideFadeIn 0.5s ease-out',
                }}>
                  <span style={{
                    color: '#fff', fontSize: 28 * scale, fontWeight: 900,
                    fontFamily: 'GMarketSans, sans-serif',
                    textShadow: '0 0 10px #ff3b3b, 0 0 20px #ff3b3b60',
                    WebkitTextStroke: `${2 * scale}px #000`,
                    paintOrder: 'stroke fill',
                  }}>
                    회전!
                  </span>
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
