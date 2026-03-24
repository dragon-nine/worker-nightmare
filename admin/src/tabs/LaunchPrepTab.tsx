import { useState, useCallback, useRef } from 'react'
import type { BlobItem } from '../types'
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
  exactOnly?: boolean  // true면 정확한 크기만 허용, 크로퍼 없이 바로 업로드
  fileBaseName: string  // 저장/다운로드 시 사용할 영문 파일명 (확장자 제외)
}

function buildGroups(gameId: string): AssetGroup[] {
  return [
    {
      key: 'icon',
      label: '앱 아이콘',
      fileBaseName: 'app_icon',
      desc: '600x600',
      accept: 'image/png',
      maxCount: 1,
      storeWidth: 600, storeHeight: 600,
      exactOnly: true,
      prefix: `launch/${gameId}/icon/`,
      downloads: [
        { platform: '토스', width: 600, height: 600, mode: 'resize' },
        { platform: 'Google Play', width: 512, height: 512, mode: 'resize' },
      ],
    },
    {
      key: 'feature',
      label: '대표 이미지',
      fileBaseName: 'feature_image',
      desc: '1932x828',
      accept: 'image/png,image/jpeg',
      maxCount: 1,
      storeWidth: 1932, storeHeight: 828,
      exactOnly: true,
      prefix: `launch/${gameId}/feature/`,
      downloads: [
        { platform: '토스', width: 1932, height: 828, mode: 'resize' },
        { platform: 'Google Play', width: 1024, height: 500, mode: 'resize' },
      ],
    },
    {
      key: 'screenshots',
      label: '스크린샷',
      fileBaseName: 'screenshot',
      desc: '636x1048',
      accept: 'image/png,image/jpeg',
      maxCount: 8,
      storeWidth: 636, storeHeight: 1048,
      prefix: `launch/${gameId}/screenshots/`,
      downloads: [],
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
    triggerDownload(URL.createObjectURL(blob), filename)
  }, 'image/png', 0.95)
}

/* ── Group Component ── */

