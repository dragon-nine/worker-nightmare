/**
 * 인앱 결제 서비스 — Google Play Billing + 토스 IAP 분기
 *
 * 토스 IAP (consumable/non-consumable 공용 API):
 *   - createOneTimePurchaseOrder + processProductGrant 패턴 사용
 *   - 각 SKU별 "지급 함수"를 TOSS_SKU_GRANTS에 매핑
 *   - 결제 성공 시 processProductGrant에서 해당 SKU의 지급 함수 실행
 *   - 미완료 주문(processPendingToss)도 동일한 SKU 매핑으로 일괄 처리
 */

import { registerPlugin } from '@capacitor/core';
import { isGoogle, isToss, isTossNative } from '../platform';
import { gameConfig } from '../game.config';
import { storage } from './storage';
import { syncAdRemoveFromStorage, syncCurrenciesFromStorage } from './assets';

// ── Google Play Billing ──

interface BillingPlugin {
  purchase(options: { productId: string }): Promise<{ purchased: boolean }>;
  restorePurchases(): Promise<{ adRemoved: boolean }>;
}

const Billing = registerPlugin<BillingPlugin>('Billing');

const AD_REMOVE_KEY = 'ad_removed';

/** 광고 제거 구매 여부 (로컬 캐시) */
export function isAdRemoved(): boolean {
  return localStorage.getItem(AD_REMOVE_KEY) === 'true';
}

/** 토스에서 구매 가능한 보석 패키지 키 */
export type GemPackageKey = 'gem30' | 'gem165' | 'gem500';

const GEM_AMOUNTS: Record<GemPackageKey, number> = {
  gem30: 30,
  gem165: 165,
  gem500: 500,
};

/* ──────────────  토스 SKU → 지급 함수 매핑  ────────────── */
/**
 * 각 토스 SKU별로 "구매가 성사되었을 때 실행할 지급 로직".
 * purchaseToss(processProductGrant)와 processPendingToss 양쪽에서 동일하게 사용됨.
 * — 지급 로직의 단일 진실 원천.
 */
function buildTossSkuGrants(): Record<string, () => void> {
  const grants: Record<string, () => void> = {};
  const ids = gameConfig.tossIap;
  if (ids.adRemove) grants[ids.adRemove] = () => {
    localStorage.setItem(AD_REMOVE_KEY, 'true');
    void syncAdRemoveFromStorage();
  };
  if (ids.gem30)    grants[ids.gem30]    = () => { storage.addNum('gems', GEM_AMOUNTS.gem30); void syncCurrenciesFromStorage(); };
  if (ids.gem165)   grants[ids.gem165]   = () => { storage.addNum('gems', GEM_AMOUNTS.gem165); void syncCurrenciesFromStorage(); };
  if (ids.gem500)   grants[ids.gem500]   = () => { storage.addNum('gems', GEM_AMOUNTS.gem500); void syncCurrenciesFromStorage(); };
  return grants;
}

function applyTossGrant(sku: string): boolean {
  const grants = buildTossSkuGrants();
  const fn = grants[sku];
  if (!fn) {
    console.warn('[Billing] 알 수 없는 SKU:', sku);
    return false;
  }
  fn();
  return true;
}

// ── Google Play 결제 ──

async function purchaseGoogle(): Promise<boolean> {
  try {
    const result = await Billing.purchase({ productId: 'ad_remove' });
    if (result.purchased) {
      localStorage.setItem(AD_REMOVE_KEY, 'true');
      void syncAdRemoveFromStorage();
      return true;
    }
    return false;
  } catch (e) {
    console.error('[Billing] Google 구매 실패:', e);
    return false;
  }
}

async function restoreGoogle(): Promise<boolean> {
  try {
    const result = await Billing.restorePurchases();
    if (result.adRemoved) {
      localStorage.setItem(AD_REMOVE_KEY, 'true');
      void syncAdRemoveFromStorage();
    }
    return result.adRemoved;
  } catch (e) {
    console.error('[Billing] Google 복원 실패:', e);
    return false;
  }
}

// ── 토스 IAP ──

function validateTossSku(sku: string | undefined, label: string): string {
  if (!sku || sku.startsWith('TODO')) {
    console.warn(`[Billing] 토스 ${label} SKU가 설정되지 않았습니다`);
    return '';
  }
  return sku;
}

