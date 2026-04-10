/**
 * 광고 서비스 — 보상형 광고 통합 인터페이스
 *
 * 사용 패턴:
 *   1. 게임 시작 시 adService.preload()
 *   2. 부활 버튼 클릭 시 adService.showRewarded((result) => { ... })
 *   3. 결과는 discriminated union으로 전달:
 *      - kind === 'rewarded' → 부활
 *      - kind === 'skipped'  → 사용자가 광고 스킵 (부활 안 함)
 *      - kind === 'failed'   → 기술적 실패 (부활 안 함)
 */

import { logEvent } from './analytics';
import { isAdRemoved } from './billing';

/** 광고 표시 결과 */
export type AdResult =
  | { kind: 'rewarded' }
  | { kind: 'skipped' }
  | { kind: 'failed'; error: Error };

export interface AdProvider {
  preload(): Promise<void>;
  showRewarded(): Promise<AdResult>;
  isReady(): boolean;
}

class AdService {
  private provider: AdProvider | null = null;
  private preloadPromise: Promise<void> | null = null;
  private currentShow: Promise<AdResult> | null = null;
  private cancelled = false;

  setProvider(provider: AdProvider) {
    this.provider = provider;
  }

  /** 광고 미리 로드 */
  preload() {
    if (!this.provider) return;
    if (this.provider.isReady()) return;
    this.preloadPromise = this.provider.preload().catch(() => {
      // 로드 실패 — showRewarded에서 처리
    });
  }

  /**
   * 보상형 광고 표시.
   * - 광고 미로드 시 최대 5초까지 로드 대기
   * - 진행 중인 광고가 있으면 두 번째 호출은 무시 (연타 방지)
   * - 결과는 onResult 콜백으로 전달
   */
  showRewarded(onResult: (result: AdResult) => void): void {
    // 광고 제거 구매한 사용자는 즉시 부활
    if (isAdRemoved()) {
      onResult({ kind: 'rewarded' });
      return;
    }

    // 이미 진행 중 — 무시 (연타 방지)
    if (this.currentShow) {
      logEvent('ad_rewarded_dedup', {});
      return;
    }

    this.cancelled = false;
    this.currentShow = this._doShow();
    this.currentShow
      .then((result) => {
        if (this.cancelled) return; // 취소된 경우 무시
        onResult(result);
      })
      .finally(() => {
        this.currentShow = null;
        this.cancelled = false;
      });
  }

  /**
   * 진행 중인 광고 흐름 취소 (예: 사용자가 홈으로 나갈 때).
   * 이미 표시 중인 네이티브 광고를 강제로 닫지는 못하지만,
   * 결과 콜백 호출을 막아서 stale 콜백이 게임 상태를 건드리는 것을 방지.
   */
  cancel(): void {
    if (this.currentShow) {
      this.cancelled = true;
    }
  }

  private async _doShow(): Promise<AdResult> {
    if (!this.provider) {
      logEvent('ad_rewarded_no_provider', {});
      return { kind: 'failed', error: new Error('no_provider') };
    }

    // 광고 미로드 → 로드 대기 (최대 5초)
    if (!this.provider.isReady()) {
      this.preload();
      const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('load_timeout')), 5000)
      );
      try {
        await Promise.race([this.preloadPromise ?? Promise.reject(new Error('no_preload')), timeout]);
      } catch (e) {
        logEvent('ad_rewarded_load_failed', { reason: (e as Error).message });
        return { kind: 'failed', error: e as Error };
      }
      if (!this.provider.isReady()) {
        logEvent('ad_rewarded_not_ready', {});
        return { kind: 'failed', error: new Error('not_ready') };
      }
    }

    logEvent('ad_rewarded_show', {});
    const result = await this.provider.showRewarded();

    // 결과별 분석 이벤트
    if (result.kind === 'rewarded') {
      logEvent('ad_rewarded_complete', {});
    } else if (result.kind === 'skipped') {
      logEvent('ad_rewarded_skipped', {});
    } else {
      logEvent('ad_rewarded_failed', { error: result.error.message });
    }

    // 다음 광고 미리 로드
    this.preload();

    return result;
  }
}

export const adService = new AdService();
