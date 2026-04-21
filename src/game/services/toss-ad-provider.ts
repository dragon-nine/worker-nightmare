/**
 * 토스 보상형 광고 프로바이더
 *
 * 토스 인앱 광고 — loadFullScreenAd → showFullScreenAd 패턴
 * 리워드 타입별 독립 adGroupId 지원 (revive / gem / coin)
 *
 * 결과 처리:
 *   - userEarnedReward 이벤트 → earned 플래그 set (보상 지급 조건)
 *   - dismissed 이벤트 → earned 여부에 따라 rewarded/skipped
 *   - failedToShow / onError → failed
 *
 * ⚠️ 보상형 광고는 끝까지 시청해야 userEarnedReward가 발생.
 *    중간 스킵(X) 시에는 dismissed만 발생 → skipped 처리.
 */

import type { AdProvider, AdResult, AdRewardType } from './ad-service';
import { gameConfig } from '../game.config';

const TEST_AD_GROUP_ID = 'ait-ad-test-rewarded-id';
const isDev = import.meta.env.DEV;

export class TossAdProvider implements AdProvider {
  /** 타입별 로드 완료 상태 */
  private loadedMap = new Map<AdRewardType, boolean>();

  private getAdGroupId(type: AdRewardType): string {
    const id = gameConfig.tossAdGroupIds[type];
    if (isDev || !id || id.startsWith('TODO')) {
      return TEST_AD_GROUP_ID;
    }
    return id;
  }

  async preload(type: AdRewardType): Promise<void> {
    const { loadFullScreenAd } = await import('@apps-in-toss/web-framework');

    return new Promise<void>((resolve) => {
      loadFullScreenAd({
        options: { adGroupId: this.getAdGroupId(type) },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            this.loadedMap.set(type, true);
            resolve();
          }
        },
        onError: (error) => {
          console.warn(`[TossAd:${type}] 광고 로드 실패:`, error);
          this.loadedMap.set(type, false);
          resolve(); // 실패해도 resolve (showRewarded에서 fallback 처리)
        },
      });
    });
  }

  async showRewarded(type: AdRewardType): Promise<AdResult> {
    if (!this.isReady(type)) {
      await this.preload(type);
    }
    if (!this.isReady(type)) {
      return { kind: 'failed', error: new Error('not_loaded') };
    }

    const { showFullScreenAd } = await import('@apps-in-toss/web-framework');

    return new Promise<AdResult>((resolve) => {
      let earned = false;
      let settled = false;

      const settle = (result: AdResult) => {
        if (settled) return;
        settled = true;
        this.loadedMap.set(type, false);
        // 다음 광고 미리 로드
        this.preload(type);
        resolve(result);
      };

      showFullScreenAd({
        options: { adGroupId: this.getAdGroupId(type) },
        onEvent: (event) => {
          if (event.type === 'userEarnedReward') {
            earned = true;
          } else if (event.type === 'dismissed') {
            settle(earned ? { kind: 'rewarded' } : { kind: 'skipped' });
          } else if (event.type === 'failedToShow') {
            settle({ kind: 'failed', error: new Error('failed_to_show') });
          }
        },
        onError: (error) => {
          console.warn(`[TossAd:${type}] 광고 표시 실패:`, error);
          settle({
            kind: 'failed',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        },
      });
    });
  }

  isReady(type: AdRewardType): boolean {
    return this.loadedMap.get(type) === true;
  }
}
