import { useEffect, useRef, useState } from 'react';
import { gameBus, type RewardPopupItem } from '../../game/event-bus';
import { CoinIcon, GemIcon } from '../components/CurrencyIcons';
import { Text } from '../components/Text';
import { useNativeTap } from '../hooks/useNativeTap';
import { useResponsiveScale } from '../hooks/useResponsiveScale';

const ITEM_STAGGER_MS = 160;
const FADE_MS = 220;
const DISMISS_LOCK_MS = 300;

/**
 * 전역 보상 획득 팝업 — `gameBus.emit('show-reward', items)` 로 표시.
 * 아이템이 stagger pop-in으로 등장 + sfx-coin, 탭하면 닫힘.
 */
export function RewardPopup() {
  const scale = useResponsiveScale();
  const [items, setItems] = useState<RewardPopupItem[] | null>(null);
  const [visible, setVisible] = useState(false);
  // 표시 직후 실수 탭으로 닫히는 것을 막고, 아이템 등장 후 입력을 허용한다.
  const [acceptTap, setAcceptTap] = useState(false);
  const sfxTimersRef = useRef<number[]>([]);
  const enableTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = gameBus.on('show-reward', (incoming) => {
      if (!incoming || incoming.length === 0) return;
      // 기존 타이머 정리
      sfxTimersRef.current.forEach(clearTimeout);
      sfxTimersRef.current = [];
      if (enableTimerRef.current) clearTimeout(enableTimerRef.current);

      setItems(incoming);
      setVisible(true);
      setAcceptTap(false);

      // 보상 사운드 1회 — 첫 아이템 등장 시점에 재생
      const t = window.setTimeout(() => {
        gameBus.emit('play-sfx', 'sfx-reward');
      }, FADE_MS);
      sfxTimersRef.current.push(t);

      enableTimerRef.current = window.setTimeout(() => {
        setAcceptTap(true);
      }, DISMISS_LOCK_MS);
    });

    return () => {
      unsub();
      sfxTimersRef.current.forEach(clearTimeout);
      if (enableTimerRef.current) clearTimeout(enableTimerRef.current);
    };
  }, []);

  const handleDismiss = () => {
    if (!acceptTap) return;
    gameBus.emit('play-sfx', 'sfx-click');
    setVisible(false);
    window.setTimeout(() => setItems(null), FADE_MS);
  };

  const dismissRef = useNativeTap(handleDismiss);

  if (!items) return null;

  return (
    <div
      ref={dismissRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28 * scale,
        cursor: acceptTap ? 'pointer' : 'default',
        // 모달 위에 띄우려고 pointerEvents 항상 활성
        pointerEvents: 'auto',
      }}
    >
      {/* 헤더 배너 — "보상획득" */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: `translateY(${visible ? 0 : -8 * scale}px)`,
          transition: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
          padding: `${10 * scale}px ${28 * scale}px`,
          background: 'linear-gradient(180deg, #ffd24a, #f0a030)',
          border: `${2.5 * scale}px solid #7a4500`,
          borderRadius: 14 * scale,
          boxShadow: `0 ${4 * scale}px ${16 * scale}px rgba(255, 180, 60, 0.45), 0 0 ${24 * scale}px rgba(255, 210, 74, 0.35)`,
          position: 'relative',
        }}
      >
        <Sparkle position="left" scale={scale} />
        <Sparkle position="right" scale={scale} />
        <Text
          size={22 * scale}
          weight={900}
          color="#3a1d00"
          align="center"
          style={{
            letterSpacing: 1,
            textShadow: `0 ${1 * scale}px 0 rgba(255, 255, 255, 0.4)`,
          }}
        >
          보상 획득
        </Text>
      </div>

      {/* 아이템 행 — stagger pop-in */}
      <div
        style={{
          display: 'flex',
          gap: 14 * scale,
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: `calc(100vw - ${32 * scale}px)`,
        }}
      >
        {items.map((item, i) => (
          <RewardCard key={i} item={item} scale={scale} delayMs={i * ITEM_STAGGER_MS} />
        ))}
      </div>

      {/* 하단: 터치하여 계속하기 — 화면 어디든 탭 가능하다는 힌트, 깜빡임 효과 */}
      <div
        style={{
          opacity: acceptTap ? 1 : 0,
          transition: 'opacity 220ms ease-out',
          marginTop: 8 * scale,
          pointerEvents: 'none',
        }}
      >
        <Text
          size={13 * scale}
          weight={700}
          color="rgba(255, 255, 255, 0.7)"
          align="center"
          as="span"
          style={{
            letterSpacing: 0.5,
            textShadow: `0 ${1 * scale}px ${2 * scale}px rgba(0, 0, 0, 0.6)`,
            animation: acceptTap ? 'rewardHintBlink 1.4s ease-in-out infinite' : undefined,
          }}
        >
          터치하여 계속하기
        </Text>
      </div>

      <style>{`
        @keyframes rewardPopIn {
          0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
          60%  { opacity: 1; transform: scale(1.15) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes rewardHintBlink {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── 보상 카드 (아이콘 + 수량 배지 + 라벨) ── */

function RewardCard({
  item,
  scale,
  delayMs,
}: {
  item: RewardPopupItem;
  scale: number;
  delayMs: number;
}) {
  const accent = item.kind === 'coin' ? '#ffd24a' : '#9c6bff';
  const label = item.label ?? (item.kind === 'coin' ? '코인' : '보석');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6 * scale,
        opacity: 0,
        animation: `rewardPopIn 420ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delayMs}ms forwards`,
        animationFillMode: 'forwards',
      }}
    >
      <div
        style={{
          width: 76 * scale,
          height: 76 * scale,
          borderRadius: 18 * scale,
          background: 'linear-gradient(180deg, #2a3850 0%, #131c2c 100%)',
          border: `${2.5 * scale}px solid ${accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: `0 ${3 * scale}px ${10 * scale}px rgba(0, 0, 0, 0.5), 0 0 ${16 * scale}px ${accent}50`,
        }}
      >
        {item.kind === 'coin' ? <CoinIcon size={48 * scale} /> : <GemIcon size={48 * scale} />}
        {/* 수량 배지 */}
        <div
          style={{
            position: 'absolute',
            bottom: -6 * scale,
            right: -6 * scale,
            minWidth: 26 * scale,
            height: 22 * scale,
            padding: `0 ${7 * scale}px`,
            background: '#0a0a14',
            border: `${1.8 * scale}px solid ${accent}`,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 12 * scale,
            color: '#fff',
            letterSpacing: 0.3,
            lineHeight: 1,
          }}
        >
          ×{item.amount}
        </div>
      </div>
      <div style={{ marginTop: 4 * scale }}>
        <Text
          size={11 * scale}
          weight={700}
          color="rgba(255, 255, 255, 0.85)"
          align="center"
          as="span"
        >
          {label}
        </Text>
      </div>
    </div>
  );
}

/* ── 헤더 좌/우 별 장식 ── */

function Sparkle({ position, scale }: { position: 'left' | 'right'; scale: number }) {
  return (
    <svg
      width={18 * scale}
      height={18 * scale}
      viewBox="0 0 24 24"
      fill="#fff7d6"
      stroke="#7a4500"
      strokeWidth={1.2}
      style={{
        position: 'absolute',
        top: -8 * scale,
        [position]: -8 * scale,
        filter: `drop-shadow(0 ${1 * scale}px ${2 * scale}px rgba(0,0,0,0.4))`,
      }}
    >
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}
