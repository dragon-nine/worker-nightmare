import type { CSSProperties } from 'react'
import { colors } from './design-tokens'

interface CloseButtonProps {
  size?: number
  bgColor?: string
  iconColor?: string
  onClick?: () => void
  style?: CSSProperties
}

/** 닫기 버튼 — 검정 원형 배경 + 굵은 X */
export default function CloseButton({
  size = 32,
  bgColor = colors.black,
  iconColor = colors.white,
  onClick,
  style,
}: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        background: bgColor,
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        padding: 0,
        color: iconColor,
        fontSize: size * 0.5,
        fontWeight: 700,
        lineHeight: 1,
        ...style,
      }}
    >
      ✕
    </button>
  )
}
