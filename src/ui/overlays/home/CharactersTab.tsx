import { useState } from 'react';
import { gameBus } from '../../../game/event-bus';
import { storage } from '../../../game/services/storage';
import { logEvent } from '../../../game/services/analytics';
import { updateMyProfile } from '../../../game/services/api';
import { CoinIcon, GemIcon } from '../../components/CurrencyIcons';
import { ModalShell } from '../../components/ModalShell';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useResponsiveScale } from '../../hooks/useResponsiveScale';
import styles from '../overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

interface Props {
  scale: number;
}

interface CharItem {
  id: string;
  /** 캐릭터 닉네임 (예: 토실이) */
  name: string;
  /** 직책 (예: 인턴) — 성능 차이 없음, 순수 서사 */
  jobTitle: string;
  /** 한 줄 캐릭터 소개 */
  desc: string;
  src: string;
  /** 에셋 준비 안 된 캐릭터는 false → 잠김 카드로 표시 */
  available: boolean;
  price?: number;
  currency?: 'coin' | 'gem';
  highlight?: 'best' | 'hot';
}

/**
 * 캐릭터 카탈로그 — 직급 순서 (인턴 → 팀장).
 * 성능 차이 없음. 외형/서사만 다름.
 */
const CHARACTERS: CharItem[] = [
  {
    id: 'rabbit',
    name: '토실이',
    jobTitle: '인턴',
    desc: '출근 첫날부터 야근. 눈빛이 이미 죽어있다.',
    src: 'character/rabbit-front.png',
    available: true,
  },
  {
    id: 'penguin',
    name: '꾸벅이',
    jobTitle: '수습',
    desc: '인사만 200번째. 이름은 아직 아무도 몰라준다.',
    src: 'character/penguin-front.png',
    available: true,
    price: 1500,
    currency: 'coin',
  },
  {
    id: 'sheep',
    name: '메에리',
    jobTitle: '사원',
    desc: '"네네 알겠습니다" 자동응답기. 시키면 다 한다.',
    src: 'character/sheep-front.png',
    available: true,
    price: 2500,
    currency: 'coin',
    highlight: 'hot',
  },
  {
    id: 'cat',
    name: '냥빠꾸',
    jobTitle: '주임',
    desc: '하기 싫은 건 절대 안 한다. 근데 하면 잘한다.',
    src: 'character/cat-front.png',
    available: true,
    price: 4500,
    currency: 'coin',
  },
  {
    id: 'koala',
    name: '졸림이',
    jobTitle: '대리',
    desc: '회의 중 눈 뜨고 자는 스킬 보유. 근데 일은 다 함.',
    src: 'character/koala-front.png',
    available: true,
    price: 6000,
    currency: 'coin',
  },
  {
    id: 'lion',
    name: '으르렁',
    jobTitle: '팀장',
    desc: '"이것만 하고 퇴근해." 본인은 칼퇴한다.',
    src: 'character/lion-front.png',
    available: true,
    price: 150,
    currency: 'gem',
    highlight: 'best',
  },
];