function LaunchGroup({ group, onBanner }: { group: AssetGroup; onBanner: Props['onBanner'] }) {
  const addRef = useRef<HTMLInputElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [cacheBust, setCacheBust] = useState(0)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [downloadCropUrl, setDownloadCropUrl] = useState<{ url: string; filename: string; opt: DownloadOption } | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  // 로컬 메모리에 이미지 추가
  const addLocalBlob = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const item: BlobItem = {
      url,
      pathname: `${group.prefix}${file.name}`,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }
    setBlobs(prev => [...prev, item])
    setCacheBust(Date.now())
  }, [group.prefix])

  const handleFileSelected = useCallback((files: File[]) => {
    if (blobs.length + files.length > group.maxCount) {
      onBanner('error', `최대 ${group.maxCount}개까지`)
      return
    }
    const file = files[0]
    if (!file) return

    if (group.exactOnly) {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        if (img.naturalWidth !== group.storeWidth || img.naturalHeight !== group.storeHeight) {
          onBanner('error', `${group.storeWidth}x${group.storeHeight} 이미지만 업로드 가능합니다 (현재: ${img.naturalWidth}x${img.naturalHeight})`)
          return
        }
        const ext = file.name.match(/\.\w+$/)?.[0] || '.png'
        const renamed = new File([file], `${group.fileBaseName}${ext}`, { type: file.type })
        // exactOnly는 1개만 — 기존 것 교체
        setBlobs([])
        addLocalBlob(renamed)
        onBanner('success', '추가 완료')
      }
      img.src = URL.createObjectURL(file)
    } else {
      setCropFile(file)
    }
  }, [blobs, group.maxCount, group.exactOnly, group.storeWidth, group.storeHeight, group.fileBaseName, onBanner, addLocalBlob])

  const handleCropped = useCallback((croppedFile: File) => {
    setCropFile(null)
    const ext = croppedFile.name.match(/\.\w+$/)?.[0] || '.png'
    const num = String(blobs.length + 1).padStart(2, '0')
    const named = new File([croppedFile], `${group.fileBaseName}_${num}${ext}`, { type: croppedFile.type })
    addLocalBlob(named)
    onBanner('success', '추가 완료')
  }, [blobs.length, group.fileBaseName, onBanner, addLocalBlob])

  const handleDelete = useCallback((url: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    URL.revokeObjectURL(url)
    setBlobs(prev => prev.filter(b => b.url !== url))
    onBanner('success', '삭제 완료')
  }, [onBanner])

  const handleDownload = useCallback(async (blob: BlobItem, opt: DownloadOption) => {
    const key = `${blob.url}-${opt.platform}`
    if (downloading) return
    setDownloading(key)
    try {
      const origName = getFilename(blob.pathname)
      const ext = origName.match(/\.\w+$/)?.[0] || '.png'
      const platformTag = opt.platform === '토스' ? 'toss' : 'google_play'
      const dlName = `${group.fileBaseName}_${platformTag}${ext}`
      if (opt.width === group.storeWidth && opt.height === group.storeHeight) {
        await downloadOriginal(blob.url, dlName)
      } else if (opt.mode === 'resize') {
        await downloadResized(blob.url, dlName, opt.width, opt.height)
      } else {
        setDownloadCropUrl({ url: blob.url, filename: dlName, opt })
      }
    } finally {
      setDownloading(null)
    }
  }, [group.storeWidth, group.storeHeight, group.fileBaseName, downloading])

  const handleDownloadOriginal = useCallback(async (blob: BlobItem) => {
    const key = `${blob.url}-original`
    if (downloading) return
    setDownloading(key)
    try {
      const fname = getFilename(blob.pathname)
      await downloadOriginal(blob.url, fname)
    } finally {
      setDownloading(null)
    }
  }, [downloading])

  return (
    <div className="card">
      <div className="category-header">
        <button className="category-toggle" onClick={() => setCollapsed(!collapsed)}>
          <span className={`sidebar-chevron${collapsed ? '' : ' open'}`}>&#9656;</span>
          <span className="card-title" style={{ marginBottom: 0 }}>{group.label}</span>
          {group.desc && <span className="spec-badge">{group.desc}</span>}
          {!group.exactOnly && <span className="section-count">{blobs.length} / {group.maxCount}</span>}
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
                    <LazyImage src={`${b.url}?v=${cacheBust}`} alt={fname}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    <button className="lp-delete-corner" onClick={() => handleDelete(b.url)} title="삭제">&times;</button>
                  </div>
                  <div className="lp-card-body">
                    {!group.exactOnly && (
                      <div className="lp-card-info">
                        <span className="lp-card-name" title={fname}>{fname}</span>
                        <span className="lp-card-meta">{group.storeWidth}x{group.storeHeight} / {formatSize(b.size)}</span>
                      </div>
                    )}
                    <div className="lp-card-downloads">
                      {group.downloads.length > 0 ? group.downloads.map((opt) => {
                        const dlKey = `${b.url}-${opt.platform}`
                        const isBusy = downloading === dlKey
                        return (
                          <button key={opt.platform} className="lp-dl-btn"
                            onClick={() => handleDownload(b, opt)}
                            title={`${opt.platform} ${opt.width}x${opt.height}`}
                            disabled={!!downloading}>
                            <span className="lp-dl-platform">{isBusy ? '...' : opt.platform}</span>
                            <span className="lp-dl-size">{opt.width}x{opt.height}</span>
                            {opt.mode === 'crop' && <span className="lp-dl-crop">위치 조정</span>}
                          </button>
                        )
                      }) : (
                        <button className="lp-dl-btn"
                          onClick={() => handleDownloadOriginal(b)}
                          title="다운로드"
                          disabled={!!downloading}>
                          <span className="lp-dl-platform">{downloading === `${b.url}-original` ? '...' : '다운로드'}</span>
                        </button>
                      )}
                    </div>
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
      <div className="lp-row">
        <LaunchGroup group={groups[0]} onBanner={onBanner} />
        <LaunchGroup group={groups[1]} onBanner={onBanner} />
      </div>
      <LaunchGroup group={groups[2]} onBanner={onBanner} />
    </div>
  )
}
