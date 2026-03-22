import { useState, useEffect, useCallback, useRef } from 'react'
import type { BlobItem } from '../types'
import { listBlobs, uploadBlob, deleteBlob } from '../api'
import ImageCropper from '../components/ImageCropper'
import LazyImage from '../components/LazyImage'

/* ── Types ── */

interface PlatformSpec {
  platform: string
  label: string
  width: number
  height: number
  prefix: string
}

interface AssetGroup {
  key: string
  label: string
  desc: string
  accept: string
  maxCount: number
  specs: PlatformSpec[]
}

function buildGroups(gameId: string): AssetGroup[] {
  return [
    {
      key: 'icon',
      label: '앱 아이콘',
      desc: '정사각형 아이콘',
      accept: 'image/png',
      maxCount: 1,
      specs: [
        { platform: 'Google Play', label: '512x512', width: 512, height: 512, prefix: `store/${gameId}/google-play/icon/` },
        { platform: '토스', label: '600x600', width: 600, height: 600, prefix: `store/${gameId}/toss/icon/` },
      ],
    },
    {
      key: 'feature',
      label: '대표 이미지',
      desc: '가로형 배너',
      accept: 'image/png,image/jpeg',
      maxCount: 1,
      specs: [
        { platform: 'Google Play', label: '1024x500', width: 1024, height: 500, prefix: `store/${gameId}/google-play/feature/` },
        { platform: '토스', label: '1932x828', width: 1932, height: 828, prefix: `store/${gameId}/toss/thumbnail/` },
      ],
    },
    {
      key: 'screenshots',
      label: '스크린샷',
      desc: '세로형 스크린샷',
      accept: 'image/png,image/jpeg',
      maxCount: 8,
      specs: [
        { platform: 'Google Play', label: '1080x1920', width: 1080, height: 1920, prefix: `store/${gameId}/google-play/screenshots/` },
        { platform: '토스', label: '636x1048', width: 636, height: 1048, prefix: `store/${gameId}/toss/screenshots/` },
      ],
    },
  ]
}

/* ── Props ── */

interface Props {
  gameId: string
  gameName: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

/* ── Helpers ── */

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getFilename(pathname: string): string {
  return pathname.split('/').pop() || pathname
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url)
  const data = await res.blob()
  const blobUrl = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}

// Resize an image file to target dimensions using canvas
function resizeImage(file: File, targetW: number, targetH: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')!
      // Cover-fit: crop center to fill target aspect ratio
      const srcAspect = img.naturalWidth / img.naturalHeight
      const dstAspect = targetW / targetH
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
      if (srcAspect > dstAspect) {
        sw = img.naturalHeight * dstAspect
        sx = (img.naturalWidth - sw) / 2
      } else {
        sh = img.naturalWidth / dstAspect
        sy = (img.naturalHeight - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Canvas toBlob failed')); return }
        const name = `${targetW}x${targetH}_${file.name}`
        resolve(new File([blob], name, { type: blob.type || 'image/png' }))
      }, file.type || 'image/png', 0.95)
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = URL.createObjectURL(file)
  })
}

/* ── Group Component ── */

