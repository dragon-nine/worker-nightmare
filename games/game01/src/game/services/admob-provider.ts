/**
 * AdMob 보상형 광고 프로바이더 (Capacitor)
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
  type RewardAdOptions,
} from '@capacitor-community/admob';
import type { AdProvider } from './ad-service';
import { gameConfig } from '../game.config';

const REWARDED_AD_UNIT_ID = gameConfig.admobRewardedAdUnitId;

// 테스트용 광고 단위 ID (개발 중 사용)
const TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

const isDev = import.meta.env.DEV;

export class AdMobProvider implements AdProvider {
  private ready = false;
  private initialized = false;

  private getAdUnitId(): string {
    // 실제 ID가 설정되지 않았거나 개발 모드면 테스트 ID 사용
    if (isDev || !REWARDED_AD_UNIT_ID) {
      return TEST_REWARDED_AD_UNIT_ID;
    }
    return REWARDED_AD_UNIT_ID;
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    await AdMob.initialize({
      initializeForTesting: isDev,
    });

    // 광고 로드 완료 이벤트
    AdMob.addListener(RewardAdPluginEvents.Loaded, (_info: AdLoadInfo) => {
      this.ready = true;
    });

    // 광고 로드 실패
    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
      this.ready = false;
    });

    // 광고 닫힘 (시청 완료 또는 스킵)
    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      this.ready = false;
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

  async showRewarded(): Promise<void> {
    await AdMob.showRewardVideoAd();
  }

  isReady(): boolean {
    return this.ready;
  }
}
