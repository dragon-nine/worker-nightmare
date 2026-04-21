import { useEffect, useState } from 'react';
import { ModalShell, type ModalTabDef } from '../../components/ModalShell';
import { CoinIcon, GemIcon } from '../../components/CurrencyIcons';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useResponsiveScale } from '../../hooks/useResponsiveScale';
import { gameBus } from '../../../game/event-bus';
import { storage } from '../../../game/services/storage';
import { logEvent } from '../../../game/services/analytics';
import { syncCurrenciesFromStorage } from '../../../game/services/assets';
import {
  ALL_MISSION_IDS,
  DAILY_MISSIONS,
  WEEKLY_MISSIONS,
  computeMissionCurrent,
  type MissionDef,
  type MissionPeriod,
  type MissionReward,
} from '../../../game/services/missions';

interface Props {
  onClose: () => void;
}

const TABS: ModalTabDef[] = [
  {
    key: 'daily',
    label: '일일',
    accent: '#ffd24a',
    icon: (color, size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: 'weekly',
    label: '주간',
    accent: '#3fdcb0',
    icon: (color, size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export function MissionModal({ onClose }: Props) {
  const scale = useResponsiveScale();
  const [tab, setTab] = useState<MissionPeriod>('daily');
  // 마운트 시 옛 미션 ID 정리 (현재 정의에 없는 ID는 storage에서 제거)
  useEffect(() => {
    storage.pruneClaimedMissions(ALL_MISSION_IDS);
  }, []);
  // 스토리지 미러링 — 마운트 시 한 번 (자동 리셋 + prune 후)
  const [missionState, setMissionState] = useState(() => {
    storage.pruneClaimedMissions(ALL_MISSION_IDS);
    return storage.getMissionState();
  });
  const [stats, setStats] = useState(() => storage.getPlayStats());

  const dailyClaimed = new Set(missionState.daily.claimed);
  const weeklyClaimed = new Set(missionState.weekly.claimed);
  const claimedFor = (period: MissionPeriod) =>
    period === 'daily' ? dailyClaimed : weeklyClaimed;

  const handleClaim = (m: MissionDef, period: MissionPeriod) => {
    const claimed = claimedFor(period);
    const current = computeMissionCurrent(m, period, stats);

    if (current < m.target) {
      gameBus.emit('toast', '아직 완료되지 않았어요');
      return;
    }
    if (claimed.has(m.id)) return;

    // 잔액 충전
    if (m.reward.coin) {
      storage.addNum('coins', m.reward.coin);
      storage.recordCoinEarned(m.reward.coin);
    }
    if (m.reward.gem) storage.addNum('gems', m.reward.gem);

    storage.addClaimedMission(period, m.id);
    setMissionState(storage.getMissionState());
    setStats(storage.getPlayStats());
    void syncCurrenciesFromStorage();
    gameBus.emit('play-sfx', 'sfx-click');
    logEvent('mission_claim', {
      id: m.id,
      period,
      coin: m.reward.coin ?? 0,
      gem: m.reward.gem ?? 0,
    });
    const items = [];
    if (m.reward.coin) items.push({ kind: 'coin' as const, amount: m.reward.coin });
    if (m.reward.gem) items.push({ kind: 'gem' as const, amount: m.reward.gem });
    if (items.length) gameBus.emit('show-reward', items);
  };

  const activeMissions = tab === 'daily' ? DAILY_MISSIONS : WEEKLY_MISSIONS;
  const activeClaimed = claimedFor(tab);
  const orderedMissions = [...activeMissions].sort((a, b) => {
    const aCurrent = computeMissionCurrent(a, tab, stats);
    const bCurrent = computeMissionCurrent(b, tab, stats);
    const aClaimed = activeClaimed.has(a.id);
    const bClaimed = activeClaimed.has(b.id);
    const aComplete = aCurrent >= a.target;
    const bComplete = bCurrent >= b.target;
    const aPriority = !aClaimed && aComplete ? 0 : aClaimed ? 1 : 2;
    const bPriority = !bClaimed && bComplete ? 0 : bClaimed ? 1 : 2;

    if (aPriority !== bPriority) return aPriority - bPriority;
    return activeMissions.findIndex((m) => m.id === a.id) - activeMissions.findIndex((m) => m.id === b.id);
  });
  const claimedCount = activeMissions.filter((m) => activeClaimed.has(m.id)).length;
  const totalCount = activeMissions.length;
  const subtitleResetText = tab === 'daily' ? '매일 자정 초기화' : '매주 월요일 초기화';
  const subtitle = `${subtitleResetText} · 받음 ${claimedCount} / ${totalCount}`;

  return (
    <ModalShell
      onClose={onClose}
      maxWidth={360}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(k) => setTab(k as MissionPeriod)}
    >
      <Text size={22 * scale} weight={900} align="center" style={{ marginBottom: 4 * scale }}>
        미션
      </Text>
      <Text size={11 * scale} color="rgba(255,255,255,0.55)" align="center" style={{ marginBottom: 14 * scale }}>
        {subtitle}
      </Text>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 7 * scale,
          // 약 4개 행 정도 보이고 나머지는 스크롤
          maxHeight: 270 * scale,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          // 스크롤바 영역 패딩 (right padding으로 잘림 방지)
          paddingRight: 4 * scale,
          marginRight: -4 * scale,
        }}
      >
        {orderedMissions.map((m) => {
          const current = computeMissionCurrent(m, tab, stats);
          return (
            <MissionRow
              key={m.id}
              mission={m}
              current={current}
              isClaimed={activeClaimed.has(m.id)}
              onClaim={() => handleClaim(m, tab)}
              scale={scale}
            />
          );
        })}
      </div>
    </ModalShell>
  );
}

/* ── Mission row ── */

function MissionRow({
  mission,
  current,
  isClaimed,
  onClaim,
  scale,
}: {
  mission: MissionDef;
  current: number;
  isClaimed: boolean;
  onClaim: () => void;
  scale: number;
}) {
  const isComplete = current >= mission.target;
  const pct = Math.min(100, (current / mission.target) * 100);
  const accent = '#3fdcb0';

  return (
    <div
      style={{
        background: isComplete ? 'rgba(63,220,176,0.08)' : 'rgba(255,255,255,0.04)',
        border: `${1.5 * scale}px solid ${
          isComplete ? 'rgba(63,220,176,0.4)' : 'rgba(255,255,255,0.08)'
        }`,
        borderRadius: 12 * scale,
        padding: `${10 * scale}px ${12 * scale}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 10 * scale,
        opacity: isClaimed ? 0.5 : 1,
      }}
    >
      <RewardBadge reward={mission.reward} scale={scale} />

      {/* 조건 텍스트 (이름 대신) + 진행 바 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 12 * scale,
            color: '#fff',
            marginBottom: 3 * scale,
          }}
        >
          {mission.desc}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 * scale }}>
          <div
            style={{
              flex: 1,
              height: 5 * scale,
              background: 'rgba(0,0,0,0.5)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: isComplete ? accent : '#ffd24a',
                transition: 'width 0.3s ease-out',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'GMarketSans, sans-serif',
              fontSize: 9 * scale,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.6)',
              minWidth: 32 * scale,
              textAlign: 'right',
            }}
          >
            {Math.min(current, mission.target)}/{mission.target}
          </span>
        </div>
      </div>

      <TapButton
        onTap={onClaim}
        pressScale={0.94}
        scrollSafe
        style={{
          padding: `${7 * scale}px ${11 * scale}px`,
          borderRadius: 9 * scale,
          background: isClaimed
            ? 'rgba(255,255,255,0.06)'
            : isComplete
            ? accent
            : 'rgba(255,255,255,0.08)',
          color: isClaimed
            ? 'rgba(255,255,255,0.4)'
            : isComplete
            ? '#0a3a28'
            : 'rgba(255,255,255,0.5)',
          fontFamily: 'GMarketSans, sans-serif',
          fontSize: 10 * scale,
          fontWeight: 900,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          boxShadow: isComplete && !isClaimed ? `0 ${2 * scale}px ${6 * scale}px ${accent}59` : 'none',
        }}
      >
        {isClaimed ? '받음' : isComplete ? '받기' : '진행중'}
      </TapButton>
    </div>
  );
}

/* ── Reward badge — coin/gem 조합 표시 ── */

function RewardBadge({ reward, scale }: { reward: MissionReward; scale: number }) {
  const hasBoth = !!reward.coin && !!reward.gem;
  return (
    <div
      style={{
        width: hasBoth ? 60 * scale : 44 * scale,
        height: 40 * scale,
        borderRadius: 10 * scale,
        background: 'rgba(0,0,0,0.4)',
        border: `1px solid rgba(255,255,255,0.08)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4 * scale,
        flexShrink: 0,
        padding: `0 ${4 * scale}px`,
      }}
    >
      {reward.coin !== undefined && (
        <RewardItem icon={<CoinIcon size={20 * scale} />} amount={reward.coin} scale={scale} />
      )}
      {reward.gem !== undefined && (
        <RewardItem icon={<GemIcon size={18 * scale} />} amount={reward.gem} scale={scale} />
      )}
    </div>
  );
}

function RewardItem({
  icon,
  amount,
  scale,
}: {
  icon: React.ReactNode;
  amount: number;
  scale: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 * scale }}>
      {icon}
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 9 * scale,
          color: '#fff',
          lineHeight: 1,
        }}
      >
        ×{amount}
      </span>
    </div>
  );
}
