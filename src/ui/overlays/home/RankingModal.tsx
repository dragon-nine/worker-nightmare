import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalShell, type ModalTabDef } from '../../components/ModalShell';
import { CoinIcon, GemIcon } from '../../components/CurrencyIcons';
import { Text } from '../../components/Text';
import { useResponsiveScale } from '../../hooks/useResponsiveScale';
import { fetchLeaderboard, getStoredUserId, type Period as ApiPeriod, type LeaderEntry, type LeaderboardResponse } from '../../../game/services/api';
import { storage } from '../../../game/services/storage';

// 모달 열려있는 동안 탭 왕복 시 즉시 표시 — 15초 fresh, 넘으면 백그라운드 refresh.
// 모듈 전역이라 모달 닫았다 다시 열어도 15초 내엔 캐시 적중.
const RANK_CACHE = new Map<ApiPeriod, { at: number; data: LeaderboardResponse }>();
const RANK_TTL_MS = 15_000;
import styles from '../overlay.module.css';

interface Props {
  onClose: () => void;
}

type TabKey = 'daily' | 'weekly' | 'all';

type CharKey = 'rabbit' | 'penguin' | 'sheep' | 'cat' | 'koala' | 'lion';

const BASE = import.meta.env.BASE_URL || '/';
const CHAR_SRC: Record<CharKey, string> = {
  rabbit: `${BASE}character/rabbit-front.png`,
  penguin: `${BASE}character/penguin-front.png`,
  sheep: `${BASE}character/sheep-front.png`,
  cat: `${BASE}character/cat-front.png`,
  koala: `${BASE}character/koala-front.png`,
  lion: `${BASE}character/lion-front.png`,
};

const TABS: ModalTabDef[] = [
  {
    key: 'daily',
    label: '일간',
    accent: '#ffe066',
    icon: (color, size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    key: 'weekly',
    label: '주간',
    accent: '#ffb84d',
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
    key: 'all',
    label: '전체',
    accent: '#ff9633',
    icon: (color, size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
        <path d="M7 6H4v2a3 3 0 003 3" />
        <path d="M17 6h3v2a3 3 0 01-3 3" />
      </svg>
    ),
  },
];


import { getReward, type Reward } from '../../../game/services/rewards';

// ── 시간 유틸 ───────────────────────────────────────────
function useCountdown(target: Date): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, Math.floor((target.getTime() - now) / 1000));
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d}일 ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function nextMidnight(): Date {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
}

