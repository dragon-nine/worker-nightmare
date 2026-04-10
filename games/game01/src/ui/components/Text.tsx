import type { CSSProperties, ReactNode } from 'react';

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
export function Text({
  size,
  weight = 400,
  color = '#fff',
  align,
  lineHeight,
  style,
  className,
  as = 'div',
  children,
}: Props) {
  const Tag = as;
  return (
    <Tag
      className={className}
      style={{
        fontFamily: 'GMarketSans, sans-serif',
        fontWeight: weight,
        fontSize: size,
        color,
        ...(align && { textAlign: align }),
        ...(lineHeight !== undefined && { lineHeight }),
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
