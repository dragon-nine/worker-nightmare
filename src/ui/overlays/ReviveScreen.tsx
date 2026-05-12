import { useEffect, useRef, useState } from 'react';
import { gameBus, type GameOverData } from '../../game/event-bus';
import { TapButton } from '../components/TapButton';
import { isAdRemoved } from '../../game/services/billing';
import { fetchLeaderboardNearScore } from '../../game/services/api';
import { computePbMessage, computeRivalMessage, computeTopMessage, computeSurpassMessage, type RivalMessage } from './rival-message';
import { isStageMode, getCurrentStageId } from '../../game/services/game-mode';
import { getStage } from '../../game/services/stages';
import styles from './overlay.module.css';

// 부활 선택 제한시간 — 안 누르면 자동 스킵 → 게임오버 화면으로 전환
const REVIVE_TIMEOUT_MS = 5000;

const DESIGN_W = 390;

// 모달 직후 backdrop 합성 click 차단 — 죽음 직전 탭이 부활 화면에 새는 걸 방지
// (ModalShell 과 동일 정책)
const BACKDROP_CLICK_LOCK_MS = 260;

interface Props {
  data: GameOverData;
  onSkip: () => void;
}

/**
 * 부활 모달 — 게임 화면 위 반투명 dim + 가운데 카드.
 * 5초 후 자동 스킵 → skip 버튼 배경에 카운트다운 progress bar 로 시각화.
 *
 * 구성:
 *  - 헤더: "이어서 도전?"
 *  - 큰 현재 점수
 *  - 라이벌/격려 메시지 (RivalMessage 기반)
 *  - 광고 보고 부활 버튼 (광고 제거 구매자는 "이어서 도전")
 *  - 건너뛰기 버튼 (progress bar 자동 채워짐)
 */
