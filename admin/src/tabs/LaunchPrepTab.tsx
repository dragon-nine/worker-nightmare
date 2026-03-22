import { useState, useEffect, useCallback, useRef } from 'react'
import type { BlobItem } from '../types'
import { listBlobs, uploadBlob, deleteBlob } from '../api'
import ImageCropper from '../components/ImageCropper'
import DownloadCropper from '../components/DownloadCropper'
import LazyImage from '../components/LazyImage'

/* ── Types ── */

interface DownloadOption {
  platform: string
  width: number
  height: number
  mode: 'resize' | 'crop'  // resize=자동, crop=크로퍼로 위치 조정
}

interface AssetGroup {
  key: string
  label: string
  desc: string
  accept: string
  maxCount: number
  storeWidth: number   // Blob에 저장되는 크기
  storeHeight: number
  prefix: string
  downloads: DownloadOption[]
}

function buildGroups(gameId: string): AssetGroup[] {
  return [
    {
      key: 'icon',
      label: '앱 아이콘',
      desc: '600x600 저장',
      accept: 'image/png',
      maxCount: 1,
      storeWidth: 600, storeHeight: 600,
      prefix: `launch/${gameId}/icon/`,
      downloads: [
        { platform: '토스', width: 600, height: 600, mode: 'resize' },
        { platform: 'Google Play', width: 512, height: 512, mode: 'resize' },
      ],
    },
    {
      key: 'feature',
      label: '대표 이미지',
      desc: '1932x828 저장 (토스 기준)',
      accept: 'image/png,image/jpeg',
      maxCount: 1,
      storeWidth: 1932, storeHeight: 828,
      prefix: `launch/${gameId}/feature/`,
      downloads: [
        { platform: '토스', width: 1932, height: 828, mode: 'resize' },
        { platform: 'Google Play', width: 1024, height: 500, mode: 'crop' },
      ],
    },
    {
      key: 'screenshots',
      label: '스크린샷',
      desc: '636x1048 저장',
      accept: 'image/png,image/jpeg',
      maxCount: 8,
      storeWidth: 636, storeHeight: 1048,
      prefix: `launch/${gameId}/screenshots/`,
      downloads: [
        { platform: '토스', width: 636, height: 1048, mode: 'resize' },
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

function triggerDownload(blobUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}

// Download original file as-is
async function downloadOriginal(url: string, filename: string) {
  const res = await fetch(url)
  const data = await res.blob()
  triggerDownload(URL.createObjectURL(data), filename)
}

// Download resized version
async function downloadResized(url: string, filename: string, targetW: number, targetH: number) {
  const res = await fetch(url)
  const data = await res.blob()
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject()
    img.src = URL.createObjectURL(data)
  })
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, targetW, targetH)
  URL.revokeObjectURL(img.src)
  canvas.toBlob((blob) => {
    if (!blob) return
    const ext = filename.match(/\.\w+$/)?.[0] || '.png'
    const name = filename.replace(/\.\w+$/, '') + `_${targetW}x${targetH}${ext}`
    triggerDownload(URL.createObjectURL(blob), name)
  }, 'image/png', 0.95)
}

/* ── Group Component ── */

function LaunchGroup({ group, onBanner }: { group: AssetGroup; onBanner: Props['onBanner'] }) {
  const addRef = useRef<HTMLInputElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [downloadCropUrl, setDownloadCropUrl] = useState<{ url: string; filename: string; opt: DownloadOption } | null>(null)

  const refresh = useCallback(async () => {
    try { setBlobs(await listBlobs(group.prefix)) } catch { setBlobs([]) }
  }, [group.prefix])

  useEffect(() => { refresh() }, [refresh])

  const handleFileSelected = useCallback((files: File[]) => {
    if (blobs.length + files.length > group.maxCount) {
      onBanner('error', `최대 ${group.maxCount}개까지`)
      return
    }
    if (files[0]) setCropFile(files[0])
  }, [blobs.length, group.maxCount, onBanner])

  const handleCropped = useCallback(async (croppedFile: File) => {
    setCropFile(null)
    try {
      await uploadBlob(croppedFile, group.prefix)
      onBanner('success', '업로드 완료')
      refresh()
    } catch (err) {
      onBanner('error', `업로드 실패: ${(err as Error).message}`)
    }
  }, [group.prefix, onBanner, refresh])

  const handleDelete = useCallback(async (url: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      await deleteBlob(url)
      onBanner('success', '삭제 완료')
      refresh()
    } catch (err) {
      onBanner('error', `삭제 실패: ${(err as Error).message}`)
    }
  }, [onBanner, refresh])

  const handleDownload = useCallback((blob: BlobItem, opt: DownloadOption) => {
    const fname = getFilename(blob.pathname)
    if (opt.width === group.storeWidth && opt.height === group.storeHeight) {
      // Same size → download as-is
      downloadOriginal(blob.url, fname)
    } else if (opt.mode === 'resize') {
      // Auto resize
      downloadResized(blob.url, fname, opt.width, opt.height)
    } else {
      // Crop mode → open cropper for download
      setDownloadCropUrl({ url: blob.url, filename: fname, opt })
    }
  }, [group.storeWidth, group.storeHeight])

  return (
    <div className="card">
      <div className="category-header">
        <button className="category-toggle" onClick={() => setCollapsed(!collapsed)}>
          <span className={`sidebar-chevron${collapsed ? '' : ' open'}`}>&#9656;</span>
          <span className="card-title" style={{ marginBottom: 0 }}>{group.label}</span>
          <span className="spec-badge">{group.desc}</span>
          <span className="section-count">{blobs.length} / {group.maxCount}</span>
        </button>
        {blobs.length < group.maxCount && (
          <>
            <button className="category-add-btn"
              onClick={(e) => { e.stopPropagation(); addRef.current?.click() }}
              title="추가">+</button>
            <input ref={addRef} type="file" accept={group.accept}
              multiple={group.maxCount > 1} style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files) handleFileSelected(Array.from(e.target.files)); e.target.value = '' }} />
          </>
        )}
      </div>

      {!collapsed && (
        blobs.length === 0 ? (
          <div className="empty">업로드된 이미지가 없습니다</div>
        ) : (
          <div className="lp-cards">
            {blobs.map((b) => {
              const fname = getFilename(b.pathname)
              return (
                <div key={b.url} className="lp-card">
                  <div className="lp-card-preview">
                    <LazyImage src={b.url} alt={fname}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                  <div className="lp-card-body">
                    <div className="lp-card-info">
                      <span className="lp-card-name" title={fname}>{fname}</span>
                      <span className="lp-card-meta">{group.storeWidth}x{group.storeHeight} / {formatSize(b.size)}</span>
                    </div>
                    <div className="lp-card-downloads">
                      {group.downloads.map((opt) => (
                        <button key={opt.platform} className="lp-dl-btn"
                          onClick={() => handleDownload(b, opt)}
                          title={`${opt.platform} ${opt.width}x${opt.height}`}>
                          <span className="lp-dl-platform">{opt.platform}</span>
                          <span className="lp-dl-size">{opt.width}x{opt.height}</span>
                          {opt.mode === 'crop' && <span className="lp-dl-crop">위치 조정</span>}
                        </button>
                      ))}
                    </div>
                    <button className="lp-delete-btn" onClick={() => handleDelete(b.url)} title="삭제">삭제</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {cropFile && (
        <ImageCropper
          file={cropFile}
          targetWidth={group.storeWidth}
          targetHeight={group.storeHeight}
          onCropped={handleCropped}
          onCancel={() => setCropFile(null)}
        />
      )}

      {downloadCropUrl && (
        <DownloadCropper
          imageUrl={downloadCropUrl.url}
          sourceWidth={group.storeWidth}
          sourceHeight={group.storeHeight}
          targetWidth={downloadCropUrl.opt.width}
          targetHeight={downloadCropUrl.opt.height}
          filename={downloadCropUrl.filename}
          onDone={() => setDownloadCropUrl(null)}
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
      <p className="page-subtitle">{gameName} — 이미지 하나로 관리, 플랫폼별 다운로드</p>
      <div className="lp-info">
        원본 이미지를 하나 올리고, 다운로드 버튼으로 각 플랫폼에 맞는 크기로 받으세요.
      </div>
      {groups.map((g) => <LaunchGroup key={g.key} group={g} onBanner={onBanner} />)}
    </div>
  )
}
