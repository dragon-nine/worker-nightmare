import { useEffect, useRef, useState } from 'react';
import { gameBus } from '../../../game/event-bus';
import { storage } from '../../../game/services/storage';
import { ALL_MISSION_IDS, getClaimableMissionCount } from '../../../game/services/missions';
import { isAdRemoved } from '../../../game/services/billing';
import { fetchMyRanks, getStoredUserId } from '../../../game/services/api';
import { getReward, nextDailyKey, nextWeeklyKey, type RewardPeriod } from '../../../game/services/rewards';
import { CoinIcon, GemIcon } from '../../components/CurrencyIcons';
import { StartButton } from '../../components/StartButton';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { AttendanceModal } from './AttendanceModal';
import { DebugModal } from './DebugModal';
import { MissionModal } from './MissionModal';
import { RankingModal } from './RankingModal';
import { ProfileModal, getNickname } from './ProfileModal';
import styles from '../overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

/**
 * 앱 첫 로드에서만 등장 애니메이션을 재생하기 위한 모듈 플래그.
 * 새로고침/리로드 시에만 false로 초기화 → 첫 마운트 후 true로 고정.
 * 탭 전환으로 HomeTab이 다시 마운트돼도 애니메이션 스킵.
 */
let homeIntroPlayed = false;

interface Props {
  scale: number;
}