export function ReviveScreen({ data, onSkip }: Props) {
  const { score, bestScore } = data;
  const adRemoved = isAdRemoved();
  const stageMode = isStageMode();
  // PB 메시지가 즉시 폴백 — 리더보드 응답 오면 라이벌/탑 메시지로 갱신.
  // 스테이지 모드는 라이벌 메시지 대신 별도 stage 목표 멘트를 표시하므로 null 시작.
  const [rival, setRival] = useState<RivalMessage | null>(() =>
    stageMode ? null : computePbMessage(score, bestScore, 'revive'),
  );

  // 광고 부활 클릭 후 → 카운트다운/입력 정지. 광고 콜백이 screen-change 처리할 때까지 대기.
  const adInFlightRef = useRef(false);

  // 5초 카운트다운 — 0 도달 시 자동 onSkip (단, 광고 진행 중이면 차단)
  const [msLeft, setMsLeft] = useState(REVIVE_TIMEOUT_MS);
  const onSkipRef = useRef(onSkip);
  useEffect(() => { onSkipRef.current = onSkip; }, [onSkip]);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      if (adInFlightRef.current) return; // 광고 진행 중 → 자동 skip 차단
      const elapsed = performance.now() - start;
      const left = Math.max(0, REVIVE_TIMEOUT_MS - elapsed);
      setMsLeft(left);
      if (left <= 0) {
        onSkipRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // backdrop(카드 외 영역) 탭 → 건너뛰기와 동일하게 onSkip.
  // raw onClick 금지 (Galaxy WebView 합성 이벤트 중복) → native click + contains 체크.
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const mountedAtRef = useRef(0);
  useEffect(() => {
    mountedAtRef.current = performance.now();
    const root = backdropRef.current;
    if (!root) return;
    const handler = (e: MouseEvent) => {
      if (adInFlightRef.current) return; // 광고 진행 중 → backdrop 무시
      if (performance.now() - mountedAtRef.current < BACKDROP_CLICK_LOCK_MS) return;
      // 카드 내부 클릭(부활/스킵 버튼 등)은 무시 — 자체 핸들러로 처리됨
      if (cardRef.current?.contains(e.target as Node)) return;
      onSkipRef.current();
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }, []);

  // 격려 메시지 — 이판 점수 anchor 로 바로 위 랭커 조회 → 부활 후 따라잡을 실제 목표.
  // (초기값은 PB 폴백, 응답 오면 갱신). 스테이지 모드는 라이벌 비교 무관 → skip.
  useEffect(() => {
    if (stageMode) return;
    fetchLeaderboardNearScore('daily', score)
      .then((res) => {
        const above = res.above?.[0];
        if (!above) {
          setRival(computeTopMessage('revive'));
          return;
        }
        const gap = above.score - score;
        if (gap > 0) {
          setRival(computeRivalMessage(above.nickname, gap, 'revive'));
        } else {
          setRival(computeSurpassMessage('revive'));
        }
      })
      .catch(() => { /* PB 폴백 유지 */ });
  }, [score, stageMode]);

  const handleAdRevive = () => {
    if (adInFlightRef.current) return; // 중복 클릭 차단
    adInFlightRef.current = true;
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('revive', undefined);
  };

  const handleSkip = () => {
    if (adInFlightRef.current) return;
    gameBus.emit('play-sfx', 'sfx-click');
    onSkip();
  };

  // 화면 스케일 — 다른 화면들과 동일 기준 (useLayout 과 동일 공식)
  const scale = Math.min(window.innerWidth, 500) / DESIGN_W;
  const progress = msLeft / REVIVE_TIMEOUT_MS; // 1 → 0
  const secondsLeft = Math.max(1, Math.ceil(msLeft / 1000));

  return (
    <div
      ref={backdropRef}
      className={`${styles.overlay} ${styles.fadeIn}`}
      style={{ cursor: 'pointer' }}
    >
      {/* 게임 화면 위 반투명 dim — 게임 씬이 뒤에 비쳐 보임 */}
      <div className={styles.gradient} style={{ background: 'rgba(0, 0, 0, 0.55)' }} />

      {/* 모달 카드 + 하단 안내 문구 — 화면 중앙 정렬 (column) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          ref={cardRef}
          className={styles.fadeInUp}
          style={{
            width: 312 * scale,
            background: 'linear-gradient(180deg, #1f2536, #14181f)',
            borderRadius: 20 * scale,
            padding: `${24 * scale}px ${22 * scale}px ${18 * scale}px`,
            boxShadow: `0 ${10 * scale}px ${32 * scale}px rgba(0,0,0,0.55)`,
            border: `${2 * scale}px solid rgba(255,255,255,0.06)`,
            cursor: 'default',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14 * scale,
            boxSizing: 'border-box',
          }}
        >
          {/* 타이틀 */}
          <div
            style={{
              fontFamily: 'GMarketSans, sans-serif',
              fontSize: 22 * scale,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: 0.4,
            }}
          >
            이어서 도전?
          </div>

          {/* 큰 점수 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6 * scale,
              marginTop: -2 * scale,
            }}
          >
            <span
              style={{
                fontFamily: 'GMarketSans, sans-serif',
                fontSize: 64 * scale,
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: -0.5,
                textShadow: `0 ${2 * scale}px ${12 * scale}px rgba(96,165,250,0.35)`,
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontFamily: 'GMarketSans, sans-serif',
                fontSize: 18 * scale,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 0.3,
              }}
            >
              점
            </span>
          </div>

          {/* 격려 메시지 — 스테이지 모드는 목표 점수 비교, 무한 모드는 라이벌/PB */}
          {stageMode
            ? <StageGoalLine scale={scale} score={score} />
            : (rival && <RivalLine msg={rival} scale={scale} />)}

          {/* 광고 보고 부활 */}
          <TapButton onTap={handleAdRevive} style={{ width: '100%' }}>
            <div
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #e5332f, #771615)',
                color: '#fff',
                fontFamily: 'GMarketSans, sans-serif',
                fontSize: 18 * scale,
                fontWeight: 900,
                padding: `${14 * scale}px 0`,
                textAlign: 'center',
                borderRadius: 12 * scale,
                border: `${2 * scale}px solid #000`,
                letterSpacing: 0.4,
                boxSizing: 'border-box',
                WebkitTextStroke: `${1.2 * scale}px #000`,
                paintOrder: 'stroke fill',
              }}
            >
              {adRemoved ? '이어서 도전' : '광고 보고 부활'}
            </div>
          </TapButton>

          {/* 건너뛰기 — 카운트다운 progress bar 내장 */}
          <TapButton onTap={handleSkip} style={{ width: '100%' }}>
            <SkipButtonWithProgress
              scale={scale}
              progress={progress}
              secondsLeft={secondsLeft}
            />
          </TapButton>
        </div>

        {/* 하단 안내 — 다른 모달들과 동일 패턴 */}
        <div
          style={{
            marginTop: 12 * scale,
            fontFamily: 'GMarketSans, sans-serif',
            fontSize: 13 * scale,
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            letterSpacing: 0.3,
          }}
        >
          화면 터치 시 게임오버 화면으로 이동
        </div>
      </div>
    </div>
  );
}

