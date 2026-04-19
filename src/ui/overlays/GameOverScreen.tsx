import { useMemo, useState } from 'react';
import { gameBus, type GameOverData } from '../../game/event-bus';
import type { LayoutElement } from '../../game/layout-types';
import { useLayout } from '../hooks/useLayout';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { TapButton } from '../components/TapButton';
import { CoinIcon } from '../components/CurrencyIcons';
import { adService } from '../../game/services/ad-service';
import { logClick, logEvent } from '../../game/services/analytics';
import { RankingModal } from './home/RankingModal';
import { storage } from '../../game/services/storage';
import { startBotBattle } from '../../game/services/battle-state';
import { setGameMode } from '../../game/services/game-mode';
import { getRandomQuote } from '../../game/game-over-quotes';
import { getNickname } from './home/ProfileModal';
import { LayoutText } from '../components/LayoutText';
import { LayoutButton } from '../components/LayoutButton';
import { Text } from '../components/Text';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

const IMAGE_MAP: Record<string, string> = {
  'go-rabbit': 'game-over-screen/gameover-rabbit.png',
};

interface Props {
  data: GameOverData;
}

export function GameOverScreen({ data }: Props) {
  const { score, bestScore, coinsEarned, battle } = data;
  if (battle) {
    return <BattleGameOverScreen data={battle} />;
  }
  // 부활 모달은 별도 화면이므로 부활 버튼 슬롯을 "광고 2배" 로 재사용
  // 멘트(quoteText)는 숨김
  const excludeIds = useMemo(() => ['quoteText'], []);
  const { positions, elements, scale, ready } = useLayout('game-over', IMAGE_MAP, excludeIds);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
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
    'go-btn-restart': () => {
      gameBus.emit('play-sfx', 'sfx-click');
      gameBus.emit('restart-game', undefined);
    },
    'go-btn-challenge': () => {
      gameBus.emit('play-sfx', 'sfx-click');
      logClick('challenge_send');
      gameBus.emit('show-challenge', score);
    },
    'go-btn-ranking': () => {
      gameBus.emit('play-sfx', 'sfx-click');
      logClick('leaderboard_open');
      setRankingOpen(true);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [score, canBonus, coinsEarned, bonusClaimed]);

  if (!ready) return null;

  // 버튼 vs 텍스트/이미지 분류 → 딜레이 다르게
  const btnIds = new Set(['go-btn-revive', 'go-btn-home', 'go-btn-restart', 'go-btn-challenge', 'go-btn-ranking']);

  return (
    <div className={`${styles.overlay} ${styles.fadeIn}`}>
      {/* 그라데이션 배경 */}
      <div
        className={styles.gradient}
        style={{ background: 'linear-gradient(to bottom, #2a0c10, #000000)' }}
      />

      {/* 레이아웃 요소들 */}
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
      {rankingOpen && <RankingModal onClose={() => setRankingOpen(false)} />}
    </div>
  );
}

