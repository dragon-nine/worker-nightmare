import type { CSSProperties } from 'react'
import { colors, radius, font } from './design-tokens'

interface RedButtonProps {
  children: string
  fontSize?: number
  width?: 'full' | 'half' | 'auto'
  onClick?: () => void
  style?: CSSProperties
}

/** 광고보고 부활 스타일 — 빨간 그라데이션, 빨간 테두리 */
export default function RedButton({
  children,
  fontSize = 24,
  width = 'full',
  onClick,
  style,
}: RedButtonProps) {
  const w = width === 'full' ? '100%' : width === 'half' ? '48%' : 'auto';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: w,
        background: `linear-gradient(135deg, ${colors.redLight} 0%, ${colors.red} 40%, ${colors.redDark} 100%)`,
        color: colors.white,
        fontSize,
        fontWeight: font.weight.black,
        fontStyle: 'italic',
        fontFamily: font.primary,
        border: `3px solid ${colors.redDark}`,
        borderRadius: radius.lg,
        padding: '14px 24px',
        cursor: 'pointer',
        WebkitTextStroke: `2px ${colors.stroke}`,
        paintOrder: 'stroke fill',
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
