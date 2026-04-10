/**
 * 토스 리워드 광고 프로바이더
 *
 * 토스 인앱 광고 2.0 ver2 — load → show 패턴
 * 테스트용 adGroupId: 'ait-ad-test-rewarded-id'
 *
 * 결과 처리:
 *   - userEarnedReward 이벤트 → earned 플래그 set
 *   - dismissed 이벤트 → earned 여부에 따라 rewarded/skipped
 *   - failedToShow / onError → failed
 */

import type { AdProvider, AdResult } from './ad-service';
import { gameConfig } from '../game.config';

const TEST_AD_GROUP_ID = 'ait-ad-test-rewarded-id';
const isDev = import.meta.env.DEV;

export class TossAdProvider implements AdProvider {
  private loaded = false;

  private getAdGroupId(): string {
    const id = gameConfig.tossAdGroupId;
    if (isDev || !id || id.startsWith('TODO')) {
      return TEST_AD_GROUP_ID;
    }
    return id;
  }

  async preload(): Promise<void> {
    const { loadFullScreenAd } = await import('@apps-in-toss/web-framework');

    return new Promise<void>((resolve) => {
      loadFullScreenAd({
        options: { adGroupId: this.getAdGroupId() },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            this.loaded = true;
            resolve();
          }
        },
        onError: (error) => {
          console.warn('[TossAd] 광고 로드 실패:', error);
          this.loaded = false;
          resolve(); // 실패해도 resolve (showRewarded에서 fallback 처리)
        },
      });
    });
  }

  async showRewarded(): Promise<AdResult> {
    if (!this.loaded) {
      await this.preload();
    }
    if (!this.loaded) {
      return { kind: 'failed', error: new Error('not_loaded') };
    }

    const { showFullScreenAd } = await import('@apps-in-toss/web-framework');

    return new Promise<AdResult>((resolve) => {
      let earned = false;
      let settled = false;

      const settle = (result: AdResult) => {
        if (settled) return;
        settled = true;
        this.loaded = false;
        // 다음 광고 미리 로드
        this.preload();
        resolve(result);
      };

      showFullScreenAd({
        options: { adGroupId: this.getAdGroupId() },
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
          console.warn('[TossAd] 광고 표시 실패:', error);
          settle({
            kind: 'failed',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        },
      });
    });
  }

  isReady(): boolean {
    return this.loaded;
  }
}
