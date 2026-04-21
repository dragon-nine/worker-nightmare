import { forwardRef, type CSSProperties, type ReactNode } from 'react';

interface Props {
  /** 이미 스케일링된 px 값 */
  size: number;
  weight?: 400 | 700 | 900;
  color?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number | string;
  /** 추가 스타일 (margin 등) */
  style?: CSSProperties;
  className?: string;
  /** 기본 div, 인라인이 필요할 땐 'span' */
  as?: 'div' | 'span';
  children: ReactNode;
}

/**
 * GMarketSans 기반 텍스트 컴포넌트.
 * fontFamily 인라인 반복을 제거하기 위함.
 */
export const Text = forwardRef<HTMLDivElement | HTMLSpanElement, Props>(function Text(
  { size, weight = 400, color = '#fff', align, lineHeight, style, className, as = 'div', children },
  ref,
) {
  const commonStyle: CSSProperties = {
    fontFamily: 'GMarketSans, sans-serif',
    fontWeight: weight,
    fontSize: size,
    color,
    ...(align && { textAlign: align }),
    ...(lineHeight !== undefined && { lineHeight }),
    ...style,
  };
  if (as === 'span') {
    return (
      <span ref={ref as React.Ref<HTMLSpanElement>} className={className} style={commonStyle}>
        {children}
      </span>
    );
  }
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={className} style={commonStyle}>
      {children}
    </div>
  );
});
