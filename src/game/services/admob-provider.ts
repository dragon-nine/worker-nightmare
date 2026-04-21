/**
 * AdMob 보상형 광고 프로바이더 (Capacitor)
 *
 * 리워드 타입별 독립 adUnitId 지원 (revive / gem / coin)
 *
 * 네이티브 컨트랙트:
 *   - showRewardVideoAd()의 Promise는 OnUserEarnedReward 발생 시에만 resolve.
 *     사용자가 리워드 없이 닫으면 hang됨 → 직접 resolve/reject 하지 않고
 *     이벤트 리스너 기반 state machine으로 처리.
 *
 *   - 이벤트 흐름:
 *     1. preload → Loaded 이벤트 → ready=true
 *     2. showRewarded 호출 → 네이티브 광고 표시
 *     3. (옵션) Rewarded 이벤트 → currentEarned=true
 *     4. Dismissed 이벤트 → 결과 settle (rewarded 또는 skipped)
 *     5. 또는 FailedToShow → failed
 */

import {
  AdMob,
  RewardAdPluginEvents,
  type AdLoadInfo,
  type AdMobError,
  type RewardAdOptions,
} from '@capacitor-community/admob';
import type { AdProvider, AdResult, AdRewardType } from './ad-service';
import { gameConfig } from '../game.config';

// 테스트용 광고 단위 ID (개발 중 사용)
const TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

const isDev = import.meta.env.DEV;

export class AdMobProvider implements AdProvider {
  private readyMap = new Map<AdRewardType, boolean>();
  private initialized = false;

  /** 현재 표시 중인 광고의 reward 수신 여부 */
  private currentEarned = false;

  /** 현재 표시 중인 광고의 settle 콜백 (Dismissed/FailedToShow 시 호출) */
  private pendingResolve: ((result: AdResult) => void) | null = null;

  /** 현재 표시 중인 광고의 타입 */
  private currentType: AdRewardType | null = null;

  private getAdUnitId(type: AdRewardType): string {
    const id = gameConfig.admobAdUnitIds[type];
    if (isDev || !id) {
      return TEST_REWARDED_AD_UNIT_ID;
    }
    return id;
  }

  private settle(result: AdResult): void {
    const cb = this.pendingResolve;
    const type = this.currentType;
    this.pendingResolve = null;
    this.currentEarned = false;
    this.currentType = null;
    if (type) this.readyMap.set(type, false);
    cb?.(result);
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    await AdMob.initialize({
      initializeForTesting: isDev,
    });

    // ── 로드 라이프사이클 ──
    AdMob.addListener(RewardAdPluginEvents.Loaded, (_info: AdLoadInfo) => {
      // AdMob은 한 번에 하나만 로드하므로 currentType이 없으면 무시
      // preload 시 currentType을 일시적으로 설정하는 방식 대신,
      // ready 상태는 preload() 내부에서 직접 관리
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
      // preload() 내부 catch에서 처리
    });

    // ── 표시 라이프사이클 ──
    AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      this.currentEarned = true;
    });

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      if (this.pendingResolve) {
        this.settle(
          this.currentEarned ? { kind: 'rewarded' } : { kind: 'skipped' }
        );
      }
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToShow, (error: AdMobError) => {
      this.settle({
        kind: 'failed',
        error: new Error(error?.message || 'failed_to_show'),
      });
    });
  }

  async preload(type: AdRewardType): Promise<void> {
    await this.init();

    const options: RewardAdOptions = {
      adId: this.getAdUnitId(type),
      isTesting: isDev,
    };

    try {
      await AdMob.prepareRewardVideoAd(options);
      this.readyMap.set(type, true);
    } catch {
      this.readyMap.set(type, false);
    }
  }

  showRewarded(type: AdRewardType): Promise<AdResult> {
    return new Promise<AdResult>((resolve) => {
      // 이전 호출이 어떤 이유로 settle 안 됐다면 정리
      if (this.pendingResolve) {
        const stale = this.pendingResolve;
        this.pendingResolve = null;
        stale({ kind: 'failed', error: new Error('superseded') });
      }

      this.currentEarned = false;
      this.currentType = type;
      this.pendingResolve = resolve;

      AdMob.showRewardVideoAd().catch((err: unknown) => {
        if (this.pendingResolve === resolve) {
          this.settle({
            kind: 'failed',
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });
    });
  }

  isReady(type: AdRewardType): boolean {
    return this.readyMap.get(type) === true;
  }
}
