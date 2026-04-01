import { useCallback, useRef, useState } from 'react';

/**
 * 모바일 WebView에서 버튼 터치 피드백 제공
 * - onTouchStart/End로 즉각적인 scale 피드백
 * - 300ms 딜레이 없이 즉시 반응
 */
export function usePress() {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handlers = useCallback((id: string) => ({
    onTouchStart: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPressedId(id);
    },
    onTouchEnd: () => {
      timerRef.current = setTimeout(() => setPressedId(null), 100);
    },
    onTouchCancel: () => {
      setPressedId(null);
    },
  }), []);

  const pressStyle = useCallback((id: string): React.CSSProperties => ({
    transform: pressedId === id ? 'scale(0.92)' : undefined,
    transition: 'transform 0.08s ease-out',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  }), [pressedId]);

  return { handlers, pressStyle, pressedId };
}
