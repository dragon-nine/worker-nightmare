import { useState } from 'react';
import { gameBus } from '../../../game/event-bus';
import { storage } from '../../../game/services/storage';
import { logEvent } from '../../../game/services/analytics';
import {
  isAdRemoved,
  purchaseGemPackage,
  type GemPackageKey,
} from '../../../game/services/billing';
import { AdRewardButton } from '../../components/AdRewardButton';
import { CoinIcon, GemIcon } from '../../components/CurrencyIcons';
import { ModalShell } from '../../components/ModalShell';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useResponsiveScale } from '../../hooks/useResponsiveScale';
import { useTossProductPrices } from '../../hooks/useTossProductPrices';
import styles from '../overlay.module.css';

interface Props {
  scale: number;
}

/* ── 데이터 ── */

interface FreeReward {
  id: string;
  kind: 'coin' | 'gem';
  amount: number;
  /** 일 최대 수령 횟수 */
  limit: number;
}

const FREE_REWARDS: FreeReward[] = [
  { id: 'free-coin', kind: 'coin', amount: 50, limit: 5 },
  { id: 'free-gem',  kind: 'gem',  amount: 3,  limit: 3 },
];

interface PkgItem {
  id: string;
  amount: number;
  amountLabel: string;
  bonusPct?: number;
  extra: string;
  extraNeutral?: boolean;
  price: string;
  /** 코인 패키지의 보석 가격 (숫자) — 아이콘 + 숫자로 렌더링 */
  gemPrice?: number;
  highlight?: 'best' | 'hot';
  /** 토스 IAP SKU 매핑 키 (보석 패키지만) */
  skuKey?: GemPackageKey;
}

const GEM_PACKAGES: PkgItem[] = [
  { id: 'g1', amount: 30,   amountLabel: '보석 30개',    extra: '기본 상품',          extraNeutral: true, price: '₩1,100',  skuKey: 'gem30' },
  { id: 'g2', amount: 165,  amountLabel: '보석 165개',   bonusPct: 10, extra: '150 + 보너스 15',  price: '₩5,500',  highlight: 'hot',  skuKey: 'gem165' },
  { id: 'g3', amount: 500,  amountLabel: '보석 500개',   bonusPct: 25, extra: '400 + 보너스 100', price: '₩11,000', highlight: 'best', skuKey: 'gem500' },
];

const COIN_PACKAGES: PkgItem[] = [
  { id: 'c1', amount: 1000,  amountLabel: '코인 1,000개', extra: '소량 충전',         extraNeutral: true, price: '10',  gemPrice: 10 },
  { id: 'c2', amount: 6000,  amountLabel: '코인 6,000개', bonusPct: 20, extra: '5000 + 보너스 1000',  price: '50',  gemPrice: 50 },
  { id: 'c3', amount: 14000, amountLabel: '코인 14,000개', bonusPct: 40, extra: '10000 + 보너스 4000', price: '100', gemPrice: 100 },
];

/* ── 컴포넌트 ── */

interface PendingCoinPurchase {
  pkg: PkgItem;
  gemCost: number;
}

