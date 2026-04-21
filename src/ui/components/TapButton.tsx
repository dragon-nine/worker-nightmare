import { useState, type CSSProperties, type ReactNode } from 'react';
import { useNativeTap } from '../hooks/useNativeTap';

interface Props {
  /** 탭 시 실행될 콜백 */
  onTap: () => void;
  /** 추가 스타일 */
  style?: CSSProperties;
  /** 자식 요소 */
  children?: ReactNode;
  /** className */
  className?: string;
  /** 누름 효과 강도 (기본 0.92) */
  pressScale?: number;
  /**
   * 스크롤 가능한 컨테이너(상점, 리스트 등) 안에 있을 때 true.
   * 스크롤 시 클릭이 실행되지 않도록 pointerup + 이동거리 검사를 사용.
   */
  scrollSafe?: boolean;
  /**
   * 게임 인풋(forward/switch)처럼 즉시 반응 + 빠른 연타가 필요할 때 true.
   * pointerdown에서 즉시 발사. UI 버튼에는 사용하지 말 것 (기본 click 모드 사용).
   */
  rapid?: boolean;
}

/**
 * 모든 버튼의 표준 컴포넌트.
 *
 * - 네이티브 touch/mouse 이벤트로 가장 안정적인 입력 처리
 * - iOS WebKit 첫 탭 누락 / 합성 이벤트 지연 등 모든 알려진 이슈 회피
 * - 자동 press 피드백 (scale)
 * - 모든 버튼이 동일한 동작 보장
 *
 * 사용:
 * ```tsx
 * <TapButton onTap={handleClick} style={{ background: 'red' }}>
 *   <img src="..." />
 * </TapButton>
 * ```
 */
export function TapButton({ onTap, style, children, className, pressScale = 0.92, scrollSafe = false, rapid = false }: Props) {
  // rapid 모드(게임 인풋): React state 없이 CSS :active로만 press 피드백.
  //   탭마다 setState → 리렌더가 iOS WebKit 터치 이벤트 드롭을 유발하는 현상 회피.
  // 기본 모드(UI 버튼): 기존 setState 방식 유지 (저빈도 탭, 문제 없음).
  const [pressed, setPressed] = useState(false);
  const tapRef = useNativeTap(
    () => {
      if (!rapid) {
        setPressed(true);
        setTimeout(() => setPressed(false), 100);
      }
      onTap();
    },
    { scrollSafe, rapid },
  );

  if (rapid) {
    return (
      <div
        ref={tapRef}
        className={`tap-button-rapid${className ? ` ${className}` : ''}`}
        style={{
          ...style,
          ['--press-scale' as string]: pressScale,
        } as React.CSSProperties}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={tapRef}
      className={className}
      style={{
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? `scale(${pressScale})` : undefined,
        transition: 'transform 0.08s ease-out',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