export function HomeTab({ scale }: Props) {
  const tutorialDone = storage.getBool('tutorialDone');
  const bestScore = storage.getBestScore();
  const coins = storage.getNum('coins');
  const gems = storage.getNum('gems');
  const adRemoved = isAdRemoved();
  const [openModal, setOpenModal] = useState<'attendance' | 'mission' | 'ranking' | 'profile' | 'debug' | null>(null);
  const [nickname, setNickname] = useState(getNickname);
  const selectedChar = storage.getSelectedCharacter();

  // 뱃지 — 모달 닫힐 때마다 재계산 (claim 후 즉시 반영)
  const [attendanceBadge, setAttendanceBadge] = useState<string | undefined>(
    () => (storage.isAttendanceClaimedToday() ? undefined : '!'),
  );
  const [missionBadge, setMissionBadge] = useState<string | undefined>(() => {
    // 옛 미션 ID 정리 (배지 카운트 정확성을 위해 마운트 시점에 1회)
    storage.pruneClaimedMissions(ALL_MISSION_IDS);
    const n = getClaimableMissionCount();
    return n > 0 ? String(n) : undefined;
  });
  const refreshBadges = () => {
    setAttendanceBadge(storage.isAttendanceClaimedToday() ? undefined : '!');
    const n = getClaimableMissionCount();
    setMissionBadge(n > 0 ? String(n) : undefined);
  };
  const closeModal = () => {
    setOpenModal(null);
    refreshBadges();
    setNickname(getNickname());
  };

  // 첫 마운트에서만 인트로 애니메이션 재생
  const playIntroRef = useRef(!homeIntroPlayed);
  useEffect(() => {
    homeIntroPlayed = true;
  }, []);

  // 서버 프로필 동기 완료 시 닉네임 다시 읽기 (+ 마운트 직후 1회 재확인: 이벤트 놓친 경우 보강)
  useEffect(() => {
    setNickname(getNickname());
    return gameBus.on('profile-synced', () => setNickname(getNickname()));
  }, []);

  // 랭킹 보상 체크 — 접속 시 1회, 완료된 기간의 내 순위 조회 후 보상 적립
  useEffect(() => {
    if (!getStoredUserId()) return;
    const lastDaily = localStorage.getItem('reward.lastDailyKey');
    const lastWeekly = localStorage.getItem('reward.lastWeeklyKey');
    // lastKey 가 있으면 그 다음 기간부터 조회 (이미 받은 기간 제외)
    const fromDaily = lastDaily ? nextDailyKey(lastDaily) : undefined;
    const fromWeekly = lastWeekly ? nextWeeklyKey(lastWeekly) : undefined;

    fetchMyRanks(fromDaily, fromWeekly)
      .then((res) => {
        let coins = 0;
        let gems = 0;
        let latestDaily = lastDaily;
        let latestWeekly = lastWeekly;

        for (const e of res.daily) {
          const r = getReward('daily' as RewardPeriod, e.rank);
          if (r?.coin) coins += r.coin;
          if (r?.gem) gems += r.gem;
          if (!latestDaily || e.period_key > latestDaily) latestDaily = e.period_key;
        }
        for (const e of res.weekly) {
          const r = getReward('weekly' as RewardPeriod, e.rank);
          if (r?.coin) coins += r.coin;
          if (r?.gem) gems += r.gem;
          if (!latestWeekly || e.period_key > latestWeekly) latestWeekly = e.period_key;
        }

        // 보상 없어도 체크 시점은 갱신 (빈 기간도 스킵 처리)
        if (latestDaily) localStorage.setItem('reward.lastDailyKey', latestDaily);
        if (latestWeekly) localStorage.setItem('reward.lastWeeklyKey', latestWeekly);

        if (coins > 0 || gems > 0) {
          if (coins > 0) storage.addNum('coins', coins);
          if (gems > 0) storage.addNum('gems', gems);
          storage.flushNums();
          const items: { kind: 'coin' | 'gem'; amount: number; label?: string }[] = [];
          if (coins > 0) items.push({ kind: 'coin', amount: coins, label: '랭킹 보상' });
          if (gems > 0) items.push({ kind: 'gem', amount: gems, label: '랭킹 보상' });
          gameBus.emit('show-reward', items);
        }
      })
      .catch((e) => console.warn('[reward-check] failed:', e));
  }, []);

  const introClass = playIntroRef.current ? styles.fadeInUp : '';

  const handleStart = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    if (!tutorialDone) {
      gameBus.emit('screen-change', 'story');
    } else {
      gameBus.emit('start-game', undefined);
    }
  };

  const handleSettings = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('screen-change', 'settings');
  };

  return (
    <div
      className={playIntroRef.current ? styles.fadeIn : ''}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* 페이지 배경 */}
      <img
        src={`${BASE}main-screen/main-bg.png`}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />

      {/* ── 상단: AD제거(좌) + 코인/보석/설정(우) ── */}
      <div
        className={introClass}
        style={{
          position: 'absolute',
          top: `calc(var(--sat, 0px) + ${6 * scale}px)`,
          left: 0,
          right: 0,
          padding: `0 ${12 * scale}px`,
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
          animationDelay: '0.15s',
          pointerEvents: 'auto',
        }}
      >
        {/* 좌측: 프로필 (닉네임) */}
        <ProfilePill
          nickname={nickname}
          scale={scale}
          onTap={() => {
            gameBus.emit('play-sfx', 'sfx-click');
            setOpenModal('profile');
          }}
        />

        {/* 우측: 코인/보석/설정 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 * scale }}>
          <CurrencyPill kind="coin" amount={coins} scale={scale} />
          <CurrencyPill kind="gem" amount={gems} scale={scale} />
          <CircleButton accent="#ffffff" scale={scale} size={38} onTap={handleSettings}>
            <svg width={20 * scale} height={20 * scale} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </CircleButton>
        </div>
      </div>

      {/* 우측 플로팅 메뉴 — 출석 / 미션 / 랭킹 */}
      <div
        className={introClass}
        style={{
          position: 'absolute',
          right: 10 * scale,
          top: `calc(var(--sat, 0px) + ${100 * scale}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8 * scale,
          zIndex: 5,
          pointerEvents: 'auto',
          animationDelay: '0.15s',
        }}
      >
        <FloatingMenuButton
          icon={
            <svg width={26 * scale} height={26 * scale} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="12" cy="15" r="1.5" fill="#ffd24a" stroke="none" />
            </svg>
          }
          label="출석"
          accent="#ffffff"
          badge={attendanceBadge}
          scale={scale}
          onTap={() => {
            gameBus.emit('play-sfx', 'sfx-click');
            setOpenModal('attendance');
          }}
        />
        <FloatingMenuButton
          icon={
            <svg width={26 * scale} height={26 * scale} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3 8-8" />
              <path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h11" />
            </svg>
          }
          label="미션"
          accent="#ffffff"
          badge={missionBadge}
          scale={scale}
          onTap={() => {
            gameBus.emit('play-sfx', 'sfx-click');
            setOpenModal('mission');
          }}
        />
        <FloatingMenuButton
          icon={
            <svg width={26 * scale} height={26 * scale} viewBox="0 0 24 24" fill="none" stroke="#ffd24a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
              <path d="M7 6H4v2a3 3 0 003 3" />
              <path d="M17 6h3v2a3 3 0 01-3 3" />
            </svg>
          }
          label="랭킹"
          accent="#ffd24a"
          scale={scale}
          onTap={() => {
            gameBus.emit('play-sfx', 'sfx-click');
            setOpenModal('ranking');
          }}
        />
        {import.meta.env.DEV && (
          <FloatingMenuButton
            icon={
              <svg width={26 * scale} height={26 * scale} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a4 4 0 015.66 5.66l-1.06-1.06a2.5 2.5 0 00-3.54-3.54l-1.06-1.06z" />
                <path d="M13.5 7.5l-9 9a2.12 2.12 0 003 3l9-9" />
                <circle cx="6.5" cy="17.5" r="1" fill="#fff" stroke="none" />
              </svg>
            }
            label="디버그"
            accent="#ffffff"
            scale={scale}
            onTap={() => {
              gameBus.emit('play-sfx', 'sfx-click');
              setOpenModal('debug');
            }}
          />
        )}
      </div>

      {/* 모달 */}
      {openModal === 'attendance' && <AttendanceModal onClose={closeModal} />}
      {openModal === 'mission' && <MissionModal onClose={closeModal} />}
      {openModal === 'ranking' && <RankingModal onClose={closeModal} />}
      {openModal === 'profile' && <ProfileModal onClose={closeModal} />}
      {openModal === 'debug' && <DebugModal onClose={closeModal} />}

      {/* 좌측 플로팅: 부활 광고 제거 (출석과 대칭) — 구매 후 숨김 */}
      {!adRemoved && (
        <div
          className={introClass}
          style={{
            position: 'absolute',
            left: 10 * scale,
            top: `calc(var(--sat, 0px) + ${100 * scale}px)`,
            zIndex: 5,
            pointerEvents: 'auto',
            animationDelay: '0.15s',
          }}
        >
          <FloatingMenuButton
            icon={
              <svg width={32 * scale} height={32 * scale} viewBox="0 0 24 24">
                <text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="Arial Black, sans-serif" fill="#fff" letterSpacing="-0.5">AD</text>
                <line x1="3" y1="3" x2="21" y2="21" stroke="#ff6b3c" strokeWidth="3" strokeLinecap="round" />
              </svg>
            }
            label="광고제거"
            accent="#ff6b3c"
            scale={scale}
            onTap={() => {
              gameBus.emit('play-sfx', 'sfx-click');
              gameBus.emit('show-ad-remove', undefined);
            }}
          />
        </div>
      )}


      {/* 타이틀 */}
      <div
        className={introClass}
        style={{
          marginTop: `calc(var(--sat, 0px) + ${72 * scale}px)`,
          animationDelay: '0.15s',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <img
          src={`${BASE}main-screen/main-text.png`}
          alt="직장인 잔혹사"
          draggable={false}
          style={{ width: 331 * scale, display: 'block', objectFit: 'contain' }}
        />
      </div>

      {/* 선택된 캐릭터 — 타이틀 바로 아래, 남은 세로 공간 가득 */}
      <div
        className={introClass}
        style={{
          marginTop: -16 * scale,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animationDelay: '0.15s',
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
          width: '100%',
        }}
      >
        <img
          className={styles.characterBreathing}
          src={`${BASE}character/${selectedChar}-front.png`}
          alt=""
          draggable={false}
          style={{
            maxWidth: `${320 * scale}px`,
            maxHeight: '100%',
            width: 'auto',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            filter: `drop-shadow(0 ${6 * scale}px ${12 * scale}px rgba(0,0,0,0.5))`,
          }}
        />
      </div>

      {/* 하단: 최고기록 + 시작 버튼 */}
      <div
        style={{
          marginBottom: `calc(var(--sab, 0px) + ${130 * scale}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* 최고기록 배지 — 시작 버튼 위로 살짝 겹침 */}
        <div
          className={introClass}
          style={{
            animationDelay: '0.15s',
            padding: `${5 * scale}px ${16 * scale}px`,
            background: 'rgba(0,0,0,0.55)',
            border: `${2 * scale}px solid rgba(255,210,74,0.8)`,
            borderRadius: 999,
            boxShadow: '0 0 12px rgba(255,210,74,0.35)',
            backdropFilter: 'blur(4px)',
            marginBottom: `${-18 * scale}px`,
            zIndex: 2,
          }}
        >
          <Text
            size={16 * scale}
            weight={900}
            align="center"
            as="span"
            color="#ffd24a"
            style={{
              WebkitTextStroke: `${1.8 * scale}px #000`,
              paintOrder: 'stroke fill',
              letterSpacing: 0.5,
            }}
          >
            ★ BEST {bestScore}
          </Text>
        </div>

        {/* 시작 버튼 */}
        <div style={{ pointerEvents: 'auto' }}>
          <StartButton
            label="시작하기"
            scale={scale}
            onClick={handleStart}
            animate={playIntroRef.current}
          />
        </div>
      </div>
    </div>
  );
}

