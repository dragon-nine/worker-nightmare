import type { CSSProperties } from 'react'
import { colors, radius } from './design-tokens'

interface GaugeBarProps {
  /** 0~1 사이 값 */
  value?: number
  width?: number
  height?: number
  fillColor?: string
  style?: CSSProperties
}

/** 체력 게이지바 — 대각선 줄무늬, 검정 테두리 */
export default function GaugeBar({
  value = 0.7,
  width = 280,
  height = 32,
  fillColor = colors.red,
  style,
}: GaugeBarProps) {
  const stripeSize = height * 0.8

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: radius.sm,
        border: `3px solid ${colors.white}`,
        backgroundColor: colors.darker,
        overflow: 'hidden',
        boxShadow: `0 0 0 2px ${colors.stroke}`,
        ...style,
      }}
    >
      {/* 배경 줄무늬 (빈 게이지) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `repeating-linear-gradient(
          -55deg,
          transparent,
          transparent ${stripeSize * 0.4}px,
          rgba(255,255,255,0.05) ${stripeSize * 0.4}px,
          rgba(255,255,255,0.05) ${stripeSize * 0.8}px
        )`,
      }} />

      {/* 채워진 게이지 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: `${Math.max(0, Math.min(1, value)) * 100}%`,
        background: `linear-gradient(to bottom, ${fillColor}, ${colors.redDark})`,
        transition: 'width 0.3s ease-out',
      }}>
        {/* 채움 줄무늬 */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            -55deg,
            transparent,
            transparent ${stripeSize * 0.4}px,
            rgba(0,0,0,0.15) ${stripeSize * 0.4}px,
            rgba(0,0,0,0.15) ${stripeSize * 0.8}px
          )`,
        }} />
      </div>
    </div>
  )
}