/**
 * 건너뛰기 버튼 — 시간 흐를수록 좌→우로 채워지는 progress bar 가 배경에 깔림.
 * 다 채워지면 자동 스킵. 텍스트는 "건너뛰기 (N)" 형태로 남은 초 표시.
 */
function SkipButtonWithProgress({ scale, progress, secondsLeft }: {
  scale: number; progress: number; secondsLeft: number;
}) {
  // progress: 1 (full time) → 0 (timeout). filled = 시간 소진 %.
  const filledPct = (1 - progress) * 100;
  return (
    <div
      style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#e9ecf1',
        borderRadius: 12 * scale,
        border: `${2 * scale}px solid #000`,
        padding: `${14 * scale}px 0`,
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* 진행 바 — 채워질수록 시간이 줄어듬 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${filledPct}%`,
          background: 'rgba(10, 26, 42, 0.12)',
        }}
      />
      <span
        style={{
          position: 'relative',
          fontFamily: 'GMarketSans, sans-serif',
          fontSize: 18 * scale,
          fontWeight: 700,
          color: '#0a1a2a',
          letterSpacing: 0.3,
        }}
      >
        건너뛰기 ({secondsLeft})
      </span>
    </div>
  );
}

/**
 * 라이벌/격려 메시지 한 줄 — RivalCard 와 비슷하지만 콘텐츠 기반 높이.
 * (모달 안에서 자동 높이가 필요해 별도 인라인 컴포넌트로 분리)
 */
/** 스테이지 모드용 격려 멘트 — "N점 더 획득하고 레벨 X 클리어?" */
function StageGoalLine({ scale, score }: { scale: number; score: number }) {
  const stageId = getCurrentStageId();
  const stage = getStage(stageId);
  if (!stage) return null;
  const gap = Math.max(0, stage.targetScore - score);
  const text = gap > 0
    ? `${gap}점 더 획득하고 레벨 ${stageId} 클리어?`
    : `이대로 레벨 ${stageId} 클리어!`;
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2 * scale,
      }}
    >
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontSize: 14 * scale,
          fontWeight: 800,
          color: '#ffd24a',
          letterSpacing: 0.3,
          textAlign: 'center',
        }}
      >
        {text}
      </span>
    </div>
  );
}

function RivalLine({ msg, scale }: { msg: RivalMessage; scale: number }) {
  const accent = msg.kind === 'rival' ? '#ffd24a'
    : msg.kind === 'top' ? '#ffd24a'
    : msg.kind === 'pb-new' ? '#7ce4ff'
    : 'rgba(255,255,255,0.78)';
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2 * scale,
        padding: `${8 * scale}px ${12 * scale}px`,
        borderRadius: 10 * scale,
        background: 'rgba(0,0,0,0.35)',
        border: `${1 * scale}px solid ${accent}55`,
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontSize: 15 * scale,
          fontWeight: 900,
          color: accent,
          letterSpacing: 0.3,
          WebkitTextStroke: `${1.2 * scale}px #000`,
          paintOrder: 'stroke fill',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {msg.title}
      </span>
      {msg.subtitle && (
        <span
          style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontSize: 11 * scale,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: 0.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {msg.subtitle}
        </span>
      )}
    </div>
  );
}
