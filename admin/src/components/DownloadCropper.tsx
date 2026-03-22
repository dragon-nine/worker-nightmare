import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  imageUrl: string
  sourceWidth: number
  sourceHeight: number
  targetWidth: number
  targetHeight: number
  filename: string
  onDone: () => void
}

export default function DownloadCropper({
  imageUrl, sourceWidth, sourceHeight, targetWidth, targetHeight, filename, onDone,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [display, setDisplay] = useState({ scale: 1, ox: 0, oy: 0, iw: 0, ih: 0 })

  // Crop position (in display coords, top-left of crop box)
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 })
  const [cropSize, setCropSize] = useState({ w: 0, h: 0 })
  const dragRef = useRef<{ startX: number; startY: number; startCropX: number; startCropY: number } | null>(null)

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setImgEl(img)
    img.src = imageUrl
  }, [imageUrl])

  // Layout
  useEffect(() => {
    if (!imgEl || !containerRef.current) return
    const cw = containerRef.current.clientWidth - 40
    const ch = containerRef.current.clientHeight - 40
    const scale = Math.min(cw / sourceWidth, ch / sourceHeight, 1)
    const iw = sourceWidth * scale
    const ih = sourceHeight * scale
    const ox = (containerRef.current.clientWidth - iw) / 2
    const oy = (containerRef.current.clientHeight - ih) / 2
    setDisplay({ scale, ox, oy, iw, ih })

    // Crop box size in display coords
    const cropW = targetWidth * scale
    const cropH = targetHeight * scale
    setCropSize({ w: cropW, h: cropH })
    // Center the crop box
    setCropPos({ x: ox + (iw - cropW) / 2, y: oy + (ih - cropH) / 2 })
  }, [imgEl, sourceWidth, sourceHeight, targetWidth, targetHeight])

  // Draw
  useEffect(() => {
    if (!canvasRef.current || !imgEl || !containerRef.current) return
    const canvas = canvasRef.current
    canvas.width = containerRef.current.clientWidth
    canvas.height = containerRef.current.clientHeight
    const ctx = canvas.getContext('2d')!

    ctx.drawImage(imgEl, display.ox, display.oy, display.iw, display.ih)

    // Dim outside
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, canvas.width, cropPos.y)
    ctx.fillRect(0, cropPos.y + cropSize.h, canvas.width, canvas.height - cropPos.y - cropSize.h)
    ctx.fillRect(0, cropPos.y, cropPos.x, cropSize.h)
    ctx.fillRect(cropPos.x + cropSize.w, cropPos.y, canvas.width - cropPos.x - cropSize.w, cropSize.h)

    // Border
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.strokeRect(cropPos.x, cropPos.y, cropSize.w, cropSize.h)

    // Grid thirds
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(cropPos.x + (cropSize.w * i) / 3, cropPos.y)
      ctx.lineTo(cropPos.x + (cropSize.w * i) / 3, cropPos.y + cropSize.h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cropPos.x, cropPos.y + (cropSize.h * i) / 3)
      ctx.lineTo(cropPos.x + cropSize.w, cropPos.y + (cropSize.h * i) / 3)
      ctx.stroke()
    }

    // Label
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(cropPos.x, cropPos.y + cropSize.h + 4, 130, 22)
    ctx.fillStyle = '#fff'
    ctx.font = '12px monospace'
    ctx.fillText(`${targetWidth} x ${targetHeight}`, cropPos.x + 6, cropPos.y + cropSize.h + 19)
  }, [imgEl, display, cropPos, cropSize, targetWidth, targetHeight])

  // Drag to move crop box
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    if (mx >= cropPos.x && mx <= cropPos.x + cropSize.w &&
        my >= cropPos.y && my <= cropPos.y + cropSize.h) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, startCropX: cropPos.x, startCropY: cropPos.y }
      e.currentTarget.setPointerCapture(e.pointerId)
      e.preventDefault()
    }
  }, [cropPos, cropSize])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setCropPos({
      x: clamp(dragRef.current.startCropX + dx, display.ox, display.ox + display.iw - cropSize.w),
      y: clamp(dragRef.current.startCropY + dy, display.oy, display.oy + display.ih - cropSize.h),
    })
  }, [display, cropSize])

  const handlePointerUp = useCallback(() => { dragRef.current = null }, [])

  // Download
  const handleDownload = useCallback(() => {
    if (!imgEl) return
    // Convert display coords to source coords
    const sx = (cropPos.x - display.ox) / display.scale
    const sy = (cropPos.y - display.oy) / display.scale
    const sw = cropSize.w / display.scale
    const sh = cropSize.h / display.scale

    const out = document.createElement('canvas')
    out.width = targetWidth
    out.height = targetHeight
    const ctx = out.getContext('2d')!
    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)

    out.toBlob((blob) => {
      if (!blob) return
      const ext = filename.match(/\.\w+$/)?.[0] || '.png'
      const name = filename.replace(/\.\w+$/, '') + `_${targetWidth}x${targetHeight}${ext}`
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      onDone()
    }, 'image/png', 0.95)
  }, [imgEl, cropPos, cropSize, display, targetWidth, targetHeight, filename, onDone])

  return (
    <div className="cropper-overlay" onClick={onDone}>
      <div className="cropper-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cropper-header">
          <h3>다운로드 위치 조정 — {targetWidth} x {targetHeight}</h3>
          <button className="cropper-close" onClick={onDone}>&times;</button>
        </div>
        <div className="cropper-body" ref={containerRef}>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }}
          />
        </div>
        <div className="cropper-footer">
          <span className="cropper-hint">크롭 영역을 드래그하여 위치를 조정하세요</span>
          <div className="cropper-actions">
            <button className="le-btn le-btn-ghost" onClick={onDone}>취소</button>
            <button className="le-btn le-btn-save" onClick={handleDownload}>다운로드</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
