import type { CSSProperties } from 'react'
import { colors, radius, font } from './design-tokens'

interface DarkButtonProps {
  children: string
  fontSize?: number
  width?: 'full' | 'half' | 'auto'
  onClick?: () => void
  style?: CSSProperties
}

/** 홈으로 가기 스타일 — 어두운 배경, 둥근 모서리, 흰색 굵은 이탤릭 */
export default function DarkButton({
  children,
  fontSize = 24,
  width = 'full',
  onClick,
  style,
}: DarkButtonProps) {
  const w = width === 'full' ? '100%' : width === 'half' ? '48%' : 'auto';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: w,
        backgroundColor: colors.dark,
        color: colors.white,
        fontSize,
        fontWeight: font.weight.black,
        fontStyle: 'italic',
        fontFamily: font.primary,
        border: `3px solid ${colors.stroke}`,
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
