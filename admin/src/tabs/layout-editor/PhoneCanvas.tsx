import { useRef, useCallback, type PointerEvent } from 'react'
import type { LayoutElement, GroupElement, AnchorElement } from './types'
import { computePreviewLayout } from './layout-compute'
import { PHONE_PREVIEW_W, PHONE_PREVIEW_H, DESIGN_W } from './constants'
import PhoneCanvasElement from './PhoneCanvasElement'

const R2_PUBLIC = 'https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev'

interface Props {
  elements: LayoutElement[]
  imageSizes: Record<string, { w: number; h: number }>
  groupVAlign: 'center' | 'top'
  bgCss: string
  screenKey: string
  gameId: string
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdate: (id: string, patch: Partial<LayoutElement>) => void
}

export default function PhoneCanvas({
  elements, imageSizes, groupVAlign, bgCss, screenKey, gameId,
  selectedId, onSelect, onUpdate,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    id: string; startX: number; startY: number
    origVal: number; origVal2?: number; field: string; field2?: string
  } | null>(null)

  const positions = computePreviewLayout(elements, PHONE_PREVIEW_W, PHONE_PREVIEW_H, imageSizes, groupVAlign)
  const scale = PHONE_PREVIEW_W / DESIGN_W

  const getAssetUrl = (el: LayoutElement) => {
    if (el.assetKey) return `${R2_PUBLIC}/${el.assetKey}`
    return `${R2_PUBLIC}/${gameId}/${screenKey}/${el.id}.png`
  }

  const handlePointerDown = useCallback((e: PointerEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect(id)
    const el = elements.find((x) => x.id === id)
    if (!el || el.locked) return

    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    if (el.positioning === 'group') {
      dragRef.current = { id, startX: e.clientX, startY: e.clientY, origVal: (el as GroupElement).gapPx, field: 'gapPx' }
    } else {
      const anchor = el as AnchorElement
      dragRef.current = {
        id, startX: e.clientX, startY: e.clientY,
        origVal: anchor.offsetX, origVal2: anchor.offsetY,
        field: 'offsetX', field2: 'offsetY',
      }
    }
  }, [elements, onSelect])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const el = elements.find((x) => x.id === drag.id)
    if (!el) return

    const dy = (e.clientY - drag.startY) / scale
    const dx = (e.clientX - drag.startX) / scale

    if (el.positioning === 'group') {
      onUpdate(drag.id, { gapPx: Math.round(drag.origVal + dy) })
    } else {
      const a = el as AnchorElement
      const signX = a.anchor.includes('right') ? -1 : 1
      const signY = a.anchor.includes('bottom') ? -1 : 1
      onUpdate(drag.id, {
        offsetX: Math.round(drag.origVal + dx * signX),
        offsetY: Math.round(drag.origVal2! + dy * signY),
      })
    }
  }, [elements, scale, onUpdate])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // Resize handler
  const handleResize = useCallback((id: string, newWidthPx: number) => {
    onUpdate(id, { widthPx: Math.max(20, Math.round(newWidthPx)) })
  }, [onUpdate])

  return (
    <div
      style={{
        width: PHONE_PREVIEW_W + 24,
        background: '#111',
        borderRadius: 32,
        padding: '40px 12px',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Notch */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: 80, height: 24, background: '#000', borderRadius: 12,
      }} />
      {/* Screen */}
      <div
        ref={canvasRef}
        onClick={(e) => { if (e.target === e.currentTarget) onSelect(null) }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          width: PHONE_PREVIEW_W,
          height: PHONE_PREVIEW_H,
          background: bgCss === 'transparent'
            ? 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 0 0 / 16px 16px'
            : bgCss,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'default',
        }}
      >
        {positions.map((pos) => {
          const el = elements.find((x) => x.id === pos.id)
          if (!el || el.visible === false) return null
          return (
            <PhoneCanvasElement
              key={el.id}
              el={el}
              pos={pos}
              scale={scale}
              selected={selectedId === el.id}
              assetUrl={el.type === 'image' ? getAssetUrl(el) : undefined}
              onPointerDown={(e) => handlePointerDown(e, el.id)}
              onResize={(newW) => handleResize(el.id, newW)}
            />
          )
        })}
      </div>
    </div>
  )
}