export function ShopTab({ scale }: Props) {
  // 토스 동적 가격 (fallback은 PkgItem.price 하드코딩 사용)
  const tossPrices = useTossProductPrices();

  // 구매/수령 후 즉시 UI 갱신을 위해 state로 미러링
  const [coins, setCoins] = useState(() => storage.getNum('coins'));
  const [gems, setGems] = useState(() => storage.getNum('gems'));
  const [freeRewardCounts, setFreeRewardCounts] = useState<Record<string, number>>(
    () => storage.getFreeRewardState().counts,
  );
  const [pendingCoinPurchase, setPendingCoinPurchase] = useState<PendingCoinPurchase | null>(null);
  const adRemoved = isAdRemoved();

  const refreshBalance = () => {
    setCoins(storage.getNum('coins'));
    setGems(storage.getNum('gems'));
  };

  const refreshFreeRewardCounts = () => {
    setFreeRewardCounts({ ...storage.getFreeRewardState().counts });
  };

  const handleAdRemove = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('show-ad-remove', undefined);
  };

  const handleFreeReward = (r: FreeReward) => {
    // 일 제한 체크 (방어적 — UI에서도 막지만 race 방지)
    const currentCount = storage.getFreeRewardCount(r.id);
    if (currentCount >= r.limit) {
      gameBus.emit('toast', '오늘 수령 가능한 횟수를 모두 사용했어요');
      return;
    }

    storage.addNum(r.kind === 'coin' ? 'coins' : 'gems', r.amount);
    if (r.kind === 'coin') storage.recordCoinEarned(r.amount);
    const newCount = storage.incrementFreeRewardCount(r.id);
    refreshBalance();
    refreshFreeRewardCounts();
    logEvent('free_reward_claim', { kind: r.kind, amount: r.amount, count: newCount });
    gameBus.emit('show-reward', [{ kind: r.kind, amount: r.amount }]);
  };

  const [gemPurchasing, setGemPurchasing] = useState<string | null>(null);

  const handlePackage = (p: PkgItem, kind: 'gem' | 'coin') => {
    gameBus.emit('play-sfx', 'sfx-click');

    if (kind === 'coin') {
      // 코인 충전 — 보석 차감 (확인 모달 먼저)
      const gemCost = p.gemPrice ?? 0;
      if (!Number.isFinite(gemCost) || gemCost <= 0) {
        gameBus.emit('toast', '가격 정보가 올바르지 않아요');
        return;
      }
      setPendingCoinPurchase({ pkg: p, gemCost });
      return;
    }

    // 보석 충전 — 실제 결제 호출 (토스 IAP / DEV mock)
    if (!p.skuKey) {
      gameBus.emit('toast', '가격 정보가 올바르지 않아요');
      return;
    }
    if (gemPurchasing) return; // 진행 중이면 중복 차단
    setGemPurchasing(p.id);
    purchaseGemPackage(p.skuKey)
      .then((ok) => {
        if (ok) {
          refreshBalance();
          logEvent('gem_purchase_success', { pkg: p.skuKey!, amount: p.amount });
          gameBus.emit('show-reward', [{ kind: 'gem', amount: p.amount }]);
        } else {
          logEvent('gem_purchase_fail', { pkg: p.skuKey! });
          gameBus.emit('toast', '결제가 취소되거나 실패했어요');
        }
      })
      .finally(() => setGemPurchasing(null));
  };

  const confirmCoinPurchase = () => {
    if (!pendingCoinPurchase) return;
    const { pkg, gemCost } = pendingCoinPurchase;
    gameBus.emit('play-sfx', 'sfx-click');

    const currentGems = storage.getNum('gems');
    if (currentGems < gemCost) {
      gameBus.emit('toast', `보석이 부족해요 (필요: ${gemCost}개 / 보유: ${currentGems}개)`);
      setPendingCoinPurchase(null);
      return;
    }
    storage.addNum('gems', -gemCost);
    storage.addNum('coins', pkg.amount);
    refreshBalance();
    logEvent('coin_purchase_success', { pkg: pkg.id, amount: pkg.amount, cost: gemCost });
    gameBus.emit('show-reward', [{ kind: 'coin', amount: pkg.amount }]);
    setPendingCoinPurchase(null);
  };

  const cancelCoinPurchase = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    setPendingCoinPurchase(null);
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
          상점
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
        {/* 부활 광고 제거 — 구매 전: 배너 / 구매 후: 구매 완료 칩 */}
        {adRemoved ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8 * scale,
              padding: `${10 * scale}px ${14 * scale}px`,
              background: 'rgba(63, 220, 176, 0.08)',
              border: `${1 * scale}px solid rgba(63, 220, 176, 0.3)`,
              borderRadius: 12 * scale,
              marginBottom: 18 * scale,
            }}
          >
            {/* 체크 아이콘 */}
            <div
              style={{
                width: 22 * scale,
                height: 22 * scale,
                borderRadius: '50%',
                background: '#3fdcb0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width={14 * scale} height={14 * scale} viewBox="0 0 24 24" fill="none" stroke="#0a1f15" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            {/* 텍스트 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'GMarketSans, sans-serif',
                  fontSize: 13 * scale,
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: 0.2,
                }}
              >
                부활 광고 제거
              </div>
              <div
                style={{
                  fontFamily: 'GMarketSans, sans-serif',
                  fontSize: 10 * scale,
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: 1 * scale,
                }}
              >
                구매 완료 — 부활 시 광고가 나오지 않아요
              </div>
            </div>
          </div>
        ) : (
          <TapButton
            onTap={handleAdRemove}
            pressScale={0.97}
            scrollSafe
            style={{
              background: 'linear-gradient(135deg, #2a1a1e, #3a1f1a)',
              border: `${1.5 * scale}px solid rgba(232,89,60,0.35)`,
              borderRadius: 18 * scale,
              padding: 16 * scale,
              marginBottom: 18 * scale,
              display: 'flex',
              alignItems: 'center',
              gap: 12 * scale,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 원형 데코 */}
            <div
              style={{
                position: 'absolute',
                top: -20 * scale,
                right: -20 * scale,
                width: 100 * scale,
                height: 100 * scale,
                borderRadius: '50%',
                background: 'rgba(232,89,60,0.08)',
                pointerEvents: 'none',
              }}
            />
            {/* 아이콘 */}
            <div
              style={{
                width: 52 * scale,
                height: 52 * scale,
                borderRadius: 13 * scale,
                background: 'rgba(232,89,60,0.18)',
                border: `1px solid rgba(232,89,60,0.3)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'relative',
                zIndex: 2,
              }}
            >
              <svg width={26 * scale} height={26 * scale} viewBox="0 0 24 24" fill="none" stroke="#e8593c" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M4.93 4.93l14.14 14.14" />
              </svg>
            </div>
            {/* 텍스트 */}
            <div style={{ flex: 1, position: 'relative', zIndex: 2, textAlign: 'left' }}>
              <div
                style={{
                  display: 'inline-block',
                  background: '#e8593c',
                  color: '#fff',
                  fontSize: 9 * scale,
                  fontWeight: 700,
                  padding: `${2 * scale}px ${7 * scale}px`,
                  borderRadius: 10 * scale,
                  letterSpacing: 0.5,
                  marginBottom: 3 * scale,
                  fontFamily: 'GMarketSans, sans-serif',
                }}
              >
                BEST
              </div>
              <div
                style={{
                  fontFamily: 'GMarketSans, sans-serif',
                  fontSize: 17 * scale,
                  fontWeight: 900,
                  color: '#fff',
                  marginBottom: 2 * scale,
                }}
              >
                부활 광고 제거
              </div>
              <div
                style={{
                  fontFamily: 'GMarketSans, sans-serif',
                  fontSize: 11 * scale,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                부활할 때 광고 없이 바로 이어가기
              </div>
            </div>
            {/* 가격 — 토스 동적 가격 우선, 없으면 fallback */}
            <div
              style={{
                fontFamily: 'GMarketSans, sans-serif',
                fontSize: 17 * scale,
                fontWeight: 900,
                color: '#e8593c',
                flexShrink: 0,
                position: 'relative',
                zIndex: 2,
              }}
            >
              {tossPrices.adRemove ?? '₩1,980'}
            </div>
          </TapButton>
        )}

        {/* 무료 보상 섹션 */}
        <Section title="무료 보상" hint="광고 시청 후 지급" scale={scale} icon={<GiftIcon size={20 * scale} />}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10 * scale,
            }}
          >
            {FREE_REWARDS.map((r) => {
              const count = freeRewardCounts[r.id] || 0;
              const exhausted = count >= r.limit;
              return (
                <FreeRewardCard
                  key={r.id}
                  reward={r}
                  scale={scale}
                  count={count}
                  exhausted={exhausted}
                  onReward={() => handleFreeReward(r)}
                />
              );
            })}
          </div>
        </Section>

        {/* 보석 충전 섹션 */}
        <Section title="보석 충전" scale={scale} icon={<GemIcon size={20 * scale} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 * scale }}>
            {GEM_PACKAGES.map((p) => (
              <PackageCard
                key={p.id}
                item={p}
                kind="gem"
                scale={scale}
                priceOverride={p.skuKey ? tossPrices[p.skuKey] : undefined}
                onClick={() => handlePackage(p, 'gem')}
              />
            ))}
          </div>
        </Section>

        {/* 코인 충전 섹션 */}
        <Section title="코인 충전" scale={scale} icon={<CoinIcon size={18 * scale} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 * scale }}>
            {COIN_PACKAGES.map((p) => (
              <PackageCard key={p.id} item={p} kind="coin" scale={scale} onClick={() => handlePackage(p, 'coin')} />
            ))}
          </div>
        </Section>
      </div>

      {/* 코인 충전 확인 모달 */}
      {pendingCoinPurchase && (
        <CoinPurchaseConfirmModal
          pkg={pendingCoinPurchase.pkg}
          gemCost={pendingCoinPurchase.gemCost}
          currentGems={gems}
          currentCoins={coins}
          onConfirm={confirmCoinPurchase}
          onCancel={cancelCoinPurchase}
        />
      )}
    </div>
  );
}

/* ── 코인 충전 확인 모달 ── */

function CoinPurchaseConfirmModal({
  pkg,
  gemCost,
  currentGems,
  currentCoins,
  onConfirm,
  onCancel,
}: {
  pkg: PkgItem;
  gemCost: number;
  currentGems: number;
  currentCoins: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const scale = useResponsiveScale();
  const insufficient = currentGems < gemCost;
  const coinsAfter = currentCoins + pkg.amount;

  return (
    <ModalShell onClose={onCancel} maxWidth={320} zIndex={400}>
      {/* 타이틀 */}
      <Text size={20 * scale} weight={900} align="center" style={{ marginBottom: 4 * scale }}>
        코인 충전
      </Text>
      <Text
        size={12 * scale}
        color="rgba(255,255,255,0.5)"
        align="center"
        style={{ marginBottom: 18 * scale }}
      >
        이 상품을 구매하시겠어요?
      </Text>

      {/* 상품 카드 */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `${1 * scale}px solid rgba(255,255,255,0.08)`,
          borderRadius: 14 * scale,
          padding: `${16 * scale}px`,
          marginBottom: 16 * scale,
          display: 'flex',
          alignItems: 'center',
          gap: 12 * scale,
        }}
      >
        {/* 코인 아이콘 */}
        <div
          style={{
            width: 52 * scale,
            height: 52 * scale,
            borderRadius: 12 * scale,
            background: 'rgba(255,210,74,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CoinIcon size={38 * scale} />
        </div>
        {/* 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size={17 * scale} weight={900} style={{ marginBottom: 2 * scale }}>
            코인 {pkg.amount.toLocaleString()}개
          </Text>
          {pkg.bonusPct !== undefined && (
            <Text size={11 * scale} weight={700} color="#e8593c">
              +{pkg.bonusPct}% 보너스 포함
            </Text>
          )}
        </div>
      </div>

      {/* 결제 정보 — 3단: 보유 보석 → 결제 보석 → 결제 후 코인 */}
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
        {/* 1. 보유 보석 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text size={13 * scale} color="rgba(255,255,255,0.6)" as="span">
            보유 보석
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale }}>
            <GemIcon size={18 * scale} />
            <Text
              size={15 * scale}
              weight={900}
              color={insufficient ? '#e8593c' : undefined}
              as="span"
            >
              {currentGems.toLocaleString()}개
            </Text>
          </div>
        </div>

        {/* 2. 결제 보석 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text size={13 * scale} color="rgba(255,255,255,0.6)" as="span">
            결제 보석
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale }}>
            <GemIcon size={18 * scale} />
            <Text size={15 * scale} weight={900} color="#e8593c" as="span">
              − {gemCost.toLocaleString()}개
            </Text>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: 1 * scale, background: 'rgba(255,255,255,0.08)' }} />

        {/* 3. 결제 후 코인 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text size={13 * scale} color="rgba(255,255,255,0.7)" as="span">
            결제 후 코인
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale }}>
            <CoinIcon size={18 * scale} />
            <Text size={16 * scale} weight={900} color="#ffd24a" as="span">
              {coinsAfter.toLocaleString()}개
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
            {insufficient ? '보석 부족' : '구매하기'}
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

/* ── Free reward card ── */

function FreeRewardCard({
  reward,
  scale,
  count,
  exhausted,
  onReward,
}: {
  reward: FreeReward;
  scale: number;
  count: number;
  exhausted: boolean;
  onReward: () => void;
}) {
  const remaining = Math.max(0, reward.limit - count);
  const badgeText = `${remaining}/${reward.limit}회`;
  const badgeColor = exhausted ? '#666' : '#3fdcb0';
  const ctaBg = exhausted ? 'rgba(255,255,255,0.08)' : '#1d9e75';
  const ctaColor = exhausted ? 'rgba(255,255,255,0.4)' : '#fff';

  // 일 제한 소진 시 탭해도 toast만 (onReward 호출하면 방어 로직이 차단)
  const handleTapBlocked = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('toast', '오늘 수령 가능한 횟수를 모두 사용했어요');
  };

  const renderCardContent = (adState?: { loading: boolean; ready: boolean }) => (
    <>
      {/* 잔여 횟수 뱃지 */}
      <span
        style={{
          position: 'absolute',
          top: 6 * scale,
          right: 6 * scale,
          background: exhausted ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.55)',
          color: badgeColor,
          fontSize: 10 * scale,
          fontWeight: 900,
          padding: `${3 * scale}px ${7 * scale}px`,
          borderRadius: 6 * scale,
          letterSpacing: 0.3,
          fontFamily: 'GMarketSans, sans-serif',
          border: `${1 * scale}px solid ${exhausted ? 'rgba(255,255,255,0.08)' : 'rgba(63,220,176,0.35)'}`,
        }}
      >
        {badgeText}
      </span>

      <div
        style={{
          width: 48 * scale,
          height: 48 * scale,
          margin: `${4 * scale}px auto ${8 * scale}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: exhausted ? 'grayscale(70%)' : 'none',
          opacity: exhausted ? 0.5 : 1,
        }}
      >
        {reward.kind === 'coin' ? <CoinIcon size={44 * scale} /> : <GemIcon size={44 * scale} />}
      </div>

      <div
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 18 * scale,
          color: exhausted ? 'rgba(255,255,255,0.35)' : '#fff',
          marginBottom: 8 * scale,
        }}
      >
        +{reward.amount}
      </div>

      <div
        style={{
          width: '100%',
          padding: 8 * scale,
          background: ctaBg,
          borderRadius: 10 * scale,
          fontSize: 12 * scale,
          fontWeight: 700,
          color: ctaColor,
          boxShadow: exhausted ? 'none' : `0 ${2 * scale}px ${8 * scale}px rgba(29,158,117,0.3)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4 * scale,
          fontFamily: 'GMarketSans, sans-serif',
        }}
        >
        {exhausted ? (
          '완료'
        ) : adState?.loading ? (
          '광고 불러오는 중...'
        ) : adState && !adState.ready ? (
          '광고 준비 중...'
        ) : (
          <>
            <svg width={11 * scale} height={11 * scale} viewBox="0 0 24 24" fill="#fff">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            광고 보기
          </>
        )}
      </div>
    </>
  );

  const cardStyle = {
    background: exhausted
      ? 'rgba(255,255,255,0.03)'
      : 'linear-gradient(145deg, rgba(63,220,176,0.14), rgba(63,220,176,0.04))',
    border: `1px solid ${exhausted ? 'rgba(255,255,255,0.06)' : 'rgba(63,220,176,0.28)'}`,
    borderRadius: 14 * scale,
    padding: `${14 * scale}px ${10 * scale}px`,
    textAlign: 'center' as const,
    position: 'relative' as const,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    opacity: exhausted ? 0.7 : 1,
  };

  // 소진 시엔 AdRewardButton 대신 그냥 TapButton (광고 표시 X)
  if (exhausted) {
    return (
      <TapButton onTap={handleTapBlocked} pressScale={0.97} scrollSafe style={cardStyle}>
        {renderCardContent()}
      </TapButton>
    );
  }

  return (
    <AdRewardButton
      onReward={onReward}
      rewardType={reward.kind}
      pressScale={0.95}
      scrollSafe
      style={cardStyle}
    >
      {(adState) => renderCardContent(adState)}
    </AdRewardButton>
  );
}

/* ── Package card (vertical list item) ── */

function PackageCard({
  item,
  kind,
  scale,
  priceOverride,
  onClick,
}: {
  item: PkgItem;
  kind: 'gem' | 'coin';
  scale: number;
  /** 동적 가격 (토스 등). 없으면 item.price fallback */
  priceOverride?: string;
  onClick: () => void;
}) {
  const isBest = item.highlight === 'best';
  const isHot = item.highlight === 'hot';

  let bg = 'rgba(255,255,255,0.03)';
  let border = `1px solid rgba(255,255,255,0.06)`;
  if (isBest) {
    bg = 'linear-gradient(135deg, rgba(232,89,60,0.10), rgba(232,89,60,0.02))';
    border = `${1.5 * scale}px solid rgba(232,89,60,0.4)`;
  } else if (isHot) {
    bg = 'linear-gradient(135deg, rgba(250,199,117,0.08), rgba(250,199,117,0.02))';
    border = `${1.5 * scale}px solid rgba(250,199,117,0.32)`;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* BEST/HOT 라벨 */}
      {(isBest || isHot) && (
        <div
          style={{
            position: 'absolute',
            top: -8 * scale,
            right: 16 * scale,
            background: isBest ? '#e8593c' : '#BA7517',
            color: '#fff',
            fontSize: 9 * scale,
            fontWeight: 700,
            padding: `${3 * scale}px ${8 * scale}px`,
            borderRadius: 10 * scale,
            letterSpacing: 0.5,
            zIndex: 2,
            fontFamily: 'GMarketSans, sans-serif',
          }}
        >
          {isBest ? 'BEST' : 'HOT'}
        </div>
      )}

      <TapButton
        onTap={onClick}
        pressScale={0.97}
        scrollSafe
        style={{
          background: bg,
          border,
          borderRadius: 14 * scale,
          padding: `${13 * scale}px ${15 * scale}px`,
          display: 'flex',
          alignItems: 'center',
          gap: 12 * scale,
        }}
      >
        {/* 아이콘 */}
        <div
          style={{
            width: 54 * scale,
            height: 54 * scale,
            borderRadius: 12 * scale,
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {kind === 'gem' ? <GemIcon size={36 * scale} /> : <CoinIcon size={40 * scale} />}
          {item.bonusPct !== undefined && (
            <div
              style={{
                position: 'absolute',
                top: -6 * scale,
                right: -6 * scale,
                background: '#e8593c',
                color: '#fff',
                fontSize: 9 * scale,
                fontWeight: 700,
                padding: `${2 * scale}px ${6 * scale}px`,
                borderRadius: 8 * scale,
                whiteSpace: 'nowrap',
                fontFamily: 'GMarketSans, sans-serif',
              }}
            >
              +{item.bonusPct}%
            </div>
          )}
        </div>
        {/* 텍스트 */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div
            style={{
              fontFamily: 'GMarketSans, sans-serif',
              fontWeight: 900,
              fontSize: 17 * scale,
              color: '#fff',
              marginBottom: 2 * scale,
            }}
          >
            {item.amountLabel}
          </div>
          <div
            style={{
              fontFamily: 'GMarketSans, sans-serif',
              fontSize: 11 * scale,
              fontWeight: item.extraNeutral ? 500 : 700,
              color: item.extraNeutral ? 'rgba(255,255,255,0.4)' : '#e8593c',
            }}
          >
            {item.extra}
          </div>
        </div>
        {/* 가격 버튼 */}
        <div
          style={{
            padding: `${10 * scale}px ${13 * scale}px`,
            borderRadius: 10 * scale,
            background: kind === 'gem' ? '#e8593c' : 'rgba(255,255,255,0.08)',
            color: kind === 'gem' ? '#fff' : 'rgba(255,255,255,0.78)',
            fontFamily: 'GMarketSans, sans-serif',
            fontSize: 12 * scale,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: kind === 'gem' ? `0 ${2 * scale}px ${8 * scale}px rgba(232,89,60,0.25)` : 'none',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4 * scale,
          }}
        >
          {kind === 'coin' && item.gemPrice !== undefined && priceOverride === undefined ? (
            <>
              <GemIcon size={16 * scale} />
              <span>{item.gemPrice}</span>
            </>
          ) : (
            priceOverride ?? item.price
          )}
        </div>
      </TapButton>
    </div>
  );
}

/* ── Icons ── */

function CurrencyPill({ kind, amount, scale }: { kind: 'coin' | 'gem'; amount: number; scale: number }) {
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

function GiftIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3fdcb0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 010-5c2.5 0 4.5 5 4.5 5S9.5 8 7.5 8zM16.5 8a2.5 2.5 0 000-5c-2.5 0-4.5 5-4.5 5s2.5 0 4.5 0z" />
    </svg>
  );
}
