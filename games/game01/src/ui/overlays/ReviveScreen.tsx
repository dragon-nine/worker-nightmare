import { useMemo } from 'react';
import { gameBus, type GameOverData } from '../../game/event-bus';
import { useLayout } from '../hooks/useLayout';
import { TapButton } from '../components/TapButton';
import { GemIcon } from '../components/CurrencyIcons';
import { storage } from '../../game/services/storage';
import { isAdRemoved } from '../../game/services/billing';
import { LayoutText } from '../components/LayoutText';
import { LayoutButton } from '../components/LayoutButton';
import { buttonStyleDefaults, typeScale } from '../components/design-tokens';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';
const REVIVE_GEM_COST = 2;

// go-rabbit 슬롯의 크기는 IMAGE_MAP의 자연 크기에서 계산됨.
// GameOverScreen과 동일하게 gameover-rabbit.png 를 기준으로 삼아 슬롯 크기를 동일하게 유지 →
// 레이아웃(gap 등)이 게임오버 화면과 일치.
const IMAGE_MAP: Record<string, string> = {
  'go-rabbit': 'game-over-screen/gameover-rabbit.png',
};

interface Props {
  data: GameOverData;
  onSkip: () => void;
}

/**
 * 부활 화면 — 게임오버 레이아웃을 차용한 풀스크린 뷰.
 * 모달이 아니라 GameOverScreen과 동일한 구조를 사용.
 *
 * 슬롯 매핑:
 *  - bestText      → "한 번 더 도전?"
 *  - scoreText     → 현재 점수 (그대로)
 *  - go-rabbit     → 선택된 캐릭터 정면 이미지
 *  - go-btn-revive → "광고 보고 부활"
 *  - go-btn-home   → "보석 2 부활"
 *  - go-btn-challenge → "건너뛰기" (skip)
 *  - go-btn-ranking → 제외
 *  - quoteText     → 제외
 */
export function ReviveScreen({ data, onSkip }: Props) {
  const { score } = data;

  // 부활 광고 제거 구매자는 보석 부활 버튼도 숨김 (광고 버튼 문구도 아래에서 교체)
  const adRemoved = isAdRemoved();

  // 부활 화면에서는 멘트와 ranking 버튼 숨김 + 광고 제거 시 보석 부활도 숨김
  const excludeIds = useMemo(
    () => {
      const ids = ['quoteText', 'go-btn-ranking'];
      if (adRemoved) ids.push('go-btn-home');
      return ids;
    },
    [adRemoved],
  );
  const { positions, elements, scale, ready } = useLayout('game-over', IMAGE_MAP, excludeIds);

  const characterId = storage.getSelectedCharacter();
  const gems = storage.getNum('gems');
  const canAffordGems = gems >= REVIVE_GEM_COST;

  const handleAdRevive = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('revive', undefined);
  };

  const handleGemRevive = () => {
    if (!canAffordGems) {
      gameBus.emit('toast', `보석 ${REVIVE_GEM_COST}개가 필요해요`);
      return;
    }
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('revive-with-gems', undefined);
  };

  const handleSkip = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    onSkip();
  };

  const textOverrides: Record<string, string> = useMemo(() => ({
    'bestText': '이어서 도전?',
    'scoreText': `${score}`,
    // 부활 광고 제거 구매자 → 광고 없이 바로 부활 ("이어서 도전")
    'go-btn-revive': adRemoved ? '이어서 도전' : '광고 보고 부활',
    // 보석 부활 — 보유/필요 개수 함께 표시 (예: "보석 쓰고 부활  0/2")
    'go-btn-home': `보석 쓰고 부활  ${gems}/${REVIVE_GEM_COST}`,
    'go-btn-challenge': '건너뛰기',
  }), [score, adRemoved, gems]);

  const clickHandlers: Record<string, () => void> = useMemo(() => ({
    'go-btn-revive': handleAdRevive,
    'go-btn-home': handleGemRevive,
    'go-btn-challenge': handleSkip,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [canAffordGems]);

  if (!ready) return null;

  const btnIds = new Set(['go-btn-revive', 'go-btn-home', 'go-btn-challenge']);

  return (
    <div className={`${styles.overlay} ${styles.fadeIn}`}>
      {/* 그라데이션 배경 — 부활은 다른 톤 (어두운 블루) */}
      <div
        className={styles.gradient}
        style={{ background: 'linear-gradient(to bottom, #0a1a2a, #000000)' }}
      />

      {elements.map((el) => {
        const pos = positions.get(el.id);
        if (!pos) return null;

        const left = pos.x - pos.displayWidth * pos.originX;
        const top = pos.y - pos.displayHeight * pos.originY;
        const onClick = clickHandlers[el.id];
        const isBtn = btnIds.has(el.id);

        const delay = isBtn ? '0.6s' : '0.3s';
        const finalDelay = el.id === 'go-btn-challenge' ? '0.8s' : delay;

        const content = el.id === 'go-rabbit' ? (
          // 토끼 슬롯에 선택된 캐릭터 정면 이미지 렌더 (transparent padding 보정을 위해 1.25배 확대)
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
        ) : el.type === 'button' ? (
          <ReviveButtonContent el={el} scale={scale} overrideText={textOverrides[el.id]} canAffordGems={canAffordGems} />
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
              height: pos.displayHeight,
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
 * 부활 화면의 버튼 렌더.
 * - go-btn-home (보석 부활): 아이콘 + 텍스트 인라인 커스텀 렌더
 * - 나머지: LayoutButton 재사용
 */
function ReviveButtonContent({
  el,
  scale,
  overrideText,
  canAffordGems,
}: {
  el: import('../../game/layout-types').LayoutElement;
  scale: number;
  overrideText?: string;
  canAffordGems: boolean;
}) {
  if (el.id !== 'go-btn-home') {
    return <LayoutButton el={el} scale={scale} overrideText={overrideText} />;
  }

  // 보석 부활 버튼 — 아이콘 + 텍스트 인라인
  const bs = el.buttonStyle;
  const bsd = buttonStyleDefaults[bs?.styleType || 'outline'];
  const scaleKey = bs?.scaleKey || 'sm';
  const ts = typeScale[scaleKey] || typeScale.sm;
  const bgStyle = bs?.bgColor || '#24282c';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bgStyle,
        borderRadius: bsd.borderRadius * scale,
        border: bsd.borderWidth > 0
          ? `${bsd.borderWidth * scale}px solid ${bsd.borderColor}`
          : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8 * scale,
        opacity: canAffordGems ? 1 : 0.55,
      }}
    >
      <GemIcon size={24 * scale} />
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontSize: ts.fontSize * scale,
          fontWeight: ts.fontWeight,
          color: '#fff',
          WebkitTextStroke: ts.stroke ? `${ts.stroke * scale}px #000` : undefined,
          paintOrder: 'stroke fill',
          whiteSpace: 'nowrap',
        }}
      >
        {overrideText}
      </span>
    </div>
  );
}
