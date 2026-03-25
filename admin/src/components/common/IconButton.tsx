import type { CSSProperties } from 'react'
import { colors, radius, font } from './design-tokens'

interface IconButtonProps {
  icon?: string
  children: string
  fontSize?: number
  onClick?: () => void
  style?: CSSProperties
}

/** 도전장 보내기 / 랭킹 보기 스타일 — 아이콘 + 텍스트, 어두운 배경, 이중 테두리 */
export default function IconButton({
  icon,
  children,
  fontSize = 18,
  onClick,
  style,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.darker,
        color: colors.white,
        fontSize,
        fontWeight: font.weight.black,
        fontStyle: 'italic',
        fontFamily: font.primary,
        border: `3px solid #333`,
        outline: `2px solid #555`,
        borderRadius: radius.md,
        padding: '12px 20px',
        cursor: 'pointer',
        WebkitTextStroke: `1.5px ${colors.stroke}`,
        paintOrder: 'stroke fill',
        ...style,
      }}
    >
      {icon && <span style={{ fontSize: fontSize + 4, WebkitTextStroke: '0px' }}>{icon}</span>}
      {children}
    </button>
  )
}