function nextMonday(): Date {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 탭 키 매핑 (UI 'all' ↔ API 'alltime')
function toApiPeriod(tab: TabKey): ApiPeriod {
  return tab === 'all' ? 'alltime' : tab;
}

// 캐릭터 매핑 (서버 string → 클라 CharKey 화이트리스트)
function normalizeChar(c: string | null | undefined): CharKey {
  if (c === 'rabbit' || c === 'penguin' || c === 'sheep' || c === 'cat' || c === 'koala' || c === 'lion') return c;
  return 'rabbit';
}

// ── 메인 컴포넌트 ───────────────────────────────────────
export function RankingModal({ onClose }: Props) {
  const scale = useResponsiveScale();
  const [tab, setTab] = useState<TabKey>('daily');
  const myUserId = getStoredUserId();
  const localCharacter = storage.getSelectedCharacter();

  const dailyCountdown = useCountdown(useMemo(() => nextMidnight(), []));
  const weeklyCountdown = useCountdown(useMemo(() => nextMonday(), []));

  // 탭별 서버 데이터
  const [top, setTop] = useState<LeaderEntry[]>([]);
  const [me, setMe] = useState<LeaderEntry | null>(null);
  const [above, setAbove] = useState<LeaderEntry[]>([]);
  const [below, setBelow] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiPeriod = toApiPeriod(tab);
    const cached = RANK_CACHE.get(apiPeriod);
    const fresh = cached && Date.now() - cached.at < RANK_TTL_MS;

    // 캐시 있으면 즉시 표시 (로딩 X). fresh 아니면 백그라운드 refresh.
    if (cached) {
      setTop(cached.data.top);
      setMe(cached.data.me);
      setAbove(cached.data.around?.above ?? []);
      setBelow(cached.data.around?.below ?? []);
      setLoading(false);
      setError(null);
      if (fresh) return;
    } else {
      setLoading(true);
      setError(null);
    }

    fetchLeaderboard(apiPeriod)
      .then((lb) => {
        if (cancelled) return;
        RANK_CACHE.set(apiPeriod, { at: Date.now(), data: lb });
        setTop(lb.top);
        setMe(lb.me);
        setAbove(lb.around?.above ?? []);
        setBelow(lb.around?.below ?? []);
      })
      .catch((e) => {
        if (cancelled || cached) return; // 캐시 표시 중이면 에러 무시
        setError('랭킹을 불러오지 못했어요');
        console.warn('[ranking] fetch failed:', e);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [tab]);

  // 표시 행 계산: me.rank ≤ 10 이면 top + below(앞뒤 2개씩 보장하기 위한 덧붙임)
  // me.rank > 10 이면 top + 구분선 + above + me + below
  const meRank = me?.rank ?? null;
  const meInTop = meRank !== null && meRank <= 10;

  let topRows: LeaderEntry[] = top;
  if (meInTop && meRank !== null) {
    // 내 뒤로 2개 보장: 부족분만큼 below에서 채움
    const haveBelowInTop = 10 - meRank; // top 내에서 내 뒤 개수
    const needExtra = Math.max(0, 2 - haveBelowInTop);
    if (needExtra > 0 && below.length > 0) {
      topRows = [...top, ...below.slice(0, needExtra)];
    }
  }

  const resolveCharacter = (entry: Pick<LeaderEntry, 'user_id' | 'character'>): CharKey =>
    normalizeChar(entry.user_id === myUserId ? localCharacter : entry.character);

  return createPortal(
    <ModalShell
      onClose={onClose}
      maxWidth={360}
      zIndex={1000}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(k) => setTab(k as TabKey)}
    >
      <Text size={20 * scale} weight={900} color="#fff" align="center" style={{ marginBottom: 14 * scale }}>
        🏆 랭킹
      </Text>

      <div style={{ textAlign: 'center', margin: `0 0 ${12 * scale}px` }}>
        <Text size={12 * scale} color="#9ba0ab" align="center">
          {tab === 'daily' && `리셋까지 ${dailyCountdown}`}
          {tab === 'weekly' && `리셋까지 ${weeklyCountdown}`}
          {tab === 'all' && '역대 랭킹'}
        </Text>
      </div>

      <div
        style={{
          maxHeight: 320 * scale,
          overflowY: 'auto',
          borderRadius: 12 * scale,
          background: 'rgba(0,0,0,0.3)',
          border: `${1 * scale}px solid rgba(255,255,255,0.08)`,
          minHeight: 100 * scale,
        }}
      >
        {loading && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={`sk-${i}`} scale={scale} />
            ))}
          </>
        )}
        {error && !loading && (
          <div style={{ padding: 24 * scale, textAlign: 'center' }}>
            <Text size={12 * scale} color="#ff8a7a">{error}</Text>
          </div>
        )}
        {!loading && !error && top.length === 0 && (
          <div style={{ padding: 24 * scale, textAlign: 'center' }}>
            <Text size={12 * scale} color="#9ba0ab">아직 기록이 없어요. 첫 주자가 되어보세요!</Text>
          </div>
        )}
        {!loading && !error && topRows.map((entry) => (
          <RankRow
            key={`top-${entry.user_id}-${entry.rank}`}
            rank={entry.rank}
            name={entry.nickname}
            score={entry.score}
            char={resolveCharacter(entry)}
            reward={getReward(tab, entry.rank)}
            scale={scale}
            isMe={entry.user_id === myUserId}
          />
        ))}

        {/* 내 순위가 top10 밖이면 구분선(···) + above + me + below */}
        {!loading && !error && me && !meInTop && (
          <>
            <div
              style={{
                padding: `${8 * scale}px ${12 * scale}px`,
                textAlign: 'center',
                color: '#9ba0ab',
                fontSize: 14 * scale,
                fontWeight: 900,
                letterSpacing: 4 * scale,
                borderBottom: `${1 * scale}px solid rgba(255,255,255,0.06)`,
              }}
            >
              ···
            </div>
            {above.map((entry) => (
              <RankRow
                key={`above-${entry.user_id}-${entry.rank}`}
                rank={entry.rank}
                name={entry.nickname}
                score={entry.score}
                char={resolveCharacter(entry)}
                reward={getReward(tab, entry.rank)}
                scale={scale}
              />
            ))}
            <RankRow
              key={`me-${me.user_id}`}
              rank={me.rank}
              name={me.nickname}
              score={me.score}
              char={resolveCharacter(me)}
              reward={getReward(tab, me.rank)}
              scale={scale}
              isMe
            />
            {below.map((entry) => (
              <RankRow
                key={`below-${entry.user_id}-${entry.rank}`}
                rank={entry.rank}
                name={entry.nickname}
                score={entry.score}
                char={resolveCharacter(entry)}
                reward={getReward(tab, entry.rank)}
                scale={scale}
              />
            ))}
          </>
        )}
      </div>
    </ModalShell>,
    document.body,
  );
}