/* ── 플로팅 메뉴 버튼 (라벨 옵셔널) ── */

function FloatingMenuButton({
  icon,
  label,
  accent,
  badge,
  size = 48,
  scale,
  onTap,
}: {
  icon: React.ReactNode;
  label?: string;
  accent: string;
  badge?: string;
  size?: number;
  scale: number;
  onTap: () => void;
}) {
  return (
    <TapButton
      onTap={onTap}
      pressScale={0.9}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2 * scale,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: size * scale,
          height: size * scale,
          borderRadius: (size * 0.29) * scale,
          background: 'linear-gradient(180deg, #1e2a3e 0%, #0e1726 100%)',
          border: `${2 * scale}px solid ${accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.5), 0 0 ${10 * scale}px ${accent}40`,
          position: 'relative',
        }}
      >
        {icon}
        {badge && (
          <div
            style={{
              position: 'absolute',
              top: -4 * scale,
              right: -4 * scale,
              minWidth: 16 * scale,
              height: 16 * scale,
              padding: `0 ${4 * scale}px`,
              borderRadius: 999,
              background: '#e8593c',
              color: '#fff',
              fontSize: 10 * scale,
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `${1.5 * scale}px solid #0a0a14`,
              fontFamily: 'GMarketSans, sans-serif',
              lineHeight: 1,
            }}
          >
            {badge}
          </div>
        )}
      </div>
      {label && (
        <span
          style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 10 * scale,
            color: '#fff',
            WebkitTextStroke: `${1 * scale}px #000`,
            paintOrder: 'stroke fill',
            textShadow: `0 ${1 * scale}px ${2 * scale}px rgba(0,0,0,0.8)`,
            letterSpacing: 0.3,
          }}
        >
          {label}
        </span>
      )}
    </TapButton>
  );
}

