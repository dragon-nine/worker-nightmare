/**
 * 광고 서비스 — 보상형 광고 통합 인터페이스
 *
 * 리워드 타입별 독립 광고 그룹 지원:
 *   - 'revive' : 부활 광고
 *   - 'gem'    : 보석 보상 광고 (상점 무료 보상)
 *   - 'coin'   : 코인 보상 광고 (상점 무료 보상)
 *   - 'coin2x' : 게임오버 코인 2배 보너스
 *
 * 사용 패턴:
 *   1. 게임 시작 시 adService.preload('revive')
 *   2. 부활 버튼 클릭 시 adService.showRewarded('revive', (result) => { ... })
 *   3. 결과는 discriminated union으로 전달:
 *      - kind === 'rewarded' → 보상 지급 (userEarnedReward 이벤트 기반)
 *      - kind === 'skipped'  → 사용자가 광고 스킵 (보상 안 함)
 *      - kind === 'failed'   → 기술적 실패 (보상 안 함)
 */

import { logEvent } from './analytics';
import { gameBus } from '../event-bus';

/** 리워드 타입 — 각 타입별로 별도 adGroupId/adUnitId 사용 */
export type AdRewardType = 'revive' | 'gem' | 'coin' | 'coin2x';
const ALL_AD_REWARD_TYPES: AdRewardType[] = ['revive', 'gem', 'coin', 'coin2x'];

/** 광고 표시 결과 */
export type AdResult =
  | { kind: 'rewarded' }
  | { kind: 'skipped' }
  | { kind: 'failed'; error: Error };

export interface AdProvider {
  preload(type: AdRewardType): Promise<void>;
  showRewarded(type: AdRewardType): Promise<AdResult>;
  isReady(type: AdRewardType): boolean;
}

class AdService {
  private provider: AdProvider | null = null;
  private preloadPromises = new Map<AdRewardType, Promise<void>>();
  private currentShows = new Map<AdRewardType, Promise<AdResult>>();
  private cancelledTypes = new Set<AdRewardType>();

  setProvider(provider: AdProvider) {
    this.provider = provider;
    for (const type of ALL_AD_REWARD_TYPES) {
      this.preload(type);
    }
  }

  isReady(type: AdRewardType): boolean {
    return this.provider?.isReady(type) === true;
  }

  /** 광고 미리 로드 */
  preload(type: AdRewardType) {
    if (!this.provider) return;
    if (this.provider.isReady(type)) return;
    const promise = this.provider.preload(type).catch(() => {
      // 로드 실패 — showRewarded에서 처리
    });
    this.preloadPromises.set(type, promise);
  }

  /**
   * 보상형 광고 표시.
   * - 광고 미로드 시 최대 5초까지 로드 대기
   * - 진행 중인 광고가 있으면 두 번째 호출은 무시 (연타 방지)
   * - 결과는 onResult 콜백으로 전달
   *
   * NOTE: 광고 제거(부활 전용) 구매 여부는 여기서 체크하지 않음.
   * 부활 흐름에서만 별도로 isAdRemoved() 체크 후 바이패스. (상점 무료 보상 광고는 그대로)
   */
  showRewarded(type: AdRewardType, onResult: (result: AdResult) => void): void {
    // 이미 진행 중 — 무시 (연타 방지)
    if (this.currentShows.has(type)) {
      logEvent('ad_rewarded_dedup', { type });
      return;
    }

    this.cancelledTypes.delete(type);
    const show = this._doShow(type);
    this.currentShows.set(type, show);
    show
      .then((result) => {
        if (this.cancelledTypes.has(type)) return; // 취소된 경우 무시
        onResult(result);
      })
      .finally(() => {
        this.currentShows.delete(type);
        this.cancelledTypes.delete(type);
      });
  }

  /**
   * 진행 중인 광고 흐름 취소 (예: 사용자가 홈으로 나갈 때).
   * type을 지정하면 해당 타입만, 생략하면 전체 취소.
   */
  cancel(type?: AdRewardType): void {
    if (type) {
      if (this.currentShows.has(type)) {
        this.cancelledTypes.add(type);
      }
    } else {
      for (const t of this.currentShows.keys()) {
        this.cancelledTypes.add(t);
      }
    }
  }

  private async _doShow(type: AdRewardType): Promise<AdResult> {
    if (!this.provider) {
      logEvent('ad_rewarded_no_provider', { type });
      return { kind: 'failed', error: new Error('no_provider') };
    }

    // 광고 미로드 → 짧게 로드 대기.
    // UX상 탭 후 오래 붙잡는 것보다, 선로드를 공격적으로 하고 여기선 짧게만 기다린다.
    if (!this.provider.isReady(type)) {
      this.preload(type);
      const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('load_timeout')), 2000)
      );
      try {
        await Promise.race([this.preloadPromises.get(type) ?? Promise.reject(new Error('no_preload')), timeout]);
      } catch (e) {
        logEvent('ad_rewarded_load_failed', { type, reason: (e as Error).message });
        return { kind: 'failed', error: e as Error };
      }
      if (!this.provider.isReady(type)) {
        logEvent('ad_rewarded_not_ready', { type });
        return { kind: 'failed', error: new Error('not_ready') };
      }
    }

    logEvent('ad_rewarded_show', { type });
    // 광고 표시 중에는 BGM 등 게임 사운드가 깔리지 않도록 이벤트 브로드캐스트.
    // 리스너(BootScene)가 BGM을 pause/resume 처리.
    gameBus.emit('ad-show-start', undefined);
    let result: AdResult;
    try {
      result = await this.provider.showRewarded(type);
    } finally {
      gameBus.emit('ad-show-end', undefined);
    }

    // 결과별 분석 이벤트
    if (result.kind === 'rewarded') {
      logEvent('ad_rewarded_complete', { type });
    } else if (result.kind === 'skipped') {
      logEvent('ad_rewarded_skipped', { type });
    } else {
      logEvent('ad_rewarded_failed', { type, error: result.error.message });
    }

    // 다음 광고 미리 로드
    this.preload(type);

    return result;
  }
}

export const adService = new AdService();