function BattleGameOverScreen({
  data,
}: {
  data: NonNullable<GameOverData['battle']>;
}) {
  const scale = useResponsiveScale();
  const nickname = getNickname();
  const selectedCharacter = storage.getSelectedCharacter();
  const accent = data.outcome === 'win'
    ? '#ffd24a'
    : data.outcome === 'lose'
      ? '#ff9f6b'
      : '#ffe08a';
  const title = data.outcome === 'win'
    ? 'WIN'
    : data.outcome === 'lose'
      ? 'LOSE'
      : 'DRAW';
  const subtitle = data.outcome === 'win'
    ? '상대를 앞질렀어요'
    : data.outcome === 'lose'
      ? '조금 더 밀어붙여야 해요'
      : '끝까지 접전이었어요';
  const gap = Math.abs(data.playerScore - data.opponentScore);

  return (
    <div
      className={`${styles.overlay} ${styles.fadeIn}`}
      style={{
        background: 'linear-gradient(to bottom, #2a0c10, #000000)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          textAlign: 'center',
        }}
      >
        <Text size={14} weight={900} color="#ffd24a" style={{ letterSpacing: '0.16em', marginBottom: 10 }} className={styles.fadeInUp}>
          대전 결과
        </Text>
        <Text
          className={styles.fadeInUp}
          size={44}
          weight={900}
          color="#fff7df"
          style={{
            lineHeight: 1,
            marginBottom: 10,
            textShadow: '0 4px 14px rgba(0,0,0,0.35)',
            animationDelay: '0.1s',
          }}
        >
          {title}
        </Text>
        <Text size={14} weight={700} color="rgba(255,255,255,0.72)" style={{ marginBottom: 22 }} className={styles.fadeInUp}>
          {subtitle}
        </Text>

        <div
          className={styles.fadeInUp}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
            animationDelay: '0.2s',
          }}
        >
          <BattleResultCard
            label="나"
            name={nickname}
            score={data.playerScore}
            src={`${BASE}character/${selectedCharacter}-front.png`}
            accent="#ffd24a"
            highlighted={data.outcome === 'win'}
            isMe
          />
          <Text size={22} weight={900} color="rgba(255,255,255,0.34)" style={{ paddingTop: 18 }}>
            VS
          </Text>
          <BattleResultCard
            label="상대"
            name={data.opponentName}
            score={data.opponentScore}
            src={`${BASE}character/${data.opponentCharacter}-front.png`}
            accent="#7ce4ff"
            highlighted={data.outcome === 'lose'}
          />
        </div>

        <div
          className={styles.fadeInUp}
          style={{
            padding: '12px 14px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.28)',
            marginBottom: 20,
            animationDelay: '0.3s',
          }}
        >
          <Text size={13} weight={700} color="rgba(255,255,255,0.68)" style={{ marginBottom: 4 }}>
            거리 차이
          </Text>
          <Text size={26} weight={900} color={accent}>
            {gap}칸
          </Text>
        </div>

        <div style={{ display: 'grid', gap: 10 }} className={styles.fadeInUp}>
          <BattleActionButton
            label="다시 대전하기"
            variant="restart"
            scale={scale}
            onTap={() => {
              gameBus.emit('play-sfx', 'sfx-click');
              setGameMode('battle');
              startBotBattle();
              gameBus.emit('restart-game', undefined);
            }}
          />
          <BattleActionButton
            label="홈으로"
            variant="home"
            scale={scale}
            onTap={() => {
              gameBus.emit('play-sfx', 'sfx-click');
              gameBus.emit('go-home', undefined);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function BattleResultCard({
  label,
  name,
  score,
  src,
  accent,
  highlighted,
  isMe = false,
}: {
  label: string;
  name: string;
  score: number;
  src: string;
  accent: string;
  highlighted: boolean;
  isMe?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 20,
        background: highlighted
          ? 'linear-gradient(180deg, rgba(95,72,24,0.28), rgba(0,0,0,0.2))'
          : 'rgba(0,0,0,0.22)',
        border: `1.5px solid ${accent}`,
        padding: '12px 10px 14px',
        boxShadow: highlighted
          ? `0 0 0 1px ${accent}55, 0 0 22px ${accent}33`
          : 'none',
        transform: highlighted ? 'translateY(-2px)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <Text size={11} weight={900} color={accent}>
          {label}
        </Text>
        {highlighted && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 34,
              height: 18,
              padding: '0 6px',
              borderRadius: 999,
              background: accent,
              color: '#2c1900',
              fontFamily: 'GMarketSans, sans-serif',
              fontWeight: 900,
              fontSize: 10,
            }}
          >
            WIN
          </span>
        )}
      </div>
      <img src={src} alt={name} draggable={false} style={{ width: 76, height: 76, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text size={13} weight={900} color="#fff">
          {name}
        </Text>
        {isMe && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 24,
              height: 18,
              padding: '0 6px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.14)',
              color: '#fff7df',
              fontFamily: 'GMarketSans, sans-serif',
              fontWeight: 900,
              fontSize: 10,
            }}
          >
            나
          </span>
        )}
      </div>
      <Text size={20} weight={900} color="#fff7df">
        {score}
      </Text>
    </div>
  );
}

function BattleActionButton({
  label,
  variant,
  scale,
  onTap,
}: {
  label: string;
  variant: 'home' | 'restart';
  scale: number;
  onTap: () => void;
}) {
  const el: LayoutElement = variant === 'restart'
    ? {
        id: 'battle-btn-restart',
        type: 'button',
        widthMode: 'full',
        widthPx: 342,
        visible: true,
        locked: false,
        positioning: 'group',
        order: 0,
        gapPx: 0,
        label,
        buttonStyle: {
          styleType: 'outline',
          bgColor: '#24282c',
          scaleKey: 'sm',
        },
      }
    : {
        id: 'battle-btn-home',
        type: 'button',
        widthMode: 'full',
        widthPx: 342,
        visible: true,
        locked: false,
        positioning: 'group',
        order: 0,
        gapPx: 0,
        label,
        buttonStyle: {
          styleType: 'outline',
          bgColor: '#111111',
          scaleKey: 'sm',
        },
      };

  return (
    <TapButton
      onTap={onTap}
      style={{
        width: '100%',
        height: 56 * scale,
      }}
    >
      <LayoutButton el={el} scale={scale} />
    </TapButton>
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
