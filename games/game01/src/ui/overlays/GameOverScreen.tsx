import { useMemo } from 'react';
import { gameBus, type GameOverData } from '../../game/event-bus';
import { useLayout } from '../hooks/useLayout';
import { TapButton } from '../components/TapButton';
import { openLeaderboard } from '../../game/services/leaderboard';
import { isAdRemoved } from '../../game/services/billing';
import { logClick } from '../../game/services/analytics';
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
  const { score, bestScore, canRevive } = data;
  const excludeIds = useMemo(() => {
    const ids: string[] = [];
    if (!canRevive) ids.push('go-btn-revive');
    return ids;
  }, [canRevive]);
  const { positions, elements, scale, ready } = useLayout('game-over', IMAGE_MAP, excludeIds);

  // 텍스트 내용 오버라이드 (동적 값)
  const quote = useMemo(() => getRandomQuote(), []);
  const textOverrides: Record<string, string> = useMemo(() => ({
    'bestText': `최고기록 ${bestScore}`,
    'scoreText': `${score}`,
    'quoteText': quote,
    'go-btn-revive': isAdRemoved() ? '부활하기' : '광고보고 부활',
  }), [score, bestScore, quote]);

  const clickHandlers: Record<string, () => void> = useMemo(() => ({
    'go-btn-revive': () => {
      gameBus.emit('play-sfx', 'sfx-click');
      gameBus.emit('revive', undefined);
    },
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
  }), []);

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
        const delay = isBtn ? (el.id === 'go-btn-revive' ? '0.8s' : canRevive ? '0.95s' : '0.8s') : '0.5s';
        // 도전/랭킹 같은 order의 버튼은 약간 더 늦게
        const finalDelay = (el.id === 'go-btn-challenge' || el.id === 'go-btn-ranking')
          ? (canRevive ? '1.1s' : '0.95s') : delay;

        const content = el.type === 'image' ? (
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
          <LayoutButton el={el} scale={scale} />
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
