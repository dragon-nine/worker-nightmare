import { useState } from 'react';
import { gameBus } from '../../../game/event-bus';
import { storage } from '../../../game/services/storage';
import { clearBattle } from '../../../game/services/battle-state';
import { setGameMode } from '../../../game/services/game-mode';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { RankingPanel, type TabKey } from './RankingModal';
import styles from '../overlay.module.css';

interface Props {
  scale: number;
}

const PERIOD_TABS: { key: TabKey; label: string; accent: string }[] = [
  { key: 'daily',  label: '일간',  accent: '#ffe066' },
  { key: 'weekly', label: '주간',  accent: '#ffb84d' },
  { key: 'all',    label: '전체',  accent: '#ff9633' },
];

// BottomTabBar 의 visible height (76 * scale + sab) 만큼 outer 영역에서 빼서
// 리스트 스크롤이 탭바에 가려지지 않도록 한다.
const TABBAR_BASE_PX = 76;

export function RankingTab({ scale }: Props) {
  const [period, setPeriod] = useState<TabKey>('daily');
  const bestScore = storage.getBestScore();

  const handleChallenge = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    clearBattle();
    setGameMode('normal');
    // 첫 진입 = start-game, 재진입 = restart-game. 둘 중 활성 listener 하나만 동작.
    gameBus.emit('start-game', undefined);
    gameBus.emit('restart-game', undefined);
  };

  return (
    <div
      className={styles.fadeIn}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: `calc(${TABBAR_BASE_PX * scale}px + var(--sab, 0px))`,
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(255,210,74,0.10) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 90%, rgba(60,50,40,0.18) 0%, transparent 50%),
          #15151b
        `,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
      }}
    >
      {/* ── 상단 헤더 (고정) ── */}
      <div
        style={{
          padding: `calc(var(--sat, 0px) + ${10 * scale}px) ${14 * scale}px ${10 * scale}px`,
          display: 'flex',
          alignItems: 'center',
          gap: 8 * scale,
          background: 'rgba(12,12,16,0.8)',
          borderBottom: `1px solid rgba(255,255,255,0.04)`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 20 * scale,
            color: '#fff',
            marginRight: 'auto',
            letterSpacing: 0.3,
          }}
        >
          🏆 랭킹
        </span>
        <Text size={13 * scale} weight={900} color="#ffd24a" as="span">
          ★ BEST {bestScore}
        </Text>
      </div>

      {/* ── 기간 탭 (헤더 아래 고정) ── */}
      <div
        style={{
          flexShrink: 0,
          padding: `${6 * scale}px ${14 * scale}px ${4 * scale}px`,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 6 * scale,
            padding: 4 * scale,
            borderRadius: 12 * scale,
            background: 'rgba(0,0,0,0.3)',
            border: `${1 * scale}px solid rgba(255,255,255,0.06)`,
          }}
        >
          {PERIOD_TABS.map((t) => {
            const active = period === t.key;
            return (
              <TapButton
                key={t.key}
                onTap={() => {
                  if (active) return;
                  gameBus.emit('play-sfx', 'sfx-click');
                  setPeriod(t.key);
                }}
                pressScale={0.96}
                style={{
                  flex: 1,
                  height: 36 * scale,
                  borderRadius: 9 * scale,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active ? `${t.accent}22` : 'transparent',
                  border: active ? `${1 * scale}px solid ${t.accent}66` : `${1 * scale}px solid transparent`,
                }}
              >
                <span
                  style={{
                    fontFamily: 'GMarketSans, sans-serif',
                    fontWeight: 900,
                    fontSize: 13 * scale,
                    color: active ? t.accent : 'rgba(255,255,255,0.65)',
                    letterSpacing: 0.3,
                  }}
                >
                  {t.label}
                </span>
              </TapButton>
            );
          })}
        </div>
      </div>

      {/* ── 스크롤 영역 (리스트) ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: `0 ${14 * scale}px ${8 * scale}px`,
        }}
      >
        <RankingPanel period={period} scale={scale} hideCountdown />
      </div>

      {/* ── 도전 모드 카드 (하단 고정, BottomTabBar 위) ── */}
      <div
        style={{
          flexShrink: 0,
          padding: `${10 * scale}px ${14 * scale}px ${12 * scale}px`,
          background: 'linear-gradient(180deg, rgba(21,21,27,0) 0%, rgba(21,21,27,0.95) 30%, rgba(21,21,27,1) 100%)',
        }}
      >
        <div
          style={{
            position: 'relative',
            padding: `${14 * scale}px ${16 * scale}px`,
            borderRadius: 18 * scale,
            background: 'linear-gradient(135deg, #2a2010 0%, #1a1410 60%, #1a1410 100%)',
            border: `${1.5 * scale}px solid rgba(255,210,74,0.45)`,
            boxShadow: `0 ${4 * scale}px ${16 * scale}px rgba(0,0,0,0.4), inset 0 0 ${24 * scale}px rgba(255,210,74,0.06)`,
            display: 'flex',
            alignItems: 'center',
            gap: 14 * scale,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: `${3 * scale}px ${8 * scale}px`,
                borderRadius: 999,
                background: 'rgba(255,210,74,0.15)',
                border: `${1 * scale}px solid rgba(255,210,74,0.35)`,
                marginBottom: 6 * scale,
              }}
            >
              <span style={{ fontSize: 10 * scale, color: '#ffd24a', fontWeight: 900, fontFamily: 'GMarketSans, sans-serif', letterSpacing: 0.3 }}>
                ⚡ 도전 모드
              </span>
            </div>
            <Text size={14 * scale} weight={900} color="#ffffff" style={{ marginBottom: 2 * scale }}>
              끝없이 달려 점수 갱신
            </Text>
            <Text size={10 * scale} color="rgba(255,255,255,0.6)" style={{ lineHeight: 1.4 }}>
              장애물 없는 무한 모드 · 리더보드 등록
            </Text>
          </div>
          <TapButton
            onTap={handleChallenge}
            pressScale={0.94}
            style={{
              flexShrink: 0,
              padding: `${10 * scale}px ${18 * scale}px`,
              borderRadius: 12 * scale,
              background: 'linear-gradient(180deg, #ffd24a 0%, #f5a623 100%)',
              border: 'none',
              boxShadow: `0 ${3 * scale}px ${10 * scale}px rgba(255,210,74,0.35)`,
            }}
          >
            <span
              style={{
                fontFamily: 'GMarketSans, sans-serif',
                fontWeight: 900,
                fontSize: 13 * scale,
                color: '#241808',
                letterSpacing: 0.3,
              }}
            >
              시작
            </span>
          </TapButton>
        </div>
      </div>
    </div>
  );
}
