import { useState } from 'react';
import { ModalShell } from '../../components/ModalShell';
import { CoinIcon, GemIcon } from '../../components/CurrencyIcons';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useResponsiveScale } from '../../hooks/useResponsiveScale';
import { gameBus } from '../../../game/event-bus';
import { storage } from '../../../game/services/storage';

interface Props {
  onClose: () => void;
}

interface RewardItem {
  kind: 'coin' | 'gem';
  amount: number;
}

interface DayReward {
  day: number;
  rewards: RewardItem[];
}

const REWARDS: DayReward[] = [
  { day: 1, rewards: [{ kind: 'coin', amount: 50 }] },
  { day: 2, rewards: [{ kind: 'coin', amount: 80 }] },
  { day: 3, rewards: [{ kind: 'coin', amount: 100 }] },
  { day: 4, rewards: [{ kind: 'coin', amount: 150 }] },
  { day: 5, rewards: [{ kind: 'coin', amount: 200 }] },
  { day: 6, rewards: [{ kind: 'coin', amount: 300 }] },
  { day: 7, rewards: [{ kind: 'coin', amount: 500 }, { kind: 'gem', amount: 5 }] },
];

export function AttendanceModal({ onClose }: Props) {
  const scale = useResponsiveScale();
  // 스토리지 미러링 — 모달 열 때 한 번 읽고, 받기 후 갱신
  const [attendance, setAttendance] = useState(() => storage.getAttendance());
  const [todayClaimed, setTodayClaimed] = useState(() => storage.isAttendanceClaimedToday());

  /**
   * 화면 표시용 일차 계산.
   * - 오늘 아직 안 받았으면 → nextDay가 "현재 받을 일차"
   * - 오늘 이미 받았으면 → 직전에 받은 일차를 "현재"로 표시 (없으면 7→1로 순환했을 때)
   */
  const currentDay = todayClaimed
    ? attendance.nextDay === 1 ? 7 : attendance.nextDay - 1
    : attendance.nextDay;

  /** 현재 사이클에서 이미 받은 일차들 */
  const claimedDays = new Set<number>();
  // nextDay가 4면 1,2,3은 받음. nextDay가 1이면 사이클 리셋된 직후라 아무도 받지 않음.
  for (let d = 1; d < attendance.nextDay; d++) {
    claimedDays.add(d);
  }
  // 오늘 막 받았다면 currentDay도 받은 것으로 표시
  if (todayClaimed) claimedDays.add(currentDay);

  const handleClaim = () => {
    if (todayClaimed) {
      gameBus.emit('toast', '오늘 보상은 이미 받았어요');
      return;
    }
    const result = storage.claimAttendance();
    if (!result) return;
    const reward = REWARDS[result.day - 1];
    // 잔액 충전
    for (const r of reward.rewards) {
      storage.addNum(r.kind === 'coin' ? 'coins' : 'gems', r.amount);
      if (r.kind === 'coin') storage.recordCoinEarned(r.amount);
    }
    gameBus.emit('play-sfx', 'sfx-click');
    setAttendance(storage.getAttendance());
    setTodayClaimed(true);
    gameBus.emit(
      'show-reward',
      reward.rewards.map((r) => ({ kind: r.kind, amount: r.amount })),
    );
  };

  return (
    <ModalShell onClose={onClose} maxWidth={360}>
      <Text size={22 * scale} weight={900} align="center" style={{ marginBottom: 4 * scale }}>
        출석 보상
      </Text>
      <Text size={11 * scale} color="rgba(255,255,255,0.55)" align="center" style={{ marginBottom: 16 * scale }}>
        출석할 때마다 다음 일차 · 7일 후 1일차로 순환
      </Text>

      {/* 7일 그리드 — 3열 × 2행 + 7일차 wide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 * scale, marginBottom: 14 * scale }}>
        {REWARDS.slice(0, 6).map((r) => (
          <DayCard
            key={r.day}
            reward={r}
            isClaimed={claimedDays.has(r.day)}
            isToday={r.day === currentDay}
            scale={scale}
          />
        ))}
        <div style={{ gridColumn: 'span 3' }}>
          <DayCard
            reward={REWARDS[6]}
            isClaimed={claimedDays.has(7)}
            isToday={currentDay === 7}
            scale={scale}
            wide
          />
        </div>
      </div>

      <TapButton
        onTap={handleClaim}
        pressScale={0.96}
        style={{
          width: '100%',
          padding: `${12 * scale}px`,
          background: todayClaimed
            ? 'rgba(255,255,255,0.08)'
            : 'linear-gradient(180deg, #ffd24a, #f0a030)',
          border: `${2 * scale}px solid ${todayClaimed ? 'rgba(255,255,255,0.1)' : '#7a4500'}`,
          borderRadius: 12 * scale,
          textAlign: 'center',
          boxShadow: todayClaimed ? 'none' : `0 ${3 * scale}px ${10 * scale}px rgba(240,160,48,0.35)`,
        }}
      >
        <span
          style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 15 * scale,
            color: todayClaimed ? 'rgba(255,255,255,0.5)' : '#3a2400',
            letterSpacing: 0.5,
          }}
        >
          {todayClaimed ? '오늘 받음 ✓' : `${attendance.nextDay}일차 보상 받기`}
        </span>
      </TapButton>
    </ModalShell>
  );
}

function DayCard({
  reward,
  isClaimed,
  isToday,
  scale,
  wide,
}: {
  reward: DayReward;
  isClaimed: boolean;
  isToday: boolean;
  scale: number;
  wide?: boolean;
}) {
  let bg = 'rgba(255,255,255,0.04)';
  let border = `${1.5 * scale}px solid rgba(255,255,255,0.08)`;
  if (isToday) {
    bg = 'rgba(255,210,74,0.12)';
    border = `${2 * scale}px solid rgba(255,210,74,0.85)`;
  }
  if (isClaimed) {
    bg = 'rgba(0,0,0,0.4)';
  }

  const iconSize = wide ? 44 * scale : 28 * scale;

  return (
    <div
      style={{
        background: bg,
        border,
        borderRadius: 10 * scale,
        padding: `${(wide ? 10 : 6) * scale}px`,
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: wide ? 12 * scale : 3 * scale,
        boxShadow: isToday ? `0 0 ${10 * scale}px rgba(255,210,74,0.35)` : 'none',
        opacity: isClaimed ? 0.5 : 1,
        position: 'relative',
        minHeight: wide ? 64 * scale : 72 * scale,
      }}
    >
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontSize: 9 * scale,
          fontWeight: 900,
          color: isToday ? '#ffd24a' : 'rgba(255,255,255,0.55)',
          letterSpacing: 0.3,
        }}
      >
        DAY {reward.day}
      </span>

      {/* 보상 아이템들 (여러 개 있을 수 있음) */}
      <div
        style={{
          display: 'flex',
          flexDirection: wide ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: wide ? 14 * scale : 3 * scale,
        }}
      >
        {reward.rewards.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: wide ? 'row' : 'column',
              alignItems: 'center',
              gap: wide ? 6 * scale : 2 * scale,
            }}
          >
            {r.kind === 'coin' ? <CoinIcon size={iconSize} /> : <GemIcon size={iconSize} />}
            <span
              style={{
                fontFamily: 'GMarketSans, sans-serif',
                fontWeight: 900,
                fontSize: wide ? 17 * scale : 11 * scale,
                color: '#fff',
              }}
            >
              +{r.amount}
            </span>
          </div>
        ))}
      </div>

      {isClaimed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            borderRadius: 10 * scale,
          }}
        >
          <span style={{ fontSize: 22 * scale, color: '#3fdcb0' }}>✓</span>
        </div>
      )}
    </div>
  );
}

