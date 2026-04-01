/**
 * 광고 서비스 — AdMob 보상형 광고 통합 인터페이스
 *
 * 사용 패턴:
 *   1. 게임 시작 시 adService.preload()
 *   2. 부활 버튼 클릭 시 adService.showRewarded(onReward, onFail)
 *   3. AdMob 미연동 시 자동으로 house ad fallback
 */

import { logEvent } from './analytics';
import { isAdRemoved } from './billing';

export interface AdProvider {
  /** 광고 미리 로드 (AdMob: admob.rewardedAd.load()) */
  preload(): Promise<void>;
  /** 보상형 광고 표시. 시청 완료 시 resolve, 실패/스킵 시 reject */
  showRewarded(): Promise<void>;
  /** 광고가 로드되어 즉시 표시 가능한지 */
  isReady(): boolean;
}

type HouseAdRenderer = (onComplete: () => void) => void;

class AdService {
  private provider: AdProvider | null = null;
  private houseAdRenderer: HouseAdRenderer | null = null;

  /** AdMob 등 실제 광고 프로바이더 등록 */
  setProvider(provider: AdProvider) {
    this.provider = provider;
  }

  /** Phaser scene의 house ad 렌더러 등록 (fallback용) */
  setHouseAdRenderer(renderer: HouseAdRenderer) {
    this.houseAdRenderer = renderer;
  }

  /** 광고 미리 로드 — 게임오버 전에 호출해두면 부활 시 즉시 표시 가능 */
  preload() {
    this.provider?.preload().catch(() => {
      // 로드 실패 — showRewarded에서 fallback 처리
    });
  }

  /**
   * 보상형 광고 표시
   * @param onReward 시청 완료 → 부활 실행
   * @param onFail 광고 실패/없음 → fallback house ad
   */
  showRewarded(onReward: () => void) {
    // 광고 제거 구매 완료 시 바로 부활
    if (isAdRemoved()) {
      onReward();
      return;
    }

    // 실제 광고 프로바이더가 있고 준비됐으면 사용
    if (this.provider?.isReady()) {
      logEvent('ad_rewarded_show', { provider: 'admob' });
      this.provider.showRewarded()
        .then(() => {
          logEvent('ad_rewarded_complete', { provider: 'admob' });
          onReward();
        })
        .catch(() => {
          // 광고 표시 실패 → house ad fallback
          logEvent('ad_rewarded_fail', { provider: 'admob' });
          this.showHouseAd(onReward);
        });
      // 다음 광고 미리 로드
      this.preload();
      return;
    }

    // 프로바이더 없거나 미준비 → house ad
    logEvent('ad_fallback_house');
    this.showHouseAd(onReward);
  }

  private showHouseAd(onReward: () => void) {
    if (this.houseAdRenderer) {
      this.houseAdRenderer(onReward);
    } else {
      // renderer도 없으면 즉시 부활
      onReward();
    }
  }
}

export const adService = new AdService();