/** 토스에서 sku로 createOneTimePurchaseOrder 호출. 성공 시 지급 적용 후 true 반환 */
async function purchaseTossSku(sku: string, label: string): Promise<boolean> {
  if (!sku) return false;

  try {
    const { IAP } = await import('@apps-in-toss/web-framework');

    return new Promise<boolean>((resolve) => {
      const cleanup = IAP.createOneTimePurchaseOrder({
        options: {
          sku,
          processProductGrant: () => {
            // SKU별 지급 로직 실행 (TOSS_SKU_GRANTS)
            return applyTossGrant(sku);
          },
        },
        onEvent: () => {
          cleanup();
          resolve(true);
        },
        onError: (error) => {
          console.error(`[Billing] 토스 ${label} 구매 실패:`, error);
          cleanup();
          resolve(false);
        },
      });
    });
  } catch (e) {
    console.error(`[Billing] 토스 IAP 호출 실패 (${label}):`, e);
    return false;
  }
}

/** 부활 광고 제거 — 토스 */
async function purchaseTossAdRemove(): Promise<boolean> {
  const sku = validateTossSku(gameConfig.tossIap.adRemove, '부활 광고 제거');
  return purchaseTossSku(sku, '부활 광고 제거');
}

/** 보석 충전 — 토스 */
async function purchaseTossGems(key: GemPackageKey): Promise<boolean> {
  const sku = validateTossSku(gameConfig.tossIap[key], `보석 ${GEM_AMOUNTS[key]}개`);
  return purchaseTossSku(sku, `보석 ${GEM_AMOUNTS[key]}개`);
}

async function restoreToss(): Promise<boolean> {
  try {
    const { IAP } = await import('@apps-in-toss/web-framework');
    const result = await IAP.getCompletedOrRefundedOrders();
    if (!result?.orders) return false;

    const adRemoveSku = gameConfig.tossIap.adRemove;
    // 비소모성인 부활 광고 제거만 COMPLETED 상태로 복원 판단.
    // 보석(소모성)은 이미 지급되어 completeProductGrant로 소비된 상태.
    const purchased = result.orders.some(
      (o) => o.sku === adRemoveSku && o.status === 'COMPLETED'
    );

    if (purchased) {
      localStorage.setItem(AD_REMOVE_KEY, 'true');
      void syncAdRemoveFromStorage();
    } else {
      // 환불된 경우 제거
      localStorage.removeItem(AD_REMOVE_KEY);
      void syncAdRemoveFromStorage();
    }
    return purchased;
  } catch (e) {
    console.error('[Billing] 토스 복원 실패:', e);
    return false;
  }
}

/**
 * 미완료 주문 처리 — 결제는 완료됐으나 지급이 안 된 경우 (앱 크래시 등).
 * 앱 시작 시 호출하여 모든 pending 주문을 SKU 매핑으로 일괄 지급.
 */
async function processPendingToss(): Promise<void> {
  try {
    const { IAP } = await import('@apps-in-toss/web-framework');
    const pending = await IAP.getPendingOrders();
    if (!pending?.orders?.length) return;

    for (const order of pending.orders) {
      try {
        await IAP.completeProductGrant({ params: { orderId: order.orderId } });
        applyTossGrant(order.sku);
      } catch (e) {
        console.warn('[Billing] 개별 주문 처리 실패:', order.orderId, e);
      }
    }
  } catch (e) {
    console.warn('[Billing] 미완료 주문 처리 실패:', e);
  }
}

// ── 공개 API ──

/** 부활 광고 제거 구매 */
export async function purchaseAdRemove(): Promise<boolean> {
  if (isGoogle()) return purchaseGoogle();
  if (isToss() && isTossNative()) return purchaseTossAdRemove();

  // DEV 빌드(브라우저) — mock 구매 흐름
  if (import.meta.env.DEV) {
    return mockPurchaseAdRemove();
  }

  console.warn('[Billing] 지원하지 않는 플랫폼');
  return false;
}