function LaunchGroup({ group, onBanner }: { group: AssetGroup; onBanner: Props['onBanner'] }) {
  const addRef = useRef<HTMLInputElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [blobsByPlatform, setBlobsByPlatform] = useState<Record<string, BlobItem[]>>({})
  const [cropState, setCropState] = useState<{ file: File; specIndex: number } | null>(null)
  const [processing, setProcessing] = useState(false)

  const refresh = useCallback(async () => {
    const result: Record<string, BlobItem[]> = {}
    for (const spec of group.specs) {
      try { result[spec.platform] = await listBlobs(spec.prefix) } catch { result[spec.platform] = [] }
    }
    setBlobsByPlatform(result)
  }, [group.specs])

  useEffect(() => { refresh() }, [refresh])

  // Step 1: User picks file → crop for first platform
  const handleFileSelected = useCallback((files: File[]) => {
    const totalExisting = Math.max(...group.specs.map((s) => (blobsByPlatform[s.platform] || []).length))
    if (totalExisting + files.length > group.maxCount) {
      onBanner('error', `최대 ${group.maxCount}개까지`)
      return
    }
    if (files[0]) setCropState({ file: files[0], specIndex: 0 })
  }, [group, blobsByPlatform, onBanner])

  // Step 2: After cropping for current spec, auto-resize for remaining specs
  const handleCropped = useCallback(async (croppedFile: File) => {
    if (!cropState) return
    const currentSpec = group.specs[cropState.specIndex]
    setProcessing(true)
    setCropState(null)

    try {
      // Upload the cropped file to current platform
      await uploadBlob(croppedFile, currentSpec.prefix)

      // Auto-resize for other platforms
      for (let i = 0; i < group.specs.length; i++) {
        if (i === cropState.specIndex) continue
        const otherSpec = group.specs[i]
        const resized = await resizeImage(croppedFile, otherSpec.width, otherSpec.height)
        await uploadBlob(resized, otherSpec.prefix)
      }

      onBanner('success', `${group.specs.map((s) => s.platform).join(' + ')} 모두 업로드 완료`)
      refresh()
    } catch (err) {
      onBanner('error', `업로드 실패: ${(err as Error).message}`)
    }
    setProcessing(false)
  }, [cropState, group.specs, onBanner, refresh])

  const handleDelete = useCallback(async (url: string, platform: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      await deleteBlob(url)
      onBanner('success', `${platform} 이미지 삭제 완료`)
      refresh()
    } catch (err) {
      onBanner('error', `삭제 실패: ${(err as Error).message}`)
    }
  }, [onBanner, refresh])

  const totalCount = Math.max(...group.specs.map((s) => (blobsByPlatform[s.platform] || []).length), 0)

  return (
    <div className="card">
      <div className="category-header">
        <button className="category-toggle" onClick={() => setCollapsed(!collapsed)}>
          <span className={`sidebar-chevron${collapsed ? '' : ' open'}`}>&#9656;</span>
          <span className="card-title" style={{ marginBottom: 0 }}>{group.label}</span>
          <span className="spec-badge">{group.desc}</span>
          <span className="section-count">{totalCount} / {group.maxCount}</span>
        </button>
        {totalCount < group.maxCount && (
          <>
            <button
              className="category-add-btn"
              onClick={(e) => { e.stopPropagation(); addRef.current?.click() }}
              title="추가"
              disabled={processing}
            >+</button>
            <input ref={addRef} type="file" accept={group.accept} style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files) handleFileSelected(Array.from(e.target.files)); e.target.value = '' }} />
          </>
        )}
      </div>

      {processing && (
        <div className="lp-processing">리사이즈 및 업로드 중...</div>
      )}

      {!collapsed && (
        <div className="lp-platforms">
          {group.specs.map((spec) => {
            const blobs = blobsByPlatform[spec.platform] || []
            return (
              <div key={spec.platform} className="lp-platform">
                <div className="lp-platform-header">
                  <span className="lp-platform-name">{spec.platform}</span>
                  <span className="lp-platform-size">{spec.width} x {spec.height}</span>
                </div>
                {blobs.length === 0 ? (
                  <div className="lp-empty">없음</div>
                ) : (
                  <div className="lp-items">
                    {blobs.map((b) => {
                      const fname = getFilename(b.pathname)
                      return (
                        <div key={b.url} className="lp-item">
                          <div className="lp-item-preview">
                            <LazyImage src={b.url} alt={fname} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>
                          <div className="lp-item-info">
                            <span className="lp-item-name" title={fname}>{fname}</span>
                            <span className="lp-item-size">{formatSize(b.size)}</span>
                            <button className="asset-card-download" onClick={() => downloadFile(b.url, fname)} title="다운로드">&#8681;</button>
                            <button className="asset-card-delete" onClick={() => handleDelete(b.url, spec.platform)} title="삭제">&#x2715;</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {cropState && (
        <ImageCropper
          file={cropState.file}
          targetWidth={group.specs[cropState.specIndex].width}
          targetHeight={group.specs[cropState.specIndex].height}
          onCropped={handleCropped}
          onCancel={() => setCropState(null)}
        />
      )}
    </div>
  )
}

/* ── Main ── */

export default function LaunchPrepTab({ gameId, gameName, onBanner }: Props) {
  const groups = buildGroups(gameId)
  return (
    <div>
      <h1 className="page-title">출시 준비</h1>
      <p className="page-subtitle">{gameName} — 하나의 이미지로 Google Play + 토스 동시 생성</p>
      <div className="lp-info">
        이미지를 하나 올리면 첫 번째 플랫폼 크기로 크롭 후, 나머지 플랫폼은 자동 리사이즈됩니다.
      </div>
      {groups.map((g) => <LaunchGroup key={g.key} group={g} onBanner={onBanner} />)}
    </div>
  )
}
