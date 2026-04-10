/**
 * Mock 광고 프로바이더 — DEV 전용
 *
 * 일반 브라우저에서 부활 광고 흐름을 테스트하기 위한 더미 프로바이더.
 * production 빌드에는 포함되지 않음 (GameContainer에서 import.meta.env.DEV 분기로 등록).
 *
 * 동작:
 *   1. preload — 100ms 가짜 로딩
 *   2. showRewarded — 500ms 가짜 광고 로딩 후 React MockAdModal 표시
 *   3. 사용자가 [완료/스킵/실패] 또는 배경 탭으로 결과 선택 → AdResult 반환
 *
 * UI는 src/ui/overlays/MockAdModal.tsx에서 ModalShell 기반으로 렌더링.
 * 이 모듈은 Promise resolver만 보관하고 gameBus 이벤트로 표시 요청.
 */

import type { AdProvider, AdResult } from './ad-service';
import { gameBus } from '../event-bus';

let pendingResolve: ((result: AdResult) => void) | null = null;

/** MockAdModal에서 사용자 선택 결과를 전달할 때 호출 */
export function resolveMockAd(result: AdResult): void {
  if (pendingResolve) {
    const fn = pendingResolve;
    pendingResolve = null;
    fn(result);
  }
}

export class MockAdProvider implements AdProvider {
  private ready = false;

  async preload(): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  async showRewarded(): Promise<AdResult> {
    // 가짜 광고 로딩 시간 — Bug 1 (delta spike) 재현용
    await new Promise((r) => setTimeout(r, 500));

    return new Promise<AdResult>((resolve) => {
      pendingResolve = (result) => {
        this.ready = false;
        // 다음 광고 미리 로드
        this.preload();
        resolve(result);
      };
      gameBus.emit('mock-ad-show', undefined);
    });
  }
}
