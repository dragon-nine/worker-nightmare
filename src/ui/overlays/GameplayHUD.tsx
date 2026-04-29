import { useState, useEffect, useCallback, useRef } from 'react';
import { gameBus, type BattleHudData, type TutorialStep } from '../../game/event-bus';
import { hudState } from '../../game/hud-state';
import { isBattleMode } from '../../game/services/game-mode';
import { storage } from '../../game/services/storage';
import { useLayout } from '../hooks/useLayout';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import { TutorialOverlay } from './TutorialOverlay';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

const IMAGE_MAP: Record<string, string> = {
  'gauge-bar': 'ui/gauge-empty.png',
  'btn-pause': 'ui/btn-pause.png',
  'btn-switch': 'ui/btn-switch.png',
  'btn-forward': 'ui/btn-forward.png',
};

export function GameplayHUD() {
  const battleMode = isBattleMode();
  const { positions, elements, scale, ready } = useLayout('gameplay', IMAGE_MAP);
  // 점수/코인 초기값은 ref로만 보유. React state 안 씀 → 탭마다 리렌더 안 됨.
  // (리렌더가 일어나면 iOS WebKit이 탭 이벤트 드롭함)
  const scoreRef = useRef<HTMLSpanElement>(null);
  const coinsRef = useRef<HTMLSpanElement>(null);
  const gaugeFillRef = useRef<HTMLDivElement>(null);
  // 콤보 카운트 — DOM 직접 조작 (입력마다 바뀌므로 리렌더 회피)
  const comboBoxRef = useRef<HTMLDivElement>(null);
  const comboCountRef = useRef<HTMLSpanElement>(null);
  const tutorialDone = storage.getBool('tutorialDone');
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(tutorialDone ? 'done' : 'intro');
  const [battleHud, setBattleHud] = useState<BattleHudData | null>(null);
  const [battleCountdown, setBattleCountdown] = useState<number | null>(null);
  // 콤보 단계 — level 2 (10+ 연속) 일 때 점수 색상 변경. 글로우/오라 같은 추가 효과는 없음.
  const [comboLevel, setComboLevel] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    // 점수 — DOM 직접 조작 (리렌더 0번)
    const unsub1 = gameBus.on('score-update', (s) => {
      if (scoreRef.current) scoreRef.current.textContent = String(s);
    });
    // 타이머 — DOM 직접 조작
    const unsub2 = gameBus.on('timer-update', (pct) => {
      const el = gaugeFillRef.current;
      if (!el) return;
      const slantPct = el.dataset['slantPct'] ? parseFloat(el.dataset['slantPct']) : 0;
      const fillPct = pct * 100;
      const bottomPct = Math.max(0, fillPct - slantPct);
      el.style.clipPath = `polygon(0% 0%, ${fillPct}% 0%, ${bottomPct}% 100%, 0% 100%)`;
    });
    // 튜토리얼 스텝 — 튜토리얼 중에만 구독 (완료 상태에선 리스너 생략)
    const unsub3 = tutorialDone
      ? () => {}
      : gameBus.on('tutorial-step', setTutorialStep);
    // 코인 — DOM 직접 조작
    const unsub4 = gameBus.on('coin-update', (c) => {
      if (coinsRef.current) coinsRef.current.textContent = String(c);
    });
    const unsub5 = gameBus.on('battle-update', (data) => {
      setBattleHud(data);
    });
    const unsub6 = gameBus.on('battle-countdown', (value) => {
      setBattleCountdown(value);
    });
    const unsub7 = gameBus.on('combo-state', ({ count, level }) => {
      const box = comboBoxRef.current;
      const num = comboCountRef.current;
      if (!box || !num) return;
      // 콤보 popup 은 level >= 1 (count >= 5) 부터 노출. level 0 (count 1~4) 은 표시 안 함.
      // fade out 중엔 setComboLevel 호출 안 해서 마지막 level 색 그대로 유지하며 사라짐
      // (reset 시 잠깐 level 0 노란색이 비치는 잔상 방지).
      if (level >= 1) {
        setComboLevel(level);
        num.textContent = String(count);
        box.style.opacity = '1';
        box.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.35)', offset: 0.4 },
            { transform: 'scale(1)' },
          ],
          { duration: 260, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
        );
      } else {
        box.style.opacity = '0';
      }
    });
    // 초기값 주입 (재마운트/부활 시 깜빡임 방지)
    if (scoreRef.current) scoreRef.current.textContent = String(hudState.getScore());
    if (coinsRef.current) coinsRef.current.textContent = String(hudState.getCoins());
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); };
  }, [tutorialDone]);

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
      {gaugePos && (() => {
        const gaugeHighlight =
          tutorialStep === 'gauge-intro' ||
          tutorialStep === 'timeout-warning' ||
          tutorialStep === 'timeout-reassure' ||
          tutorialStep === 'recovery-intro' ||
          tutorialStep === 'speed-tip';
        return (
        <div
          style={{
            ...boxStyle('gauge-bar'),
            // transition-road 중: DOM 미러(z-index 121) 위로 올림. gauge-intro 류: 딤 위로. 그 외: 기본.
            ...(tutorialStep === 'transition-road' ? { zIndex: 125 } :
                gaugeHighlight ? { zIndex: 121 } : {}),
          }}
          className={gaugeHighlight ? styles.tutorialGlow : undefined}
        >
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
        );
      })()}

      {/* 일시정지 버튼 — transition-road 중엔 미러 위로 올림 */}
      <TapButton
        onTap={handlePause}
        style={{
          ...boxStyle('btn-pause'),
          pointerEvents: 'auto',
          ...(tutorialStep === 'transition-road' ? { zIndex: 125 } : {}),
        }}
      >
        <img
          src={`${BASE}ui/btn-pause.png`}
          alt="일시정지"
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
          draggable={false}
        />
      </TapButton>

      {/* 코인 카운터 — 우측 상단 (일시정지 버튼 아래) */}
      {!battleMode && (() => {
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
              ...(tutorialStep === 'transition-road' ? { zIndex: 125 } : {}),
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
              ref={coinsRef}
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
              {hudState.getCoins()}
            </Text>
          </div>
        );
      })()}

      {/* 점수 — 콤보 영향 없음, 항상 기본 스타일 */}
      {pos('scoreText') && !(battleMode && battleCountdown !== null) && (
        <Text
          ref={scoreRef}
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
            ...(tutorialStep === 'transition-road' ? { zIndex: 125 } : {}),
          }}
        >
          {hudState.getScore()}
        </Text>
      )}

      {/* 콤보 카운트 — 점수 바로 아래. count >= 2 일 때 페이드인 + 매 증가마다 바운스. 레벨에 따라 색/크기 progressively. */}
      {pos('scoreText') && !(battleMode && battleCountdown !== null) && (() => {
        const sp = pos('scoreText')!;
        const scoreBoxLeft = sp.x - sp.displayWidth * sp.originX;
        const scoreBoxTop = sp.y - sp.displayHeight * sp.originY;
        const comboTop = scoreBoxTop + scoreFontSize * 1.25;
        const baseSize = Math.max(13 * scale, scoreFontSize * 0.21);
        const levelMult = comboLevel >= 2 ? 1.25 : (comboLevel >= 1 ? 1.1 : 1.0);
        const comboFontSize = baseSize * levelMult;
        const comboFull = comboLevel >= 2;
        const comboPartial = comboLevel >= 1;
        const comboColor = comboFull ? '#ffffff' : (comboPartial ? '#fff5d8' : '#ffd24a');
        const comboStroke = comboFull ? '#f5f784' : '#321900';
        const comboGlow = comboFull
          ? `0 0 ${5 * scale}px #74edf2, 0 0 ${12 * scale}px rgba(116,237,242,0.7)`
          : (comboPartial ? `0 0 ${5 * scale}px rgba(255,210,74,0.7)` : `0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.5)`);
        return (
          <div
            ref={comboBoxRef}
            style={{
              position: 'absolute',
              top: `calc(var(--sat, 0px) + ${comboTop}px)`,
              left: scoreBoxLeft,
              width: sp.displayWidth,
              display: 'flex',
              justifyContent: 'center',
              opacity: 0,
              pointerEvents: 'none',
              transformOrigin: 'center center',
              transition: 'opacity 0.18s ease-out',
              ...(tutorialStep === 'transition-road' ? { zIndex: 125 } : {}),
            }}
          >
            <Text
              size={comboFontSize}
              weight={900}
              color={comboColor}
              style={{
                WebkitTextStroke: `${3 * scale}px ${comboStroke}`,
                paintOrder: 'stroke fill',
                letterSpacing: 0.5,
                lineHeight: 1,
                textShadow: comboGlow,
                whiteSpace: 'nowrap',
              }}
            >
              <span ref={comboCountRef} style={{ fontSize: comboFontSize * 1.5 }}>0</span>
              <span
                style={{
                  fontSize: comboFontSize * 1.35,
                  marginLeft: comboFontSize * 0.3,
                  WebkitTextStroke: `${2.4 * scale}px ${comboStroke}`,
                }}
              >COMBO!</span>
            </Text>
          </div>
        );
      })()}

      {/* 튜토리얼 스텝에 따라 버튼 활성/비활성 — prompt-forward 에선 switch 잠금 등 */}
      {(() => {
        const isDone = tutorialStep === 'done';
        // 활성 스텝: done / prompt-forward(=forward) / prompt-switch(=switch) / free-play(=둘다)
        const switchEnabled  = isDone || tutorialStep === 'prompt-switch' || tutorialStep === 'free-play';
        const forwardEnabled = isDone || tutorialStep === 'prompt-forward' || tutorialStep === 'free-play';
        const switchDisabled  = !switchEnabled;
        const forwardDisabled = !forwardEnabled;
        // 하이라이트: prompt-* 스텝만 (free-play 는 힌트 없음)
        const switchHighlight  = tutorialStep === 'prompt-switch';
        const forwardHighlight = tutorialStep === 'prompt-forward';
        const dimStyle = (disabled: boolean): React.CSSProperties => ({
          pointerEvents: disabled ? 'none' : 'auto',
          opacity: disabled ? 0.65 : 1,
          transition: 'opacity 0.2s',
        });
        return (
          <>
            {/* 좌측 버튼 (방향 전환) */}
            <TapButton
              onTap={handleSwitch}
              pressScale={0.85}
              rapid
              style={{
                ...boxStyle('btn-switch'),
                ...dimStyle(switchDisabled),
                ...(switchHighlight ? { zIndex: 121 } : {}),
              }}
            >
              <img
                src={`${BASE}ui/btn-switch.png`}
                alt="전환"
                className={switchHighlight ? styles.tutorialGlow : undefined}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
                draggable={false}
              />
            </TapButton>

            {/* 우측 버튼 (전진) */}
            <TapButton
              onTap={handleForward}
              pressScale={0.85}
              rapid
              style={{
                ...boxStyle('btn-forward'),
                ...dimStyle(forwardDisabled),
                ...(forwardHighlight ? { zIndex: 121 } : {}),
              }}
            >
              <img
                src={`${BASE}ui/btn-forward.png`}
                alt="전진"
                className={forwardHighlight ? styles.tutorialGlow : undefined}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
                draggable={false}
              />
            </TapButton>
          </>
        );
      })()}
      {battleHud && <BattleRaceLane data={battleHud} scale={scale} />}
      {battleMode && battleCountdown !== null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            size={72 * scale}
            weight={900}
            color="#fff5d8"
            style={{
              WebkitTextStroke: `${4 * scale}px #000`,
              paintOrder: 'stroke fill',
              textShadow: `0 0 ${18 * scale}px rgba(255,216,107,0.35)`,
            }}
          >
            {battleCountdown}
          </Text>
        </div>
      )}
      {/* 튜토리얼 오버레이 — 스텝별 다이얼로그/딤/하이라이트 */}
      {!battleMode && <TutorialOverlay />}
    </div>
  );
}

