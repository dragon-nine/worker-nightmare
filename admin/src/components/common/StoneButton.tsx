import type { CSSProperties } from 'react'
import { colors, radius, font } from './design-tokens'

interface StoneButtonProps {
  children: string
  fontSize?: number
  onClick?: () => void
  style?: CSSProperties
}

/** 퇴근하기 스타일 — 돌/시멘트 질감 블루그레이 버튼 */
export default function StoneButton({
  children,
  fontSize = 22,
  onClick,
  style,
}: StoneButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.blueGray,
        color: colors.white,
        fontSize,
        fontWeight: font.weight.black,
        fontFamily: font.primary,
        border: `4px solid ${colors.blueGrayDark}`,
        borderRadius: radius.lg,
        padding: '16px 40px',
        cursor: 'pointer',
        WebkitTextStroke: `2px ${colors.stroke}`,
        paintOrder: 'stroke fill',
        background: `
          linear-gradient(135deg, ${colors.blueGrayLight} 0%, ${colors.blueGray} 40%, ${colors.blueGrayDark} 100%)
        `,
        boxShadow: `
          inset 0 2px 4px rgba(255,255,255,0.15),
          inset 0 -3px 6px rgba(0,0,0,0.3),
          0 4px 8px rgba(0,0,0,0.4)
        `,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* 균열 장식 (상단 우측) */}
      <svg style={{ position: 'absolute', top: 4, right: 8, opacity: 0.3 }} width="24" height="20" viewBox="0 0 24 20">
        <path d="M12 0 L14 6 L18 4 L16 10 L20 12 L14 13 L16 18 L12 14 L8 18 L10 12 L4 10 L10 8 L8 2 Z"
          fill="none" stroke={colors.blueGrayDark} strokeWidth="1.5" />
      </svg>
      {/* 균열 장식 (하단 좌측) */}
      <svg style={{ position: 'absolute', bottom: 6, left: 12, opacity: 0.25 }} width="16" height="14" viewBox="0 0 16 14">
        <path d="M0 7 L4 3 L6 7 L10 2 L8 7 L12 5 L10 9 L16 7"
          fill="none" stroke={colors.blueGrayDark} strokeWidth="1.2" />
      </svg>
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  )
}