function SkeletonRow({ scale }: { scale: number }) {
  const avatarSize = 36 * scale;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: `${10 * scale}px ${12 * scale}px`,
        borderBottom: `${1 * scale}px solid rgba(255,255,255,0.06)`,
        gap: 10 * scale,
      }}
    >
      <div className={styles.skeleton} style={{ width: 18 * scale, height: 12 * scale }} />
      <div
        className={styles.skeleton}
        style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 * scale }}>
        <div className={styles.skeleton} style={{ width: '60%', height: 10 * scale }} />
        <div className={styles.skeleton} style={{ width: '35%', height: 8 * scale }} />
      </div>
      <div className={styles.skeleton} style={{ width: 40 * scale, height: 10 * scale }} />
    </div>
  );
}

function RankRow({
  rank, name, score, char, reward, scale, isMe = false,
}: { rank: number; name: string; score: number; char: CharKey; reward: Reward | null; scale: number; isMe?: boolean }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const isTop3 = rank <= 3;
  const avatarSize = 36 * scale;
  const ringColor = isMe ? '#e8593c' : isTop3 ? '#ffd24a' : 'rgba(255,255,255,0.15)';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: `${10 * scale}px ${12 * scale}px`,
        borderBottom: `${1 * scale}px solid rgba(255,255,255,0.06)`,
        gap: 10 * scale,
        background: isMe
          ? 'linear-gradient(90deg, rgba(232,89,60,0.35) 0%, rgba(232,89,60,0.18) 100%)'
          : isTop3 ? 'rgba(255,210,74,0.05)' : 'transparent',
        boxShadow: isMe ? `inset ${3 * scale}px 0 0 #e8593c` : 'none',
      }}
    >
      <div style={{ width: 24 * scale, textAlign: 'center', fontSize: 18 * scale }}>
        {medal ?? (
          <span style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: isMe ? 900 : 700, fontSize: 13 * scale,
            color: isMe ? '#fff' : '#9ba0ab',
          }}>{rank}</span>
        )}
      </div>
      <div
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          background: 'linear-gradient(180deg, #1e2a3e 0%, #0e1726 100%)',
          border: `${2 * scale}px solid ${ringColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: isTop3 || isMe ? `0 0 ${6 * scale}px ${ringColor}80` : 'none',
        }}
      >
        <img
          src={CHAR_SRC[char]}
          alt=""
          draggable={false}
          style={{
            width: avatarSize * 0.95,
            height: avatarSize * 0.95,
            objectFit: 'contain',
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 * scale }}>
        <Text
          size={13 * scale}
          weight={isMe || isTop3 ? 900 : 700}
          color={isMe ? '#fff' : isTop3 ? '#ffd24a' : '#fff'}
        >
          {rank}위 · {name}
        </Text>
        {reward && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 * scale }}>
            <span style={{
              fontFamily: 'GMarketSans, sans-serif',
              fontWeight: 900,
              fontSize: 9 * scale,
              color: '#0a0a14',
              background: '#ffd24a',
              padding: `${2 * scale}px ${6 * scale}px`,
              borderRadius: 999,
              letterSpacing: 0.3,
            }}>보상</span>
            {reward.coin !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 * scale }}>
                <CoinIcon size={11 * scale} />
                <span style={{
                  fontFamily: 'GMarketSans, sans-serif',
                  fontWeight: 900, fontSize: 10 * scale, color: '#ffd24a',
                }}>{reward.coin.toLocaleString()}</span>
              </div>
            )}
            {reward.gem !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 * scale }}>
                <GemIcon size={11 * scale} />
                <span style={{
                  fontFamily: 'GMarketSans, sans-serif',
                  fontWeight: 900, fontSize: 10 * scale, color: '#7ad7ff',
                }}>{reward.gem}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <Text size={12 * scale} weight={900} color="#fff">
        {score.toLocaleString()}점
      </Text>
    </div>
  );
}
