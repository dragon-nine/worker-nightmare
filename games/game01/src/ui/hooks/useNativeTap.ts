import { useCallback, useRef } from 'react';

/**
 * 네이티브 DOM 이벤트로 안정적인 탭 핸들러 등록.
 *
 * iOS WebKit의 onPointerDown 누락 문제를 우회하기 위한 훅.
 * 빠른 연속 입력이 중요한 게임 버튼에 사용.
 *
 * 동작:
 * - touchstart {passive: false} + preventDefault → 후속 mouse 이벤트 차단 (중복 실행 방지)
 * - mousedown → 데스크탑(마우스) 호환
 * - React 합성 이벤트 우회 → 더 빠르고 누락 없음
 *
 * 사용:
 *   const tapRef = useNativeTap(() => { ... });
 *   return <div ref={tapRef}>...</div>;
 *
 * callback ref 패턴 사용 — 엘리먼트가 마운트될 때 자동으로 리스너 등록.
 * useEffect 기반 ref와 달리 조건부 렌더링과 잘 동작함.
 *
 * 출처:
 * - https://github.com/facebook/react/issues/12901 (React onPointerDown iOS 누락)
 * - https://bugs.webkit.org/show_bug.cgi?id=211521 (WebKit 회귀)
 * - https://patrickhlauke.github.io/getting-touchy-presentation/ (모바일 입력 권장 패턴)
 */
export function useNativeTap(onTap: () => void) {
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((el: HTMLElement | null) => {
    // 이전 엘리먼트 정리
    cleanupRef.current?.();
    cleanupRef.current = null;

    if (!el) return;

    // 모든 touchstart/mousedown을 즉시 처리 (ghost filter 없음)
    // 사용자의 빠른 연타를 절대 누락하지 않음
    let lastPrimaryFire = 0;
    const CLICK_SUPPRESS_MS = 500;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      lastPrimaryFire = e.timeStamp;
      onTapRef.current();
    };

    const onMouseDown = () => {
      lastPrimaryFire = performance.now();
      onTapRef.current();
    };

    // click은 touchstart/mousedown 직후 자동 발생하는 중복 차단용
    const onClick = () => {
      const now = performance.now();
      if (now - lastPrimaryFire < CLICK_SUPPRESS_MS) return;
      onTapRef.current();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('click', onClick);

    cleanupRef.current = () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClick);
    };
  }, []);
}
