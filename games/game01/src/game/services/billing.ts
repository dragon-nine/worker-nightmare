/** Google Play 인앱 결제 서비스 */

import { registerPlugin } from '@capacitor/core';
import { isGoogle } from '../platform';

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

/** 광고 제거 구매 */
export async function purchaseAdRemove(): Promise<boolean> {
  if (!isGoogle()) {
    console.warn('Billing is only available on Google platform');
    return false;
  }

  try {
    const result = await Billing.purchase({ productId: 'ad_remove' });
    if (result.purchased) {
      localStorage.setItem(AD_REMOVE_KEY, 'true');
      return true;
    }
    return false;
  } catch (e) {
    console.error('Purchase failed:', e);
    return false;
  }
}

/** 구매 복원 (앱 재설치 시) */
export async function restoreAdRemove(): Promise<boolean> {
  if (!isGoogle()) return false;

  try {
    const result = await Billing.restorePurchases();
    if (result.adRemoved) {
      localStorage.setItem(AD_REMOVE_KEY, 'true');
    }
    return result.adRemoved;
  } catch (e) {
    console.error('Restore failed:', e);
    return false;
  }
}
