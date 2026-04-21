import { useEffect, useState } from 'react';
import {
  fetchTossProductPrices,
  type TossProductPrices,
} from '../../game/services/billing';

/**
 * 토스에 등록된 상품의 현지화된 가격을 React에서 사용.
 * - 마운트 시 한 번 fetch (billing.ts 내부 캐시 사용)
 * - 토스 네이티브 환경이 아니면 빈 객체 → UI는 하드코딩 fallback 사용
 * - 네트워크 실패 시에도 빈 객체 반환
 */
export function useTossProductPrices(): TossProductPrices {
  const [prices, setPrices] = useState<TossProductPrices>({});
  useEffect(() => {
    let cancelled = false;
    fetchTossProductPrices().then((p) => {
      if (!cancelled) setPrices(p);
    });
    return () => { cancelled = true; };
  }, []);
  return prices;
}
