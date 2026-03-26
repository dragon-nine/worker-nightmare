import { useRef, useCallback, type PointerEvent } from 'react'
import type { LayoutElement } from './types'
import type { ComputedPos } from './layout-compute'
import { font, typeScale, buttonStyleDefaults, gradients, type GradientKey } from '../../components/common/design-tokens'
import { RESIZE_HANDLE_SIZE } from './constants'

interface Props {
  el: LayoutElement
  pos: ComputedPos
  scale: number
  selected: boolean
  assetUrl?: string
  onPointerDown: (e: PointerEvent) => void
  onResize: (newWidthPx: number) => void
}

export default function PhoneCanvasElement({ el, pos, scale, selected, assetUrl, onPointerDown, onResize }: Props) {
  const resizeRef = useRef<{ startX: number; origW: number } | null>(null)

  const left = pos.x - pos.w * pos.originX
  const top = pos.y - pos.h * pos.originY

  const handleResizeDown = useCallback((e: PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    resizeRef.current = { startX: e.clientX, origW: el.widthPx }
  }, [el.widthPx])

  const handleResizeMove = useCallback((e: PointerEvent) => {
    if (!resizeRef.current) return
    const dx = (e.clientX - resizeRef.current.startX) / scale
    onResize(resizeRef.current.origW + dx)
  }, [scale, onResize])

  const handleResizeUp = useCallback(() => {
    resizeRef.current = null
  }, [])

  const renderContent = () => {
    if (el.type === 'image') {
      return assetUrl ? (
        <img src={assetUrl} alt={el.id} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>
          {el.id}
        </div>
      )
    }

    if (el.type === 'button') {
      const bs = el.buttonStyle
      const scaleKey = bs?.scaleKey || 'lg'
      const ts = typeScale[scaleKey]
      const bsd = buttonStyleDefaults[bs?.styleType || 'outline']
      const bgGrad = bs?.bgGradient ? gradients[bs.bgGradient as GradientKey] : null
      const bgStyle = bgGrad
        ? `linear-gradient(${bgGrad.direction}, ${bgGrad.from}, ${bgGrad.to})`
        : bs?.bgColor || '#24282c'
      return (
        <div style={{
          width: '100%', height: '100%',
          background: bgStyle,
          borderRadius: bsd.borderRadius * scale,
          border: bsd.borderWidth > 0 ? `${bsd.borderWidth * scale}px solid ${bsd.borderColor}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: bs?.styleType === 'doubleLine' ? `${3 * scale}px` : undefined,
        }}>
          {bs?.styleType === 'doubleLine' ? (
            <div style={{
              width: '100%', height: '100%',
              border: `${bsd.innerLineWidth * scale}px solid ${bsd.innerLineColor}`,
              borderRadius: (bsd.borderRadius - 4) * scale,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: font.primary, fontSize: ts.fontSize * scale, fontWeight: ts.fontWeight,
                color: '#fff', WebkitTextStroke: ts.stroke ? `${ts.stroke * scale}px #000` : undefined,
                paintOrder: 'stroke fill',
              }}>{el.label || '버튼'}</span>
            </div>
          ) : (
            <span style={{
              fontFamily: font.primary, fontSize: ts.fontSize * scale, fontWeight: ts.fontWeight,
              color: '#fff', WebkitTextStroke: ts.stroke ? `${ts.stroke * scale}px #000` : undefined,
              paintOrder: 'stroke fill',
            }}>{el.label || '버튼'}</span>
          )}
        </div>
      )
    }

    // text
    const textStyle = el.textStyle
    const fontSize = (textStyle?.fontSizePx || 14) * scale
    const color = textStyle?.color || '#ffffff'
    return (
      <div style={{
        fontFamily: font.primary, fontSize, fontWeight: 700,
        color: textStyle?.gradientColors ? undefined : color,
        WebkitTextStroke: textStyle?.strokeWidth ? `${textStyle.strokeWidth * scale}px ${textStyle.strokeColor || '#000'}` : undefined,
        paintOrder: 'stroke fill',
        textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.4,
        ...(textStyle?.gradientColors ? {
          background: `linear-gradient(to bottom, ${textStyle.gradientColors[0]}, ${textStyle.gradientColors[1]})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        } : {}),
      }}>
        {el.label || el.id}
      </div>
    )
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left, top,
        width: pos.w, height: pos.h,
        cursor: el.locked ? 'default' : 'grab',
        outline: selected ? '2px solid #3182f6' : undefined,
        outlineOffset: 2,
        opacity: el.locked ? 0.5 : 1,
        zIndex: selected ? 10 : 1,
      }}
    >
      {renderContent()}

      {/* Resize handle (right edge) */}
      {selected && !el.locked && (
        <div
          onPointerDown={handleResizeDown}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
          style={{
            position: 'absolute', right: -RESIZE_HANDLE_SIZE / 2, top: '50%',
            transform: 'translateY(-50%)',
            width: RESIZE_HANDLE_SIZE, height: 24,
            background: '#3182f6', borderRadius: 3,
            cursor: 'ew-resize',
          }}
        />
      )}
    </div>
  )
}
