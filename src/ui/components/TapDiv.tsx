import type { CSSProperties, ReactNode } from 'react';
import { useNativeTap } from '../hooks/useNativeTap';

interface Props {
  onTap: () => void;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** 부모로 탭 이벤트 새지 않게 native stopPropagation */
  stopPropagation?: boolean;
}

/**
 * 탭 바인딩만 담당하는 최소 래퍼 — `TapButton` 의 press scale 애니메이션이
 * 어울리지 않는 자리(토글, 레이아웃 렌더러 등 자체 press 연출이 있는 요소)에서 사용.
 *
 * Galaxy WebView 가 React onClick 을 2번 합성하는 버그를 native click 으로 회피.
 * UI 버튼(애니메이션 필요) 은 `TapButton`, 게임 인풋은 `TapButton rapid`,
 * 그 외 "클릭 가능한 div" 는 이 컴포넌트.
 */
export function TapDiv({ onTap, children, style, className, stopPropagation }: Props) {
  const tapRef = useNativeTap(onTap, { stopPropagation });
  return (
    <div
      ref={tapRef}
      className={className}
      style={{
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
