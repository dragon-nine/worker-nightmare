import type { CSSProperties } from 'react'
import { colors } from './design-tokens'

interface CircleButtonProps {
  /** 아이콘: 'play' | 'rotate' | 'pause' */
  icon?: 'play' | 'rotate' | 'pause'
  size?: number
  onClick?: () => void
  style?: CSSProperties
}

/** 전진/회전/일시정지 — 3D 블루그레이 원형 버튼 */
export default function CircleButton({
  icon = 'play',
  size = 80,
  onClick,
  style,
}: CircleButtonProps) {
  const iconSize = size * 0.38

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: 0,
        ...style,
      }}
    >
      {/* 하단 그림자 (3D 효과) */}
      <div style={{
        position: 'absolute',
        bottom: -2,
        left: '5%',
        width: '90%',
        height: '90%',
        borderRadius: '50%',
        background: 'linear-gradient(to bottom, #888, #aaa)',
        zIndex: 0,
      }} />
      {/* 메인 원 */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: `radial-gradient(circle at 40% 35%, ${colors.blueGrayLight}, ${colors.blueGray} 50%, ${colors.blueGrayDark} 100%)`,
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        {/* 하이라이트 (상단 반사광) */}
        <div style={{
          position: 'absolute',
          top: '12%',
          left: '35%',
          width: '18%',
          height: '8%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.35)',
        }} />
        <div style={{
          position: 'absolute',
          top: '16%',
          left: '42%',
          width: '8%',
          height: '5%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
        }} />

        {/* 아이콘 */}
        {icon === 'play' && (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <path d="M8 5v14l11-7z" fill={colors.white} stroke={colors.blueGrayDark} strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        )}
        {icon === 'rotate' && (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <path d="M9 14l-4 4m0 0l4 4m-4-4h11a5 5 0 0 0 0-10h-1" stroke={colors.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {icon === 'pause' && (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" rx="1" fill={colors.white} stroke={colors.blueGrayDark} strokeWidth="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" fill={colors.white} stroke={colors.blueGrayDark} strokeWidth="1" />
          </svg>
        )}
      </div>
    </button>
  )
}
