import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  file: File
  targetWidth: number
  targetHeight: number
  onCropped: (croppedFile: File) => void
  onCancel: () => void
}

export default function ImageCropper({ file, targetWidth, targetHeight, onCropped, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [tooSmall, setTooSmall] = useState(false)

  // Image display state
  const [display, setDisplay] = useState({ iw: 0, ih: 0, scale: 1, ox: 0, oy: 0 })

  // Crop box in display coordinates
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const dragRef = useRef<{ type: 'move'; startX: number; startY: number; startCrop: typeof crop } | null>(null)

  const aspectRatio = targetWidth / targetHeight

  // Load image
  useEffect(() => {
    const img = new Image()
    img.onload = () => setImgEl(img)
    img.src = URL.createObjectURL(file)
    return () => URL.revokeObjectURL(img.src)
  }, [file])

  // Calculate display layout when image loads
  useEffect(() => {
    if (!imgEl || !containerRef.current) return

    // Check minimum size
    setTooSmall(imgEl.naturalWidth < targetWidth || imgEl.naturalHeight < targetHeight)

    const container = containerRef.current
    const maxW = container.clientWidth - 40
    const maxH = container.clientHeight - 40

    // Always scale based on target size — target box defines the reference frame
    const refW = Math.max(imgEl.naturalWidth, targetWidth)
    const refH = Math.max(imgEl.naturalHeight, targetHeight)
    const scale = Math.min(maxW / refW, maxH / refH)

    const iw = imgEl.naturalWidth * scale
    const ih = imgEl.naturalHeight * scale
    const ox = (container.clientWidth - iw) / 2
    const oy = (container.clientHeight - ih) / 2
    setDisplay({ iw, ih, scale, ox, oy })

    // Init crop box - fit largest possible with target aspect ratio
    const tw = targetWidth * scale
    const th = targetHeight * scale
    let cw: number, ch: number
    if (iw / ih > aspectRatio) {
      ch = Math.min(ih, th)
      cw = ch * aspectRatio
    } else {
      cw = Math.min(iw, tw)
      ch = cw / aspectRatio
    }
    setCrop({ x: ox + (iw - cw) / 2, y: oy + (ih - ch) / 2, w: cw, h: ch })
  }, [imgEl, aspectRatio])

  // Draw
  useEffect(() => {
    if (!canvasRef.current || !imgEl) return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!container) return
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    const ctx = canvas.getContext('2d')!

    // Draw image
    ctx.drawImage(imgEl, display.ox, display.oy, display.iw, display.ih)

    // Dim outside crop
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    // Top
    ctx.fillRect(0, 0, canvas.width, crop.y)
    // Bottom
    ctx.fillRect(0, crop.y + crop.h, canvas.width, canvas.height - crop.y - crop.h)
    // Left
    ctx.fillRect(0, crop.y, crop.x, crop.h)
    // Right
    ctx.fillRect(crop.x + crop.w, crop.y, canvas.width - crop.x - crop.w, crop.h)

    // Crop border
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h)

    // Grid lines (thirds)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(crop.x + (crop.w * i) / 3, crop.y)
      ctx.lineTo(crop.x + (crop.w * i) / 3, crop.y + crop.h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(crop.x, crop.y + (crop.h * i) / 3)
      ctx.lineTo(crop.x + crop.w, crop.y + (crop.h * i) / 3)
      ctx.stroke()
    }

    // Size label
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(crop.x, crop.y + crop.h + 4, 120, 22)
    ctx.fillStyle = '#fff'
    ctx.font = '12px monospace'
    ctx.fillText(`${targetWidth} x ${targetHeight}`, crop.x + 6, crop.y + crop.h + 19)
  }, [imgEl, display, crop, targetWidth, targetHeight])

  // Pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // Move only — no resize
    if (mx >= crop.x && mx <= crop.x + crop.w && my >= crop.y && my <= crop.y + crop.h) {
      dragRef.current = { type: 'move', startX: e.clientX, startY: e.clientY, startCrop: { ...crop } }
    }

    if (dragRef.current) {
      e.currentTarget.setPointerCapture(e.pointerId)
      e.preventDefault()
    }
  }, [crop])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const sc = dragRef.current.startCrop

    const x = clamp(sc.x + dx, display.ox, display.ox + display.iw - sc.w)
    const y = clamp(sc.y + dy, display.oy, display.oy + display.ih - sc.h)
    setCrop({ ...sc, x, y })
  }, [display, aspectRatio])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // Apply crop
  const handleApply = useCallback(() => {
    if (!imgEl) return
    // Convert crop display coords to source image coords
    const sx = (crop.x - display.ox) / display.scale
    const sy = (crop.y - display.oy) / display.scale
    const sw = crop.w / display.scale
    const sh = crop.h / display.scale

    const out = document.createElement('canvas')
    out.width = targetWidth
    out.height = targetHeight
    const ctx = out.getContext('2d')!
    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)

    out.toBlob((blob) => {
      if (!blob) return
      const ext = file.name.match(/\.\w+$/)?.[0] || '.png'
      const name = file.name.replace(/\.\w+$/, '') + `_${targetWidth}x${targetHeight}${ext}`
      const croppedFile = new File([blob], name, { type: blob.type })
      onCropped(croppedFile)
    }, file.type || 'image/png', 0.95)
  }, [imgEl, crop, display, targetWidth, targetHeight, file, onCropped])

  return (
    <div className="cropper-overlay" onClick={onCancel}>
      <div className="cropper-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cropper-header">
          <h3>이미지 크롭 — {targetWidth} x {targetHeight}</h3>
          <button className="cropper-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="cropper-body" ref={containerRef}>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
          />
        </div>
        <div className="cropper-footer">
          {tooSmall ? (
            <span className="cropper-hint" style={{ color: '#ff6b6b' }}>
              이미지가 너무 작습니다 ({imgEl?.naturalWidth}x{imgEl?.naturalHeight}) — 최소 {targetWidth}x{targetHeight} 이상 필요
            </span>
          ) : (
            <span className="cropper-hint">드래그하여 위치 조정</span>
          )}
          <div className="cropper-actions">
            <button className="le-btn le-btn-ghost" onClick={onCancel}>취소</button>
            <button className="le-btn le-btn-save" onClick={handleApply} disabled={tooSmall}>적용</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