/** 보석 패키지 구매 */
export async function purchaseGemPackage(key: GemPackageKey): Promise<boolean> {
  if (isToss() && isTossNative()) return purchaseTossGems(key);

  // DEV 빌드(브라우저) — mock 구매 흐름
  if (import.meta.env.DEV) {
    return mockPurchaseGems(key);
  }

  // Google Play는 현재 ad_remove만 지원 (추후 보석 상품 연동 필요)
  console.warn('[Billing] 이 플랫폼에서는 보석 충전을 지원하지 않아요');
  return false;
}

/* ──────────────  DEV mock 구매  ────────────── */

async function mockPurchaseAdRemove(): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 300));
  const confirmed = window.confirm(
    '[DEV] 부활 광고 제거 결제 시뮬레이션\n\n₩1,980 결제를 완료할까요?\n(실제 결제 없음)',
  );
  if (!confirmed) return false;
  localStorage.setItem(AD_REMOVE_KEY, 'true');
  return true;
}

async function mockPurchaseGems(key: GemPackageKey): Promise<boolean> {
  const labels: Record<GemPackageKey, string> = {
    gem30:  '보석 30개 — ₩1,100',
    gem165: '보석 165개 (보너스 +15) — ₩5,500',
    gem500: '보석 500개 (보너스 +100) — ₩11,000',
  };
  await new Promise((r) => setTimeout(r, 300));
  const confirmed = window.confirm(
    `[DEV] 보석 충전 결제 시뮬레이션\n\n${labels[key]}\n결제를 완료할까요?\n(실제 결제 없음)`,
  );
  if (!confirmed) return false;
  storage.addNum('gems', GEM_AMOUNTS[key]);
  void syncCurrenciesFromStorage();
  return true;
}

/** 구매 복원 (앱 시작 시) */
export async function restoreAdRemove(): Promise<boolean> {
  if (isGoogle()) return restoreGoogle();
  if (isToss() && isTossNative()) {
    await processPendingToss();
    return restoreToss();
  }
  return false;
}

/** 토스 상품 가격 조회 (부활 광고 제거) */
export async function getTossProductPrice(): Promise<string | null> {
  if (!isToss()) return null;
  try {
    const { IAP } = await import('@apps-in-toss/web-framework');
    const result = await IAP.getProductItemList();
    const sku = gameConfig.tossIap.adRemove;
    const product = result?.products?.find((p) => p.sku === sku);
    return product?.displayAmount ?? null;
  } catch {
    return null;
  }
}

/* ──────────────  전체 상품 가격 조회 (캐시)  ────────────── */

/** 각 토스 SKU의 현지화된 가격 문자열 */
export interface TossProductPrices {
  adRemove?: string;
  gem30?: string;
  gem165?: string;
  gem500?: string;
}

let pricesCache: TossProductPrices | null = null;
let pricesFetchPromise: Promise<TossProductPrices> | null = null;

/**
 * 토스에 등록된 모든 상품의 가격을 한 번에 조회.
 * - 캐시: 메모리에 보관, 같은 세션 내에선 1회만 fetch
 * - 진행 중 중복 호출: 동일 Promise 재사용
 * - 토스 네이티브 환경이 아니면 빈 객체 반환 → UI는 하드코딩 fallback 사용
 */
export async function fetchTossProductPrices(): Promise<TossProductPrices> {
  if (pricesCache) return pricesCache;
  if (pricesFetchPromise) return pricesFetchPromise;
  if (!isTossNative()) return {};

  pricesFetchPromise = (async (): Promise<TossProductPrices> => {
    try {
      const { IAP } = await import('@apps-in-toss/web-framework');
      const result = await IAP.getProductItemList();
      if (!result?.products) return {};

      const ids = gameConfig.tossIap;
      const byId = (id: string) =>
        result.products?.find((p) => p.sku === id)?.displayAmount;

      const prices: TossProductPrices = {
        adRemove: byId(ids.adRemove),
        gem30: byId(ids.gem30),
        gem165: byId(ids.gem165),
        gem500: byId(ids.gem500),
      };
      pricesCache = prices;
      return prices;
    } catch (e) {
      console.warn('[Billing] 토스 가격 조회 실패:', e);
      return {};
    } finally {
      pricesFetchPromise = null;
    }
  })();

  return pricesFetchPromise;
}