/* ── 프로필 알약 버튼 (아바타 + 닉네임) ── */

function ProfilePill({
  nickname,
  scale,
  onTap,
}: {
  nickname: string;
  scale: number;
  onTap: () => void;
}) {
  const accent = '#ffd24a';
  const glow = 'rgba(255,210,74,0.35)';
  return (
    <TapButton
      onTap={onTap}
      pressScale={0.94}
      style={{
        height: 38 * scale,
        display: 'flex',
        alignItems: 'center',
        gap: 6 * scale,
        padding: `0 ${12 * scale}px`,
        background: 'linear-gradient(180deg, #1e2a3e 0%, #0e1726 100%)',
        border: `${2 * scale}px solid ${accent}`,
        borderRadius: 999,
        boxShadow: `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.5), 0 0 ${10 * scale}px ${glow}`,
      }}
    >
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 12 * scale,
          color: '#fff',
          letterSpacing: 0.3,
          whiteSpace: 'nowrap',
        }}
      >
        {nickname}
      </span>
      <svg
        width={12 * scale}
        height={12 * scale}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffd24a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    </TapButton>
  );
}

/* ── 단일 동그라미 버튼 (부활 광고 제거/설정용) ── */

function CircleButton({
  accent,
  scale,
  onTap,
  children,
  size: sizeBase = 44,
}: {
  accent: string;
  scale: number;
  onTap: () => void;
  children: React.ReactNode;
  size?: number;
}) {
  const size = sizeBase * scale;
  return (
    <TapButton
      onTap={onTap}
      pressScale={0.9}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(180deg, #1e2a3e 0%, #0e1726 100%)',
        border: `${2 * scale}px solid ${accent}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.5), 0 0 ${10 * scale}px ${accent}40`,
      }}
    >
      {children}
    </TapButton>
  );
}

/* ── 코인/보석 알약 표시 ── */

function CurrencyPill({
  kind,
  amount,
  scale,
}: {
  kind: 'coin' | 'gem';
  amount: number;
  scale: number;
}) {
  const iconSize = 22 * scale;
  const accent = 'rgba(255,255,255,0.9)';
  const glow = 'rgba(255,255,255,0.35)';

  return (
    <div
      style={{
        height: 38 * scale,
        display: 'flex',
        alignItems: 'center',
        gap: 5 * scale,
        padding: `0 ${12 * scale}px 0 ${6 * scale}px`,
        background: 'linear-gradient(180deg, #1e2a3e 0%, #0e1726 100%)',
        border: `${2 * scale}px solid ${accent}`,
        borderRadius: 999,
        boxShadow: `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.5), 0 0 ${10 * scale}px ${glow}`,
      }}
    >
      {kind === 'coin' ? <CoinIcon size={iconSize} /> : <GemIcon size={iconSize} />}
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 13 * scale,
          color: '#fff',
          letterSpacing: 0.3,
          minWidth: 20 * scale,
          textAlign: 'left',
        }}
      >
        {formatNum(amount)}
      </span>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}
