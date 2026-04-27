import { useState, useEffect, useCallback, useRef } from 'react';
import { gameBus, type TutorialStep } from '../../game/event-bus';
import { storage } from '../../game/services/storage';
import { TUTORIAL_MESSAGES } from '../../game/tutorial-messages';
import { useLayout } from '../hooks/useLayout';
import { Text } from '../components/Text';
import { TapDiv } from '../components/TapDiv';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

const IMAGE_MAP: Record<string, string> = {
  'gauge-bar': 'ui/gauge-empty.png',
  'btn-switch': 'ui/btn-switch.png',
  'btn-forward': 'ui/btn-forward.png',
};

export function TutorialOverlay() {
  const { scale, ready } = useLayout('gameplay', IMAGE_MAP);
  // 초기값: tutorialDone 상태에 따라 'done' / 'intro' 로 세팅 → 빈 화면 플래시 없음
  const [step, setStep] = useState<TutorialStep>(
    storage.getBool('tutorialDone') ? 'done' : 'intro'
  );
  // DOM 미러 토끼 — transition 중 Phaser 위치/텍스처를 받아 ref 로 직접 업데이트 (리렌더 0)
  const mirrorRef = useRef<HTMLImageElement>(null);
  // DOM 미러 도로 — transition-road 중 한 번에 타일 배열 받아 렌더
  const [roadTiles, setRoadTiles] = useState<Array<{ x: number; y: number; w: number; h: number; texKey: string }> | null>(null);
  // free-play 카운터
  const [freePlayCount, setFreePlayCount] = useState<{ current: number; target: number }>({ current: 0, target: 3 });

  useEffect(() => {
    const unsub = gameBus.on('tutorial-step', setStep);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = gameBus.on('road-mirror', setRoadTiles);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = gameBus.on('free-play-count', setFreePlayCount);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = gameBus.on('rabbit-mirror', (info) => {
      const el = mirrorRef.current;
      if (!el) return;
      if (!info) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'block';
      el.style.width = `${info.size}px`;
      el.style.height = `${info.size}px`;
      el.style.left = `${info.x}px`;
      el.style.top = `${info.y}px`;
      el.style.transform = `translate(-50%, -50%)${info.flipX ? ' scaleX(-1)' : ''}`;
      const src = `${BASE}character/${info.texKey}.png`;
      if (el.src !== src && !el.src.endsWith(`/character/${info.texKey}.png`)) {
        el.src = src;
      }
    });
    return unsub;
  }, []);

  // 튜토리얼 advance throttle — 일부 디바이스(Galaxy WebView/iOS)에서 한 제스처에
  // click 이 50ms 넘는 간격으로 두 번 합성되는 케이스 방어. useNativeTap 의 50ms dedup
  // 만으로는 한 탭이 두 스텝을 건너뛰는 현상이 재발 → 350ms 추가 throttle.
  const lastAdvanceAtRef = useRef(0);
  const handleAdvance = useCallback(() => {
    const now = performance.now();
    if (now - lastAdvanceAtRef.current < 350) return;
    lastAdvanceAtRef.current = now;
    gameBus.emit('tutorial-advance', undefined);
  }, []);

  if (!ready || step === 'done') return null;

  const interactive = step === 'prompt-forward' || step === 'prompt-switch';
  const isFreePlay = step === 'free-play';
  const isTransition = step === 'transition' || step === 'transition-road';
  const message = TUTORIAL_MESSAGES[step];

  // 하이라이트는 GameplayHUD 의 img 에 직접 filter: drop-shadow 클래스를 적용
  // (알파 기반 글로우 — Phaser preFX.addGlow 와 동등). TutorialOverlay 는 딤+다이얼로그만.

  // 다이얼로그 Y 위치 — 항상 동일 (모든 스텝)
  const dialogTopPct = '36%';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 120, pointerEvents: 'none' }}>
      {/* DOM 미러 도로 — 타일들을 하나의 wrapper 에 묶어서 filter 를 씌워야
          인접 타일 경계가 아니라 전체 도로의 외곽 alpha 에만 halo 가 걸림 */}
      {roadTiles && (
        <div
          className={styles.tutorialGlowRoad}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 121,
          }}
        >
          {roadTiles.map((t, i) => {
            const filename = t.texKey.replace(/^tile-/, '');
            return (
              <img
                key={i}
                src={`${BASE}map/${filename}.png`}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: t.x,
                  top: t.y,
                  width: t.w,
                  height: t.h,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            );
          })}
        </div>
      )}
      {/* DOM 미러 토끼 — transition 중엔 글로우, transition-road 중엔 글로우 없이 일반 표시 */}
      <img
        ref={mirrorRef}
        alt=""
        draggable={false}
        className={step === 'transition' ? styles.tutorialGlow : undefined}
        style={{
          position: 'absolute',
          display: 'none',
          pointerEvents: 'none',
          zIndex: 122,
        }}
      />
      {/* 딤 — free-play 는 딤 없음 / interactive 는 통과 / transition 은 옅게 / 그 외는 tap catcher */}
      {isFreePlay ? null : interactive ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          pointerEvents: 'none',
        }} />
      ) : isTransition ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          transition: 'background 0.2s',
        }} />
      ) : (
        <TapDiv
          onTap={handleAdvance}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            pointerEvents: 'auto',
          }}
        />
      )}


      {/* free-play 프롬프트 — 메인 모달과 같은 크기/스타일 + 카운터 강조 */}
      {isFreePlay && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '30%',
          transform: 'translate(-50%, -50%)',
          width: 280 * scale,
          padding: `${16 * scale}px ${20 * scale}px`,
          background: 'rgba(14, 14, 20, 0.92)',
          borderRadius: 16 * scale,
          textAlign: 'center',
          wordBreak: 'keep-all',
          whiteSpace: 'pre-line',
          pointerEvents: 'none',
          boxShadow: `
            0 0 ${3 * scale}px #fff5b0,
            0 0 ${8 * scale}px #ffdd44,
            0 0 ${18 * scale}px #ffaa00,
            0 0 ${32 * scale}px rgba(255,170,0,0.4)
          `,
        }}>
          <Text
            size={20 * scale}
            weight={900}
            lineHeight={1.45}
            color="#fff"
            as="span"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
          >
            {TUTORIAL_MESSAGES['free-play']}
          </Text>
          {/* 카운터 */}
          <div style={{ marginTop: 10 * scale }}>
            <Text
              size={22 * scale}
              weight={900}
              color="#ffaa00"
              as="span"
              style={{ textShadow: '0 0 8px rgba(255,170,0,0.5), 0 2px 4px rgba(0,0,0,0.8)', letterSpacing: 1 }}
            >
              {freePlayCount.current} / {freePlayCount.target}
            </Text>
          </div>
        </div>
      )}

      {/* 다이얼로그 그룹 (박스 + 박스 밖 "탭해서 다음" 힌트) — transition/free-play 중엔 숨김 */}
      {!isTransition && !isFreePlay && message && <div style={{
        position: 'absolute',
        left: '50%',
        top: dialogTopPct,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12 * scale,
        pointerEvents: 'none',
      }}>
        {/* 메시지 박스 — 버튼 글로우와 같은 3단 halo (border 없음) */}
        <div style={{
          width: 280 * scale,
          padding: `${16 * scale}px ${20 * scale}px`,
          background: 'rgba(14, 14, 20, 0.92)',
          borderRadius: 16 * scale,
          textAlign: 'center',
          wordBreak: 'keep-all',
          whiteSpace: 'pre-line',
          boxShadow: `
            0 0 ${3 * scale}px #fff5b0,
            0 0 ${8 * scale}px #ffdd44,
            0 0 ${18 * scale}px #ffaa00,
            0 0 ${32 * scale}px rgba(255,170,0,0.4)
          `,
        }}>
          <Text
            size={20 * scale}
            weight={900}
            lineHeight={1.45}
            color="#fff"
            as="span"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
          >
            {message}
          </Text>
        </div>
        {/* 박스 밖 "탭해서 다음" 힌트 — 글로우 색상(앰버)과 매칭 */}
        {!interactive && (
          <div>
            <Text
              size={14 * scale}
              weight={700}
              color="#ffaa00"
              as="span"
              style={{
                letterSpacing: 0.5,
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                opacity: 0.9,
              }}
            >
              탭해서 다음 →
            </Text>
          </div>
        )}
      </div>}

    </div>
  );
}
