import { useCallback, useRef } from 'react';

/**
 * 모든 입력 장치(터치/마우스/펜)에서 단 한 번만 onTap을 발사하는 훅.
 *
 * 설계 원칙:
 * - `touchstart`는 항상 새로운 유저 gesture이므로 무조건 통과 (연타 허용)
 * - `touchstart` 후 브라우저가 합성한 `mousedown`/`click`/`pointerdown(touch)`
 *   중복 이벤트는 짧은 잠금 창으로 차단
 * - 마우스(데스크탑): `mousedown`에서 한 번, 뒤따르는 `click`은 잠금 차단
 * - 키보드(Enter/Space): `click`만 오므로 정상 발사
 *
 * 이 방식은 Android WebView(갤럭시 Toss 인앱 포함)에서 신뢰도 높음:
 * 이벤트 경로가 브라우저마다 달라도 touchstart가 게이트, 나머지는 전부 잠금.
 */
interface Options {
  /**
   * 스크롤 가능한 컨테이너(상점, 리스트 등) 안의 버튼이면 true.
   * - `pointerup`에서 발사 + 이동 거리 검사 → 스크롤과 탭 구분
   * - 게임 인풋(즉시 반응 필요)에는 사용 X (기본값 false로 touchstart 즉시 발사)
   */
  scrollSafe?: boolean;
}

const SCROLL_THRESHOLD_PX = 8;
/**
 * 합성 이벤트 차단 창. 한 번의 유저 gesture에서 브라우저가 뒤따라 쏘는
 * mouse/click은 보통 300~400ms 안에 도착. 여유를 두고 400ms.
 * `touchstart`는 이 창을 무시하고 항상 통과하므로 연타에 영향 없음.
 */
const LOCK_MS = 400;

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
  let lockedUntil = 0;
  const lock = () => { lockedUntil = performance.now() + LOCK_MS; };
  const isLocked = () => performance.now() < lockedUntil;

  // 키보드(Enter/Space) 및 데스크탑 대체 경로. 터치로 이미 발사됐으면 차단.
  const onClick = () => {
    if (isLocked()) return;
    lock();
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

    const onPointerUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      if (moved) return;
      if (isLocked()) return;
      lock();
      onTap();
      if (e.pointerType === 'touch' && e.cancelable) e.preventDefault();
    };

    const onPointerCancel = () => { tracking = false; };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('click', onClick);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      el.removeEventListener('click', onClick);
    };
  }

  // 기본 모드 (게임 인풋) ─────────────────────────────────────────
  // touchstart: 새 유저 gesture → 잠금 우회, 항상 발사, 잠금 갱신
  // → 연타 허용. 합성 mouse/click은 잠금으로 차단.
  const onTouchStart = (e: TouchEvent) => {
    if (e.cancelable) e.preventDefault(); // 합성 이벤트 추가 억제
    lock();
    onTap();
  };

  // 마우스 경로 (터치가 아닌 포인터) + 터치 브라우저가 touchstart를 안 쏘고
  // pointerdown만 쏘는 비정상 케이스의 방어선.
  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    if (isLocked()) return;
    lock();
    onTap();
  };

  // 구형 브라우저 대비 mousedown.
  const onMouseDown = () => {
    if (isLocked()) return;
    lock();
    onTap();
  };

  el.addEventListener('touchstart', onTouchStart, { passive: false });
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('mousedown', onMouseDown);
  el.addEventListener('click', onClick);

  return () => {
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('mousedown', onMouseDown);
    el.removeEventListener('click', onClick);
  };
}
