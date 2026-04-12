import { useState, useEffect, useCallback, useRef } from 'react';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';
import { useLayout } from '../hooks/useLayout';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
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
  const [coins, setCoins] = useState(0);
  const gaugeFillRef = useRef<HTMLDivElement>(null);
  const tutorialDone = storage.getBool('tutorialDone');
  const [showIntro, setShowIntro] = useState(!tutorialDone);
  const [guideHint, setGuideHint] = useState<'forward' | 'switch' | null>(tutorialDone ? null : 'forward');

  useEffect(() => {
    const unsub1 = gameBus.on('score-update', setScore);
    // 타이머는 React state 대신 DOM 직접 조작 → 리렌더 0번
    const unsub2 = gameBus.on('timer-update', (pct) => {
      const el = gaugeFillRef.current;
      if (!el) return;
      const slantPct = el.dataset['slantPct'] ? parseFloat(el.dataset['slantPct']) : 0;
      const fillPct = pct * 100;
      const bottomPct = Math.max(0, fillPct - slantPct);
      el.style.clipPath = `polygon(0% 0%, ${fillPct}% 0%, ${bottomPct}% 100%, 0% 100%)`;
    });
    const unsub3 = gameBus.on('guide-hint', (hint) => {
      setGuideHint(hint);
      // 첫 전진 시 인트로 메시지 제거
      if (showIntro) setShowIntro(false);
    });
    const unsub4 = gameBus.on('coin-update', setCoins);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [showIntro]);

  const handleSwitch = useCallback(() => {
    gameBus.emit('action-switch', undefined);
  }, []);

  const handleForward = useCallback(() => {
    gameBus.emit('action-forward', undefined);
  }, []);

  const handlePause = useCallback(() => {
    gameBus.emit('action-pause', undefined);
  }, []);

  if (!ready) return null;

  const pos = (id: string) => positions.get(id);

  const topAnchors = new Set(
    elements.filter(e => e.positioning === 'anchor' && (e.anchor === 'top-left' || e.anchor === 'top-right')).map(e => e.id)
  );

  const boxStyle = (id: string): React.CSSProperties => {
    const p = pos(id);
    if (!p) return { display: 'none' };
    const rawTop = p.y - p.displayHeight * p.originY;
    return {
      position: 'absolute',
      left: p.x - p.displayWidth * p.originX,
      top: topAnchors.has(id) ? `calc(var(--sat, 0px) + ${rawTop}px)` : rawTop,
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
              const slantPct = ((h * 0.424) / w) * 100;
              return (
                <div
                  ref={gaugeFillRef}
                  data-slant-pct={slantPct}
                  style={{
                    width: '100%',
                    height: '100%',
                    clipPath: `polygon(0% 0%, 100% 0%, ${100 - slantPct}% 100%, 0% 100%)`,
                  }}
                >
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
      <TapButton
        onTap={handlePause}
        style={{ ...boxStyle('btn-pause'), pointerEvents: 'auto' }}
      >
        <img
          src={`${BASE}ui/btn-pause.png`}
          alt="일시정지"
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
          draggable={false}
        />
      </TapButton>

      {/* 코인 카운터 — 우측 상단 (일시정지 버튼 아래) */}
      {(() => {
        const pausePos = pos('btn-pause');
        if (!pausePos) return null;
        const pauseLeft = pausePos.x - pausePos.displayWidth * pausePos.originX;
        const pauseTop = pausePos.y - pausePos.displayHeight * pausePos.originY;
        const pauseRight = pauseLeft + pausePos.displayWidth;
        const coinTop = pauseTop + pausePos.displayHeight + 10 * scale;
        return (
          <div
            style={{
              position: 'absolute',
              top: `calc(var(--sat, 0px) + ${coinTop}px)`,
              // 일시정지 버튼의 우측 가장자리에 우측정렬 (translateX(-100%)로 좌측으로 자라남)
              left: pauseRight,
              transform: 'translateX(-100%)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6 * scale,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            <img
              src={`${BASE}ui/coin.png`}
              alt=""
              draggable={false}
              style={{
                width: 26 * scale,
                height: 26 * scale,
                display: 'block',
                objectFit: 'contain',
                filter: `drop-shadow(0 ${2 * scale}px ${4 * scale}px rgba(0, 0, 0, 0.6))`,
              }}
            />
            <Text
              size={24 * scale}
              weight={900}
              as="span"
              color="#ffd24a"
              style={{
                WebkitTextStroke: `${2 * scale}px #000`,
                paintOrder: 'stroke fill',
                letterSpacing: 0.5,
                lineHeight: 1,
              }}
            >
              {coins}
            </Text>
          </div>
        );
      })()}

      {/* 점수 */}
      {pos('scoreText') && (
        <Text
          size={scoreFontSize}
          weight={700}
          color={scoreEl?.textStyle?.color || '#fff'}
          style={{
            ...boxStyle('scoreText'),
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            WebkitTextStroke: `${scoreStrokeW}px ${scoreStrokeColor}`,
            paintOrder: 'stroke fill',
          }}
        >
          {score}
        </Text>
      )}

      {/* 좌측 버튼 (방향 전환) */}
      <TapButton
        onTap={handleSwitch}
        pressScale={0.85}
        style={{ ...boxStyle('btn-switch'), pointerEvents: 'auto' }}
      >
        <img
          src={`${BASE}ui/btn-switch.png`}
          alt="전환"
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
          draggable={false}
        />
      </TapButton>

      {/* 우측 버튼 (전진) */}
      <TapButton
        onTap={handleForward}
        pressScale={0.85}
        style={{ ...boxStyle('btn-forward'), pointerEvents: 'auto' }}
      >
        <img
          src={`${BASE}ui/btn-forward.png`}
          alt="전진"
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
          draggable={false}
        />
      </TapButton>
      {/* 튜토리얼 애니메이션 스타일 */}
      {(!tutorialDone) && (
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
      )}
      {/* 튜토리얼 인트로 — 화면 중앙 텍스트 */}
      {showIntro && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          animation: 'guideFadeIn 0.5s ease-out',
        }}>
          <Text
            size={28 * scale}
            weight={900}
            align="center"
            lineHeight={1.5}
            as="span"
            style={{
              textShadow: '0 0 10px #00e5ff, 0 0 20px #00e5ff60',
              WebkitTextStroke: `${2 * scale}px #000`,
              paintOrder: 'stroke fill',
            }}
          >
            제한 시간 동안<br />최대한 전진!
          </Text>
        </div>
      )}
      {/* 튜토리얼 가이드 — 눌러야 할 버튼만 표시 */}
      {guideHint && (
        <>
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
                  <Text
                    size={28 * scale}
                    weight={900}
                    as="span"
                    style={{
                      textShadow: '0 0 10px #00e5ff, 0 0 20px #00e5ff60',
                      WebkitTextStroke: `${2 * scale}px #000`,
                      paintOrder: 'stroke fill',
                    }}
                  >
                    앞으로!
                  </Text>
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
                  <Text
                    size={28 * scale}
                    weight={900}
                    as="span"
                    style={{
                      textShadow: '0 0 10px #ff3b3b, 0 0 20px #ff3b3b60',
                      WebkitTextStroke: `${2 * scale}px #000`,
                      paintOrder: 'stroke fill',
                    }}
                  >
                    회전!
                  </Text>
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
