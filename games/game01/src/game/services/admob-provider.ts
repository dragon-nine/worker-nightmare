/**
 * AdMob 보상형 광고 프로바이더 (Capacitor)
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
 *
 * 설정:
 *   1. AdMob 콘솔에서 앱 등록 → 앱 ID 발급
 *   2. 보상형 광고 단위 생성 → adUnitId 설정
 *   3. Android: AndroidManifest.xml에 앱 ID 추가 (cap sync 시 자동)
 */

import {
  AdMob,
  RewardAdPluginEvents,
  type AdLoadInfo,
  type AdMobError,
  type RewardAdOptions,
} from '@capacitor-community/admob';
import type { AdProvider, AdResult } from './ad-service';
import { gameConfig } from '../game.config';

const REWARDED_AD_UNIT_ID = gameConfig.admobRewardedAdUnitId;

// 테스트용 광고 단위 ID (개발 중 사용)
const TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

const isDev = import.meta.env.DEV;

export class AdMobProvider implements AdProvider {
  private ready = false;
  private initialized = false;

  /** 현재 표시 중인 광고의 reward 수신 여부 */
  private currentEarned = false;

  /** 현재 표시 중인 광고의 settle 콜백 (Dismissed/FailedToShow 시 호출) */
  private pendingResolve: ((result: AdResult) => void) | null = null;

  private getAdUnitId(): string {
    // 실제 ID가 설정되지 않았거나 개발 모드면 테스트 ID 사용
    if (isDev || !REWARDED_AD_UNIT_ID) {
      return TEST_REWARDED_AD_UNIT_ID;
    }
    return REWARDED_AD_UNIT_ID;
  }

  private settle(result: AdResult): void {
    const cb = this.pendingResolve;
    this.pendingResolve = null;
    this.currentEarned = false;
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
      this.ready = true;
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
      this.ready = false;
    });

    // ── 표시 라이프사이클 ──
    AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      // 리워드 수신 — Dismissed 이벤트에서 settle할 때 사용
      this.currentEarned = true;
    });

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      // 광고가 닫혔을 때 — currentEarned 여부에 따라 결과 결정
      this.ready = false;
      if (this.pendingResolve) {
        this.settle(
          this.currentEarned ? { kind: 'rewarded' } : { kind: 'skipped' }
        );
      }
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToShow, (error: AdMobError) => {
      this.ready = false;
      this.settle({
        kind: 'failed',
        error: new Error(error?.message || 'failed_to_show'),
      });
    });
  }

  async preload(): Promise<void> {
    await this.init();

    const options: RewardAdOptions = {
      adId: this.getAdUnitId(),
      isTesting: isDev,
    };

    await AdMob.prepareRewardVideoAd(options);
  }

  showRewarded(): Promise<AdResult> {
    return new Promise<AdResult>((resolve) => {
      // 이전 호출이 어떤 이유로 settle 안 됐다면 정리
      if (this.pendingResolve) {
        const stale = this.pendingResolve;
        this.pendingResolve = null;
        stale({ kind: 'failed', error: new Error('superseded') });
      }

      this.currentEarned = false;
      this.pendingResolve = resolve;

      // showRewardVideoAd의 Promise는 OnUserEarnedReward 시점에 resolve되므로
      // 결과는 이벤트 리스너에서 처리하고, 여기선 reject(기술적 에러)만 캐치.
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

  isReady(): boolean {
    return this.ready;
  }
}
