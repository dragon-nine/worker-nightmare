import { useEffect, useMemo, useState } from 'react';
import { gameBus, type GameOverData } from '../../game/event-bus';
import { useLayout } from '../hooks/useLayout';
import { TapButton } from '../components/TapButton';
import { storage } from '../../game/services/storage';
import { isAdRemoved } from '../../game/services/billing';
import { fetchLeaderboard } from '../../game/services/api';
import { LayoutText } from '../components/LayoutText';
import { LayoutButton } from '../components/LayoutButton';
import { buttonStyleDefaults, typeScale } from '../components/design-tokens';
import { RivalCard } from './RivalCard';
import { computePbMessage, computeRivalMessage, computeTopMessage, computeSurpassMessage, type RivalMessage } from './rival-message';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

// go-rabbit 슬롯은 GameOverScreen과 동일한 이미지 기준으로 크기가 계산됨 → 레이아웃 일치.
const IMAGE_MAP: Record<string, string> = {
  'go-rabbit': 'game-over-screen/gameover-rabbit.png',
};

interface Props {
  data: GameOverData;
  onSkip: () => void;
}

/**
 * 부활 화면 — 게임오버 레이아웃을 차용한 풀스크린 뷰.
 *
 * 슬롯 매핑:
 *  - bestText          → "이어서 도전?"
 *  - scoreText         → 현재 점수
 *  - go-rabbit         → 선택된 캐릭터 정면 이미지
 *  - go-btn-revive     → "광고 보고 부활" (광고 제거 구매자는 "이어서 도전")
 *  - go-btn-challenge  → "건너뛰기" (눈에 띄는 커스텀 스타일)
 *  - 나머지 (go-btn-home / restart / ranking / quoteText) → 제외
 */
export function ReviveScreen({ data, onSkip }: Props) {
  const { score, bestScore } = data;
  const adRemoved = isAdRemoved();

  // quoteText 슬롯은 RivalCard 로 재활용
  const excludeIds = useMemo(
    () => ['go-btn-ranking', 'go-btn-restart', 'go-btn-home'],
    [],
  );
  const { positions, elements, scale, ready } = useLayout('game-over', IMAGE_MAP, excludeIds);
  const characterId = storage.getSelectedCharacter();
  const [rival, setRival] = useState<RivalMessage | null>(null);

  // 격려 메시지 — Revive 는 도전/액션 톤.
  useEffect(() => {
    setRival(computePbMessage(score, bestScore, 'revive'));
    fetchLeaderboard('daily')
      .then((res) => {
        if (!res.me) return;
        const above = res.around?.above?.[0];
        if (!above) {
          setRival(computeTopMessage('revive'));
          return;
        }
        const anchor = Math.max(res.me.score, score);
        const gap = above.score - anchor;
        if (gap > 0) {
          setRival(computeRivalMessage(above.nickname, gap, 'revive'));
        } else {
          setRival(computeSurpassMessage('revive'));
        }
      })
      .catch(() => { /* 폴백 유지 */ });
  }, [score, bestScore]);

  const handleAdRevive = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('revive', undefined);
  };

  const handleSkip = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    onSkip();
  };

  const textOverrides: Record<string, string> = useMemo(() => ({
    'bestText': '이어서 도전?',
    'scoreText': `${score}`,
    'go-btn-revive': adRemoved ? '이어서 도전' : '광고 보고 부활',
    'go-btn-challenge': '건너뛰기',
  }), [score, adRemoved]);

  const clickHandlers: Record<string, () => void> = useMemo(() => ({
    'go-btn-revive': handleAdRevive,
    'go-btn-challenge': handleSkip,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  if (!ready) return null;

  const btnIds = new Set(['go-btn-revive', 'go-btn-challenge']);
  // 건너뛰기 슬롯 높이를 광고부활 버튼과 동일하게 맞추기 위해 참조
  const revivePos = positions.get('go-btn-revive');

  return (
    <div className={`${styles.overlay} ${styles.fadeIn}`}>
      {/* 부활 전용 어두운 블루 그라데이션 */}
      <div
        className={styles.gradient}
        style={{ background: 'linear-gradient(to bottom, #0a1a2a, #000000)' }}
      />

      {elements.map((el) => {
        const pos = positions.get(el.id);
        if (!pos) return null;

        // 건너뛰기 는 광고부활 과 동일한 높이 슬롯으로 렌더 (폰트/크기 맞춤)
        const isSkip = el.id === 'go-btn-challenge';
        const displayHeight = isSkip && revivePos ? revivePos.displayHeight : pos.displayHeight;
        const left = pos.x - pos.displayWidth * pos.originX;
        const top = pos.y - displayHeight * pos.originY;
        const onClick = clickHandlers[el.id];
        const isBtn = btnIds.has(el.id);

        const delay = isBtn ? '0.6s' : '0.3s';
        const finalDelay = el.id === 'go-btn-challenge' ? '0.8s' : delay;

        const content = el.id === 'go-rabbit' ? (
          <img
            src={`${BASE}character/${characterId}-front.png`}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transform: 'scale(1.25)',
              transformOrigin: 'center',
            }}
          />
        ) : el.id === 'quoteText' ? (
          rival ? <RivalCard msg={rival} scale={scale} /> : null
        ) : el.type === 'image' ? (
          <img
            src={`${BASE}${IMAGE_MAP[el.id]}`}
            alt={el.id}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        ) : el.id === 'go-btn-challenge' ? (
          <SkipButton scale={scale} text={textOverrides[el.id] ?? '건너뛰기'} />
        ) : el.type === 'button' ? (
          <LayoutButton el={el} scale={scale} overrideText={textOverrides[el.id]} />
        ) : (
          <LayoutText el={el} scale={scale} overrideText={textOverrides[el.id]} />
        );

        return (
          <div
            key={el.id}
            className={styles.fadeInUp}
            style={{
              position: 'absolute',
              left, top,
              width: pos.displayWidth,
              height: displayHeight,
              animationDelay: finalDelay,
            }}
          >
            {isBtn && onClick ? (
              <TapButton
                onTap={onClick}
                style={{ width: '100%', height: '100%' }}
              >
                {content}
              </TapButton>
            ) : content}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 건너뛰기 버튼 — 광고 부활 버튼과 동일한 사이즈/폰트(outline + sm scale).
 * 색상만 다르게 (어두운 블루 배경 위에 밝은 카드형) 해서 "같은 급의 선택지" 느낌.
 */
function SkipButton({ scale, text }: { scale: number; text: string }) {
  const ts = typeScale.sm;
  const bsd = buttonStyleDefaults.outline;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#e9ecf1',
        borderRadius: bsd.borderRadius * scale,
        border: `${bsd.borderWidth * scale}px solid ${bsd.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontSize: ts.fontSize * scale,
          fontWeight: ts.fontWeight,
          color: '#0a1a2a',
          letterSpacing: 0.3,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
    </div>
  );
}