function BattleRaceLane({
  data,
  scale,
}: {
  data: BattleHudData;
  scale: number;
}) {
  const trackH = 318 * scale;
  const trackW = 34 * scale;
  const playerScore = Math.max(0, data.playerScore);
  const opponentScore = Math.max(0, data.opponentScore);
  const maxScore = Math.max(120, playerScore, opponentScore) + 40;
  const playerPct = Math.min(1, playerScore / maxScore);
  const opponentPct = Math.min(1, opponentScore / maxScore);
  const playerBottom = 12 * scale + playerPct * (trackH - 30 * scale);
  const opponentBottom = 12 * scale + opponentPct * (trackH - 30 * scale);
  const leadText =
    playerScore === opponentScore
      ? '접전'
      : playerScore > opponentScore
      ? `우세 +${playerScore - opponentScore}`
      : `추격 ${opponentScore - playerScore}`;

  return (
    <div
      style={{
        position: 'absolute',
        left: 8 * scale,
        top: `calc(var(--sat, 0px) + ${92 * scale}px)`,
        width: 68 * scale,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          marginBottom: 8 * scale,
          padding: `${5 * scale}px ${6 * scale}px`,
          borderRadius: 12 * scale,
          background: 'rgba(5,12,20,0.78)',
          border: `${1 * scale}px solid rgba(124,228,255,0.24)`,
          boxShadow: `0 ${2 * scale}px ${10 * scale}px rgba(0,0,0,0.35)`,
        }}
      >
        <Text size={10 * scale} weight={900} color="#7ce4ff" align="center">
          BOT 대전
        </Text>
        <Text size={9 * scale} weight={700} color="rgba(255,255,255,0.72)" align="center">
          {data.opponentName}
        </Text>
      </div>

      <div
        style={{
          position: 'relative',
          width: trackW,
          height: trackH,
          margin: '0 auto',
          borderRadius: 999,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
          border: `${1.5 * scale}px solid rgba(255,255,255,0.12)`,
          boxShadow: `inset 0 ${1 * scale}px 0 rgba(255,255,255,0.08), 0 ${4 * scale}px ${14 * scale}px rgba(0,0,0,0.3)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 10 * scale,
            bottom: 10 * scale,
            width: 2 * scale,
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 999,
          }}
        />

        <BattleMarker
          src={`${BASE}character/${data.opponentCharacter}-front.png`}
          color="#7ce4ff"
          bottom={opponentBottom}
          side="left"
          scale={scale}
        />
        <BattleMarker
          src={`${BASE}character/${storage.getSelectedCharacter()}-front.png`}
          color="#ffd24a"
          bottom={playerBottom}
          side="right"
          scale={scale}
        />
      </div>

      <div
        style={{
          marginTop: 8 * scale,
          padding: `${5 * scale}px ${6 * scale}px`,
          borderRadius: 12 * scale,
          background: 'rgba(5,12,20,0.78)',
          border: `${1 * scale}px solid rgba(255,255,255,0.1)`,
        }}
      >
        <Text size={9 * scale} weight={900} color="#fff" align="center">
          {leadText}
        </Text>
      </div>
    </div>
  );
}

function BattleMarker({
  src,
  color,
  bottom,
  side,
  scale,
}: {
  src: string;
  color: string;
  bottom: number;
  side: 'left' | 'right';
  scale: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        [side]: -11 * scale,
        bottom,
        width: 26 * scale,
        height: 26 * scale,
        transform: 'translateY(50%)',
        borderRadius: '50%',
        background: 'rgba(10,14,22,0.96)',
        border: `${2 * scale}px solid ${color}`,
        boxShadow: `0 0 ${10 * scale}px ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: '82%', height: '82%', objectFit: 'contain' }}
      />
    </div>
  );
}
