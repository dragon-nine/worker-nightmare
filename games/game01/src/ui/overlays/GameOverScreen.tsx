import { useMemo, useState } from 'react';
import { gameBus, type GameOverData } from '../../game/event-bus';
import { useLayout } from '../hooks/useLayout';
import { TapButton } from '../components/TapButton';
import { CoinIcon } from '../components/CurrencyIcons';
import { adService } from '../../game/services/ad-service';
import { openLeaderboard } from '../../game/services/leaderboard';
import { logClick, logEvent } from '../../game/services/analytics';
import { storage } from '../../game/services/storage';
import { getRandomQuote } from '../../game/game-over-quotes';
import { LayoutText } from '../components/LayoutText';
import { LayoutButton } from '../components/LayoutButton';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

const IMAGE_MAP: Record<string, string> = {
  'go-rabbit': 'game-over-screen/gameover-rabbit.png',
};

interface Props {
  data: GameOverData;
}

export function GameOverScreen({ data }: Props) {
  const { score, bestScore, coinsEarned } = data;
  // 부활 모달은 별도 화면이므로 부활 버튼 슬롯을 "광고 2배" 로 재사용
  // 멘트(quoteText)는 숨김
  const excludeIds = useMemo(() => ['quoteText'], []);
  const { positions, elements, scale, ready } = useLayout('game-over', IMAGE_MAP, excludeIds);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const canBonus = coinsEarned > 0 && !bonusClaimed;

  // 텍스트 내용 오버라이드 (동적 값)
  const quote = useMemo(() => getRandomQuote(), []);
  const textOverrides: Record<string, string> = useMemo(() => ({
    'bestText': `최고기록 ${bestScore}`,
    'scoreText': `${score}`,
    'quoteText': quote,
    // 부활 버튼 슬롯을 "광고 2배" 로 재활용
    'go-btn-revive': bonusClaimed ? '✓ 2배 받음' : '광고 보고 코인 2배',
  }), [score, bestScore, quote, bonusClaimed, coinsEarned]);

  const handleBonus = () => {
    if (bonusClaimed) return;
    if (coinsEarned <= 0) {
      gameBus.emit('toast', '획득한 코인이 없어요');
      return;
    }
    gameBus.emit('play-sfx', 'sfx-click');
    adService.showRewarded('coin', (result) => {
      if (result.kind === 'rewarded') {
        setBonusClaimed(true);
        storage.addNum('coins', coinsEarned);
        storage.recordCoinEarned(coinsEarned);
        storage.recordAdWatched();
        logEvent('reward_2x_claim', { coinsEarned });
        gameBus.emit('show-reward', [{ kind: 'coin', amount: coinsEarned }]);
      } else if (result.kind === 'skipped') {
        gameBus.emit('toast', '광고를 끝까지 봐주세요');
      } else {
        gameBus.emit('toast', '광고를 불러올 수 없어요');
      }
    });
  };

  // handleBonus가 state에 의존하므로 deps에 포함시켜 핸들러를 재생성
  const clickHandlers: Record<string, () => void> = useMemo(() => ({
    'go-btn-revive': handleBonus,
    'go-btn-home': () => {
      gameBus.emit('play-sfx', 'sfx-click');
      gameBus.emit('go-home', undefined);
    },
    'go-btn-challenge': () => {
      gameBus.emit('play-sfx', 'sfx-click');
      logClick('challenge_send');
      gameBus.emit('show-challenge', score);
    },
    'go-btn-ranking': () => {
      gameBus.emit('play-sfx', 'sfx-click');
      logClick('leaderboard_open');
      openLeaderboard();
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [score, canBonus, coinsEarned, bonusClaimed]);

  if (!ready) return null;

  // 버튼 vs 텍스트/이미지 분류 → 딜레이 다르게
  const btnIds = new Set(['go-btn-revive', 'go-btn-home', 'go-btn-challenge', 'go-btn-ranking']);

  return (
    <div className={`${styles.overlay} ${styles.fadeIn}`}>
      {/* 그라데이션 배경 */}
      <div
        className={styles.gradient}
        style={{ background: 'linear-gradient(to bottom, #2a0c10, #000000)' }}
      />

      {/* 레이아웃 요소들 — admin과 동일한 렌더링 */}
      {elements.map((el) => {
        const pos = positions.get(el.id);
        if (!pos) return null;

        const left = pos.x - pos.displayWidth * pos.originX;
        const top = pos.y - pos.displayHeight * pos.originY;
        const onClick = clickHandlers[el.id];
        const isBtn = btnIds.has(el.id);

        // 애니메이션 딜레이: 텍스트/이미지 0.5s, 버튼은 0.8s~
        // 부활 버튼은 별도 모달이라 생략. 홈/도전/랭킹은 동일 라인.
        const delay = isBtn ? '0.8s' : '0.5s';
        const finalDelay = (el.id === 'go-btn-challenge' || el.id === 'go-btn-ranking')
          ? '0.95s' : delay;

        const content = el.id === 'go-rabbit' ? (
          // 토끼 자리에 코인 보상 카드 렌더
          <RewardCoinCard coinsEarned={coinsEarned} doubled={bonusClaimed} scale={scale} />
        ) : el.type === 'image' ? (
          <img
            src={`${BASE}${IMAGE_MAP[el.id]}`}
            alt={el.id}
            draggable={false}
            className={isBtn ? styles.imgBtn : undefined}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'contain',
            }}
          />
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
              height: pos.displayHeight,
              animationDelay: finalDelay,
            }}
          >
            {isBtn && onClick ? (
              <TapButton
                onTap={onClick}
                style={{
                  width: '100%',
                  height: '100%',
                }}
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

/* ── Reward coin slot — 정사각형 박스, 코인 중앙, 수량 우하단 ── */

function RewardCoinCard({
  coinsEarned,
  doubled,
  scale,
}: {
  coinsEarned: number;
  doubled: boolean;
  scale: number;
}) {
  const display = doubled ? coinsEarned * 2 : coinsEarned;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 정사각형 슬롯 — 슬롯 영역의 짧은 변에 맞춰 정사각형 */}
      <div
        style={{
          aspectRatio: '1 / 1',
          height: '100%',
          maxWidth: '100%',
          background: 'linear-gradient(180deg, rgba(60,55,40,0.85), rgba(20,18,12,0.95))',
          border: `${3 * scale}px solid rgba(255,210,74,0.9)`,
          borderRadius: 18 * scale,
          boxShadow: `inset 0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.5), 0 ${3 * scale}px ${14 * scale}px rgba(0,0,0,0.5), 0 0 ${18 * scale}px rgba(255,210,74,0.35)`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* 중앙 코인 아이콘 — 슬롯 크기의 65% */}
        <div style={{ width: '65%', height: '65%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CoinIcon size={120 * scale} />
        </div>

        {/* 우하단 수량 배지 */}
        <div
          style={{
            position: 'absolute',
            right: 8 * scale,
            bottom: 6 * scale,
            display: 'flex',
            alignItems: 'baseline',
            gap: 2 * scale,
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 24 * scale,
            color: '#fff',
            WebkitTextStroke: `${2 * scale}px #000`,
            paintOrder: 'stroke fill',
            lineHeight: 1,
          }}
        >
          ×{display}
        </div>

        {/* 2배 적용 표시 — 좌상단 */}
        {doubled && (
          <div
            style={{
              position: 'absolute',
              top: 6 * scale,
              left: 6 * scale,
              background: '#3fdcb0',
              color: '#0a3a28',
              fontSize: 10 * scale,
              fontWeight: 900,
              padding: `${2 * scale}px ${7 * scale}px`,
              borderRadius: 999,
              border: `${1.2 * scale}px solid #0a3a28`,
              fontFamily: 'GMarketSans, sans-serif',
            }}
          >
            ×2 ✓
          </div>
        )}
      </div>
    </div>
  );
}
