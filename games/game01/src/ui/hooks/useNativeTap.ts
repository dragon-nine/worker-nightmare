import { useCallback, useRef } from 'react';

/**
 * 모든 입력 장치(터치/마우스/펜)에서 정확히 한 번만 onTap을 발사하는 훅.
 *
 * ## 설계
 *
 * Pointer Events API **단일 경로**. iOS 13+와 모든 Android WebView에서 표준.
 * 한 번의 물리적 입력(손가락 탭/마우스 클릭/펜 터치)에 대해 `pointerdown`이
 * 정확히 1번 발사되도록 브라우저가 touch/mouse 이벤트를 통합해줌.
 *
 * touch/mouse/click 이벤트를 따로 듣지 않는다 — 여러 경로를 동시에 들으면
 * WebView별로 쏘는 순서/타이밍이 달라 dedup이 어긋나고 중복/누락이 발생.
 *
 * ## 중복 방지
 *
 * 갤럭시 WebView 등 일부 환경에서 같은 gesture에 `pointerdown`이 2번 쏘는
 * 케이스를 대비해 **100ms 시간창 dedup**. 사람이 100ms 안에 의도적으로
 * 재탭하는 건 물리적으로 거의 불가능하므로 연타에 영향 없음.
 *
 * ## 키보드
 *
 * 게임 버튼은 모바일 전용이라 키보드 접근성은 고려하지 않음.
 */
interface Options {
  /**
   * 스크롤 가능한 컨테이너(상점/리스트) 안의 버튼이면 true.
   * - `pointerup`에서 발사 + 이동 거리 검사 → 스크롤과 탭 구분
   * - 게임 인풋(즉시 반응)에는 false (기본) — `pointerdown`에서 즉시 발사
   */
  scrollSafe?: boolean;
}

const SCROLL_THRESHOLD_PX = 8;
const DEDUP_WINDOW_MS = 100;

export function useNativeTap(onTap: () => void, options: Options = {}) {
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const scrollSafe = options.scrollSafe ?? false;

  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((el: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!el) return;
    cleanupRef.current = attachTap(el, () => onTapRef.current(), scrollSafe);
  }, [scrollSafe]);
}

function attachTap(el: HTMLElement, onTap: () => void, scrollSafe: boolean): () => void {
  let lastFireAt = -Infinity;
  const fire = () => {
    const now = performance.now();
    if (now - lastFireAt < DEDUP_WINDOW_MS) return;
    lastFireAt = now;
    onTap();
  };

  if (scrollSafe) {
    let startX = 0;
    let startY = 0;
    let moved = false;
    let tracking = false;

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      tracking = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!tracking || moved) return;
      if (
        Math.abs(e.clientX - startX) > SCROLL_THRESHOLD_PX ||
        Math.abs(e.clientY - startY) > SCROLL_THRESHOLD_PX
      ) {
        moved = true;
      }
    };

    const onPointerUp = () => {
      if (!tracking) return;
      tracking = false;
      if (moved) return;
      fire();
    };

    const onPointerCancel = () => { tracking = false; };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
    };
  }

  // 기본 모드 (모든 게임/UI 버튼): pointerdown 단일 경로, 100ms dedup.
  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    fire();
  };

  el.addEventListener('pointerdown', onPointerDown);

  return () => {
    el.removeEventListener('pointerdown', onPointerDown);
  };
}