export function CharactersTab({ scale }: Props) {
  // 스토리지 미러링 → 즉시 리렌더
  const [owned, setOwned] = useState<string[]>(() => storage.getOwnedCharacters());
  const [selected, setSelected] = useState<string>(() => storage.getSelectedCharacter());
  const [coins, setCoins] = useState<number>(() => storage.getNum('coins'));
  const [gems, setGems] = useState<number>(() => storage.getNum('gems'));
  const [pendingChar, setPendingChar] = useState<CharItem | null>(null);
  const selectedItem = CHARACTERS.find((item) => item.id === selected) ?? CHARACTERS[0];
  const orderedCharacters = [...CHARACTERS].sort((a, b) => {
    const aOwned = owned.includes(a.id);
    const bOwned = owned.includes(b.id);
    if (a.id === selected && b.id !== selected) return -1;
    if (b.id === selected && a.id !== selected) return 1;
    if (aOwned !== bOwned) return aOwned ? -1 : 1;
    return CHARACTERS.findIndex((item) => item.id === a.id) - CHARACTERS.findIndex((item) => item.id === b.id);
  });

  const handleAction = (item: CharItem) => {
    gameBus.emit('play-sfx', 'sfx-click');

    if (!item.available) {
      gameBus.emit('toast', '준비 중인 캐릭터입니다');
      return;
    }

    const isOwned = owned.includes(item.id);

    if (isOwned) {
      if (selected === item.id) {
        gameBus.emit('toast', `${item.name} 이미 선택됨`);
        return;
      }
      storage.setSelectedCharacter(item.id);
      setSelected(item.id);
      logEvent('character_select', { id: item.id });
      gameBus.emit('toast', `${item.name} 선택됨`);
      // 서버 프로필에도 반영 (랭킹에 최신 캐릭터 보이게) — 실패 시 무시 (로컬은 이미 반영)
      updateMyProfile({ character: item.id }).catch((e) => {
        console.warn('[api] character sync failed:', e);
      });
      return;
    }

    if (item.price === undefined || !item.currency) return;
    // 바로 구매하지 않고 확인 모달 띄우기
    setPendingChar(item);
  };

  const confirmPurchase = () => {
    if (!pendingChar) return;
    const item = pendingChar;
    gameBus.emit('play-sfx', 'sfx-click');

    if (item.price === undefined || !item.currency) {
      setPendingChar(null);
      return;
    }
    const balance = item.currency === 'coin' ? coins : gems;
    if (balance < item.price) {
      gameBus.emit('toast', `${item.currency === 'coin' ? '코인' : '보석'} 부족`);
      setPendingChar(null);
      return;
    }

    const newBalance = storage.addNum(item.currency === 'coin' ? 'coins' : 'gems', -item.price);
    storage.addOwnedCharacter(item.id);
    if (item.currency === 'coin') setCoins(newBalance); else setGems(newBalance);
    setOwned(storage.getOwnedCharacters());
    logEvent('character_purchase_success', {
      id: item.id,
      price: item.price,
      currency: item.currency,
    });
    gameBus.emit('toast', `${item.name} 구매 완료!`);
    // 서버 보유 목록 싱크 — 실패해도 로컬엔 반영됨. 다음 부팅에 재싱크됨.
    updateMyProfile({ owned_characters: storage.getOwnedCharacters() }).catch((e) => {
      console.warn('[api] owned sync failed:', e);
    });
    setPendingChar(null);
  };

  const cancelPurchase = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    setPendingChar(null);
  };

  return (
    <div
      className={styles.fadeIn}
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at 20% 80%, rgba(60,50,40,0.2) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(40,35,30,0.2) 0%, transparent 50%),
          #1a1a1f
        `,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
      }}
    >
      {/* ── 상단 헤더 ── */}
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
          캐릭터
        </span>
        <CurrencyPill kind="coin" amount={coins} scale={scale} />
        <CurrencyPill kind="gem" amount={gems} scale={scale} />
      </div>

      {/* ── 스크롤 영역 ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: `${16 * scale}px ${14 * scale}px calc(var(--sab, 0px) + ${88 * scale}px)`,
        }}
      >
        <SelectedCharacterHero
          item={selectedItem}
          isOwned={owned.includes(selectedItem.id)}
          scale={scale}
        />

        {/* 캐릭터 전체 — 단일 섹션 */}
        <Section
          title="캐릭터 도감"
          hint={`${owned.length}/${CHARACTERS.length} 보유`}
          scale={scale}
          icon={
            <svg width={20 * scale} height={20 * scale} viewBox="0 0 24 24" fill="none" stroke="#ffd24a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z" fill="#ffd24a" fillOpacity="0.15" />
            </svg>
          }
        >
          <CardGrid scale={scale}>
            {orderedCharacters.map((item) => (
              <CharCard
                key={item.id}
                item={item}
                isOwned={owned.includes(item.id)}
                isSelected={selected === item.id}
                scale={scale}
                onAction={() => handleAction(item)}
              />
            ))}
          </CardGrid>
        </Section>
      </div>

      {/* 캐릭터 구매 확인 모달 */}
      {pendingChar && (
        <CharPurchaseConfirmModal
          item={pendingChar}
          currentCoins={coins}
          currentGems={gems}
          onConfirm={confirmPurchase}
          onCancel={cancelPurchase}
        />
      )}
    </div>
  );
}

function SelectedCharacterHero({
  item,
  isOwned,
  scale,
}: {
  item: CharItem;
  isOwned: boolean;
  scale: number;
}) {
  return (
    <div
      style={{
        marginBottom: 18 * scale,
        padding: `${14 * scale}px`,
        borderRadius: 18 * scale,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        border: `${1.5 * scale}px solid rgba(255,255,255,0.08)`,
        boxShadow: `0 ${8 * scale}px ${24 * scale}px rgba(0,0,0,0.18)`,
        display: 'flex',
        alignItems: 'center',
        gap: 14 * scale,
      }}
    >
      <div
        style={{
          width: 104 * scale,
          height: 104 * scale,
          borderRadius: 16 * scale,
          background: 'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.12), rgba(0,0,0,0.18))',
          border: `${1 * scale}px solid rgba(255,255,255,0.08)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <img
          src={`${BASE}${item.src}`}
          alt={item.name}
          draggable={false}
          style={{
            width: '88%',
            height: '88%',
            objectFit: 'contain',
          }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6 * scale,
            padding: `${4 * scale}px ${9 * scale}px`,
            borderRadius: 999,
            background: isOwned ? 'rgba(63,220,176,0.14)' : 'rgba(255,210,74,0.14)',
            border: `${1 * scale}px solid ${isOwned ? 'rgba(63,220,176,0.28)' : 'rgba(255,210,74,0.28)'}`,
            marginBottom: 8 * scale,
          }}
        >
          <Text
            size={10 * scale}
            weight={900}
            color={isOwned ? '#73f2ca' : '#ffd24a'}
            as="span"
          >
            {isOwned ? '현재 선택 캐릭터' : '미보유 캐릭터'}
          </Text>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 * scale, flexWrap: 'wrap' }}>
          <Text size={22 * scale} weight={900}>{item.name}</Text>
          <Text size={12 * scale} weight={700} color="rgba(255,255,255,0.55)" as="span">
            {item.jobTitle}
          </Text>
        </div>

        <Text
          size={12 * scale}
          color="rgba(255,255,255,0.68)"
          lineHeight={1.5}
          style={{ marginTop: 6 * scale }}
        >
          {item.desc}
        </Text>
      </div>
    </div>
  );
}

