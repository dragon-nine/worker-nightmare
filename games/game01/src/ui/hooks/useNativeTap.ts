import { useCallback, useRef } from 'react';

/**
 * 모든 입력 장치(터치/마우스/펜)에서 정확히 한 번만 onTap을 발사하는 훅.
 *
 * ## 정책
 *
 * 기본 모드는 **`click` 이벤트 + `touch-action: manipulation`** (W3C/Patrick Lauke 권장).
 * 브라우저가 touch/mouse/pen을 통합해 한 제스처당 정확히 1회 click을 발사 보장.
 * 우리가 직접 디덥할 필요 없음 — Galaxy WebView가 같은 제스처에 pointerdown을 2번
 * 쏘는 케이스도 click은 1회만 발사됨.
 *
 * ## 모드
 *
 * - **default (UI 버튼 전부)**: `click` — 메인/대시보드/모달/광고/공유/설정/게임오버 등
 *   탭 후 컴포넌트 트리 변화가 일어나도 안전.
 * - **rapid (게임 인풋)**: `pointerdown` 즉시 발사 + 50ms 디덥. forward/switch처럼
 *   즉시 반응이 필요하고 트리 변화가 없는 인풋용.
 * - **scrollSafe**: `pointerup` + 이동거리 검사 + 100ms 디덥. 스크롤 컨테이너 내부 버튼.
 */
interface Options {
  /**
   * 스크롤 가능한 컨테이너(상점/리스트) 안의 버튼이면 true.
   * `pointerup`에서 발사 + 이동 거리 검사 → 스크롤과 탭 구분.
   */
  scrollSafe?: boolean;
  /**
   * 게임 인풋(forward/switch)처럼 즉시 반응 + 빠른 연타가 필요할 때 true.
   * `pointerdown`에서 즉시 발사 + 50ms 디덥.
   */
  rapid?: boolean;
}

const SCROLL_THRESHOLD_PX = 8;
const SCROLL_DEDUP_MS = 100;
const RAPID_DEDUP_MS = 50;

export function useNativeTap(onTap: () => void, options: Options = {}) {
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const scrollSafe = options.scrollSafe ?? false;
  const rapid = options.rapid ?? false;

  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((el: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!el) return;
    cleanupRef.current = attachTap(el, () => onTapRef.current(), { scrollSafe, rapid });
  }, [scrollSafe, rapid]);
}

function attachTap(
  el: HTMLElement,
  onTap: () => void,
  mode: { scrollSafe: boolean; rapid: boolean },
): () => void {
  if (mode.scrollSafe) return attachScrollSafe(el, onTap);
  if (mode.rapid) return attachRapid(el, onTap);
  return attachClick(el, onTap);
}

function attachClick(el: HTMLElement, onTap: () => void): () => void {
  const handler = () => onTap();
  el.addEventListener('click', handler);
  return () => el.removeEventListener('click', handler);
}

function attachRapid(el: HTMLElement, onTap: () => void): () => void {
  // 게임 인풋은 본질적으로 멀티터치 — 양손 엄지로 교대 탭 시
  // 두 손가락이 동시에 화면에 있는 순간의 두 번째 터치는 isPrimary=false라
  // 드롭됨. dedup은 같은 손가락의 같은 버튼 연타만 막도록 pointerId별로 관리.
  const lastFireByPointer = new Map<number, number>();
  const onPointerDown = (e: PointerEvent) => {
    // 포인터를 이 element에 즉시 명시적 캡처 → OS/브라우저의 제스처 감지 중단 유도.
    // (iOS Safari 엣지 스와이프 등 외부 제스처로 터치가 드롭되는 엣지케이스 방어)
    try { el.setPointerCapture(e.pointerId); } catch { /* 일부 환경 미지원 무시 */ }
    const now = performance.now();
    const last = lastFireByPointer.get(e.pointerId) ?? -Infinity;
    if (now - last < RAPID_DEDUP_MS) return;
    lastFireByPointer.set(e.pointerId, now);
    onTap();
  };
  // pointerId 누수 방지 — pointerup/cancel 시 정리
  const onPointerEnd = (e: PointerEvent) => {
    lastFireByPointer.delete(e.pointerId);
  };
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointerup', onPointerEnd);
  el.addEventListener('pointercancel', onPointerEnd);
  return () => {
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointerup', onPointerEnd);
    el.removeEventListener('pointercancel', onPointerEnd);
  };
}

function attachScrollSafe(el: HTMLElement, onTap: () => void): () => void {
  let lastFireAt = -Infinity;
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
    const now = performance.now();
    if (now - lastFireAt < SCROLL_DEDUP_MS) return;
    lastFireAt = now;
    onTap();
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