/* ── 캐릭터 구매 확인 모달 ── */

function CharPurchaseConfirmModal({
  item,
  currentCoins,
  currentGems,
  onConfirm,
  onCancel,
}: {
  item: CharItem;
  currentCoins: number;
  currentGems: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const scale = useResponsiveScale();
  if (item.price === undefined || !item.currency) return null;

  // 마침표 + (선택적 따옴표) 뒤에 공백이 있으면 줄바꿈으로 치환
  // 예: "야근. 눈빛이..." → "야근.\n눈빛이..."
  //     "\"퇴근해.\" 본인은..." → "\"퇴근해.\"\n본인은..."
  const formattedDesc = item.desc.replace(/(\.["'"'"']?)\s+/g, '$1\n');

  const isCoin = item.currency === 'coin';
  const currentBalance = isCoin ? currentCoins : currentGems;
  const insufficient = currentBalance < item.price;
  const balanceAfter = Math.max(0, currentBalance - item.price);
  const Icon = isCoin ? CoinIcon : GemIcon;
  const label = isCoin ? '코인' : '보석';

  return (
    <ModalShell onClose={onCancel} maxWidth={320} zIndex={400}>
      {/* 타이틀 */}
      <Text size={20 * scale} weight={900} align="center" style={{ marginBottom: 4 * scale }}>
        캐릭터 구매
      </Text>
      <Text
        size={12 * scale}
        color="rgba(255,255,255,0.5)"
        align="center"
        style={{ marginBottom: 18 * scale }}
      >
        이 캐릭터를 구매하시겠어요?
      </Text>

      {/* 캐릭터 카드 */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `${1 * scale}px solid rgba(255,255,255,0.08)`,
          borderRadius: 14 * scale,
          padding: `${14 * scale}px`,
          marginBottom: 16 * scale,
          display: 'flex',
          alignItems: 'center',
          gap: 12 * scale,
        }}
      >
        {/* 캐릭터 이미지 */}
        <div
          style={{
            width: 64 * scale,
            height: 64 * scale,
            borderRadius: 14 * scale,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <img
            src={`${BASE}${item.src}`}
            alt={item.name}
            draggable={false}
            style={{
              width: '90%',
              height: '90%',
              objectFit: 'contain',
            }}
          />
        </div>
        {/* 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 * scale }}>
            <Text size={17 * scale} weight={900}>{item.name}</Text>
            <Text size={11 * scale} color="rgba(255,255,255,0.5)" weight={700} as="span">
              {item.jobTitle}
            </Text>
          </div>
          <Text
            size={11 * scale}
            color="rgba(255,255,255,0.55)"
            lineHeight={1.4}
            style={{ marginTop: 2 * scale, whiteSpace: 'pre-line' }}
          >
            {formattedDesc}
          </Text>
        </div>
      </div>

      {/* 결제 정보 — 3단 */}
      <div
        style={{
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 12 * scale,
          padding: `${12 * scale}px ${14 * scale}px`,
          marginBottom: 18 * scale,
          display: 'flex',
          flexDirection: 'column',
          gap: 8 * scale,
        }}
      >
        {/* 보유 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text size={13 * scale} color="rgba(255,255,255,0.6)" as="span">
            보유 {label}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale }}>
            <Icon size={18 * scale} />
            <Text
              size={15 * scale}
              weight={900}
              color={insufficient ? '#e8593c' : undefined}
              as="span"
            >
              {currentBalance.toLocaleString()}개
            </Text>
          </div>
        </div>

        {/* 결제 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text size={13 * scale} color="rgba(255,255,255,0.6)" as="span">
            결제 {label}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale }}>
            <Icon size={18 * scale} />
            <Text size={15 * scale} weight={900} color="#e8593c" as="span">
              − {item.price.toLocaleString()}개
            </Text>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: 1 * scale, background: 'rgba(255,255,255,0.08)' }} />

        {/* 결제 후 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text size={13 * scale} color="rgba(255,255,255,0.7)" as="span">
            결제 후 {label}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale }}>
            <Icon size={18 * scale} />
            <Text
              size={16 * scale}
              weight={900}
              color={isCoin ? '#ffd24a' : '#00d4ff'}
              as="span"
            >
              {balanceAfter.toLocaleString()}개
            </Text>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 8 * scale }}>
        <TapButton
          onTap={onCancel}
          style={{
            flex: 1,
            padding: `${14 * scale}px`,
            background: 'rgba(255,255,255,0.08)',
            border: `${1.5 * scale}px solid rgba(255,255,255,0.15)`,
            borderRadius: 12 * scale,
            textAlign: 'center',
          }}
        >
          <Text size={15 * scale} weight={700} color="rgba(255,255,255,0.7)" as="span">
            취소
          </Text>
        </TapButton>
        <TapButton
          onTap={insufficient ? onCancel : onConfirm}
          style={{
            flex: 1.2,
            padding: `${14 * scale}px`,
            background: insufficient ? 'rgba(232,89,60,0.2)' : '#ffd24a',
            border: `${1.5 * scale}px solid ${insufficient ? '#e8593c' : '#ffc107'}`,
            borderRadius: 12 * scale,
            textAlign: 'center',
            opacity: insufficient ? 0.6 : 1,
          }}
        >
          <Text
            size={15 * scale}
            weight={900}
            color={insufficient ? '#e8593c' : '#3a2800'}
            as="span"
          >
            {insufficient ? `${label} 부족` : '구매하기'}
          </Text>
        </TapButton>
      </div>
    </ModalShell>
  );
}

/* ── Section ── */

function Section({
  title,
  hint,
  icon,
  scale,
  children,
}: {
  title: string;
  hint?: string;
  icon: React.ReactNode;
  scale: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 * scale }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 * scale, marginBottom: 11 * scale }}>
        <div style={{ width: 22 * scale, height: 22 * scale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span
          style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 16 * scale,
            color: '#fff',
          }}
        >
          {title}
        </span>
        {hint && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'GMarketSans, sans-serif',
              fontSize: 11 * scale,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Card grid wrapper ── */

function CardGrid({ scale, children }: { scale: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8 * scale,
      }}
    >
      {children}
    </div>
  );
}

/* ── Character card (square with large image) ── */

function CharCard({
  item,
  isOwned,
  isSelected,
  scale,
  onAction,
}: {
  item: CharItem;
  isOwned: boolean;
  isSelected: boolean;
  scale: number;
  onAction: () => void;
}) {
  const isLocked = !item.available;
  const isHot = item.highlight === 'hot';

  let bg = 'rgba(255,255,255,0.03)';
  let border = `1px solid rgba(255,255,255,0.06)`;
  if (isLocked) {
    bg = 'rgba(0,0,0,0.35)';
    border = `1px dashed rgba(255,255,255,0.1)`;
  } else if (isSelected) {
    bg = 'linear-gradient(180deg, rgba(255,210,74,0.12), rgba(255,210,74,0.02))';
    border = `${1.5 * scale}px solid rgba(255,210,74,0.5)`;
  } else if (isHot && !isOwned) {
    bg = 'linear-gradient(180deg, rgba(250,199,117,0.08), rgba(250,199,117,0.02))';
    border = `${1.5 * scale}px solid rgba(250,199,117,0.32)`;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* 라벨 */}
      {!isLocked && isSelected && (
        <Tag text="선택됨" color="#ffd24a" textColor="#3a2400" scale={scale} />
      )}
      {!isLocked && !isSelected && isHot && !isOwned && (
        <Tag text="HOT" color="#BA7517" textColor="#fff" scale={scale} />
      )}
      {isLocked && (
        <Tag text="준비 중" color="rgba(60,60,70,0.95)" textColor="rgba(255,255,255,0.7)" scale={scale} />
      )}

      <TapButton
        onTap={onAction}
        pressScale={isLocked ? 0.99 : 0.97}
        scrollSafe
        style={{
          width: '100%',
          background: bg,
          border,
          borderRadius: 14 * scale,
          padding: `${10 * scale}px ${9 * scale}px ${9 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6 * scale,
          boxSizing: 'border-box',
          boxShadow: isSelected
            ? `0 0 ${14 * scale}px rgba(255,210,74,0.25)`
            : `inset 0 ${1.5 * scale}px 0 rgba(255,255,255,0.04)`,
          opacity: isLocked ? 0.65 : 1,
        }}
      >
        {/* 큰 캐릭터 이미지 영역 */}
        <div
          style={{
            width: '100%',
            aspectRatio: '1 / 0.9',
            borderRadius: 12 * scale,
            background: 'rgba(0,0,0,0.25)',
            border: `1px solid rgba(255,255,255,0.05)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {isLocked ? (
            <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          ) : (
            <img
              src={`${BASE}${item.src}`}
              alt={item.name}
              draggable={false}
              style={{
                width: '78%',
                height: '78%',
                objectFit: 'contain',
              }}
            />
          )}
        </div>

        {/* 이름 + 직책 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1 * scale,
            width: '100%',
          }}
        >
          <div
            style={{
              fontFamily: 'GMarketSans, sans-serif',
              fontWeight: 900,
              fontSize: 14 * scale,
              color: isLocked ? 'rgba(255,255,255,0.55)' : '#fff',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontFamily: 'GMarketSans, sans-serif',
              fontWeight: 700,
              fontSize: 9 * scale,
              color: isLocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)',
              textAlign: 'center',
              letterSpacing: 0.3,
              lineHeight: 1.1,
            }}
          >
            {item.jobTitle}
          </div>
        </div>

        {/* 액션 버튼 */}
        <ActionButton
          isLocked={isLocked}
          isOwned={isOwned}
          isSelected={isSelected}
          item={item}
          scale={scale}
        />
      </TapButton>
    </div>
  );
}

function ActionButton({
  isLocked,
  isOwned,
  isSelected,
  item,
  scale,
}: {
  isLocked: boolean;
  isOwned: boolean;
  isSelected: boolean;
  item: CharItem;
  scale: number;
}) {
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: `${7 * scale}px`,
    borderRadius: 9 * scale,
    fontFamily: 'GMarketSans, sans-serif',
    fontSize: 11 * scale,
    fontWeight: 900,
    textAlign: 'center',
    letterSpacing: 0.3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4 * scale,
    boxSizing: 'border-box',
  };

  if (isLocked) {
    return (
      <div
        style={{
          ...baseStyle,
          background: 'rgba(255,255,255,0.04)',
          border: `${1 * scale}px solid rgba(255,255,255,0.1)`,
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        🔒 잠김
      </div>
    );
  }
  if (isSelected) {
    return (
      <div
        style={{
          ...baseStyle,
          background: 'rgba(255,210,74,0.18)',
          border: `${1 * scale}px solid rgba(255,210,74,0.5)`,
          color: '#ffd24a',
        }}
      >
        ✓ 사용중
      </div>
    );
  }
  if (isOwned) {
    return (
      <div
        style={{
          ...baseStyle,
          background: '#3fdcb0',
          color: '#0a3a28',
          boxShadow: `0 ${2 * scale}px ${8 * scale}px rgba(63,220,176,0.3)`,
        }}
      >
        선택
      </div>
    );
  }
  // 미보유 → 구매 버튼
  return (
    <div
      style={{
        ...baseStyle,
        background: '#e8593c',
        color: '#fff',
        boxShadow: `0 ${2 * scale}px ${8 * scale}px rgba(232,89,60,0.25)`,
      }}
    >
      {item.currency === 'gem' ? <GemIcon size={14 * scale} /> : <CoinIcon size={14 * scale} />}
      {item.price}
    </div>
  );
}

function Tag({
  text,
  color,
  textColor,
  scale,
}: {
  text: string;
  color: string;
  textColor: string;
  scale: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: -8 * scale,
        right: 16 * scale,
        background: color,
        color: textColor,
        fontSize: 9 * scale,
        fontWeight: 700,
        padding: `${3 * scale}px ${8 * scale}px`,
        borderRadius: 10 * scale,
        letterSpacing: 0.5,
        zIndex: 2,
        fontFamily: 'GMarketSans, sans-serif',
      }}
    >
      {text}
    </div>
  );
}

/* ── Currency icons ── */

function CurrencyPill({
  kind,
  amount,
  scale,
}: {
  kind: 'coin' | 'gem';
  amount: number;
  scale: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4 * scale,
        padding: `${5 * scale}px ${10 * scale}px ${5 * scale}px ${5 * scale}px`,
        borderRadius: 20 * scale,
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid rgba(255,255,255,0.08)`,
        fontFamily: 'GMarketSans, sans-serif',
        fontWeight: 700,
        fontSize: 13 * scale,
        color: '#fff',
      }}
    >
      {kind === 'coin' ? <CoinIcon size={20 * scale} /> : <GemIcon size={20 * scale} />}
      <span>{amount.toLocaleString()}</span>
    </div>
  );
}
