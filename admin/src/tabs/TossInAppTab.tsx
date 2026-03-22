import { useState, useEffect, useCallback, useRef } from 'react'
import type { BlobItem } from '../types'
import { listBlobs, uploadBlob, deleteBlob } from '../api'
import AssetCard from '../components/AssetCard'
import ImageCropper from '../components/ImageCropper'

interface Spec {
  key: string
  label: string
  desc: string
  accept: string
  prefix: string
  maxCount: number
  width: number
  height: number
}

function buildSpecs(gameId: string): Spec[] {
  return [
    { key: 'icon', label: '앱 로고', desc: '600x600 PNG', accept: 'image/png', prefix: `store/${gameId}/toss/icon/`, maxCount: 1, width: 600, height: 600 },
    { key: 'thumbnail', label: '가로형 썸네일', desc: '1932x828 JPEG/PNG', accept: 'image/png,image/jpeg', prefix: `store/${gameId}/toss/thumbnail/`, maxCount: 1, width: 1932, height: 828 },
    { key: 'screenshots', label: '미리보기 및 스크린샷', desc: '636x1048 / 최소 3장', accept: 'image/png,image/jpeg', prefix: `store/${gameId}/toss/screenshots/`, maxCount: 8, width: 636, height: 1048 },
  ]
}

interface Props {
  gameId: string
  gameName: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

function StoreCategory({ spec, onBanner }: { spec: Spec; onBanner: Props['onBanner'] }) {
  const addRef = useRef<HTMLInputElement>(null)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)

  const refresh = useCallback(async () => {
    try { setBlobs(await listBlobs(spec.prefix)) } catch { /* local */ }
  }, [spec.prefix])

  useEffect(() => { refresh() }, [refresh])

  const doUpload = useCallback(async (file: File) => {
    try {
      await uploadBlob(file, spec.prefix)
      onBanner('success', '업로드 완료')
      refresh()
    } catch (err) {
      onBanner('error', `업로드 실패: ${(err as Error).message}`)
    }
  }, [spec.prefix, onBanner, refresh])

  const handleFileSelected = useCallback((files: File[]) => {
    if (blobs.length + files.length > spec.maxCount) {
      onBanner('error', `최대 ${spec.maxCount}개까지 (현재 ${blobs.length}개)`)
      return
    }
    if (files[0]) setCropFile(files[0])
  }, [blobs.length, spec.maxCount, onBanner])

  const handleCropped = useCallback(async (croppedFile: File) => {
    setCropFile(null)
    await doUpload(croppedFile)
  }, [doUpload])

  const handleDelete = useCallback(async (url: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    try { await deleteBlob(url); onBanner('success', '삭제 완료'); refresh() }
    catch (err) { onBanner('error', `삭제 실패: ${(err as Error).message}`) }
  }, [onBanner, refresh])

  return (
    <div className="card">
      <div className="category-header">
        <button className="category-toggle" onClick={() => setCollapsed(!collapsed)}>
          <span className={`sidebar-chevron${collapsed ? '' : ' open'}`}>&#9656;</span>
          <span className="card-title" style={{ marginBottom: 0 }}>{spec.label}</span>
          <span className="spec-badge">{spec.desc}</span>
          <span className="section-count">{blobs.length} / {spec.maxCount}</span>
        </button>
        {blobs.length < spec.maxCount && (
          <>
            <button className="category-add-btn" onClick={(e) => { e.stopPropagation(); addRef.current?.click() }} title="추가">+</button>
            <input ref={addRef} type="file" accept={spec.accept} multiple={spec.maxCount > 1} style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files) handleFileSelected(Array.from(e.target.files)); e.target.value = '' }} />
          </>
        )}
      </div>
      {!collapsed && (
        blobs.length === 0 ? (
          <div className="empty">업로드된 파일이 없습니다</div>
        ) : (
          <div className="asset-grid">
            {blobs.map((b) => (
              <AssetCard key={b.url} blob={b} onDelete={handleDelete}
                onReplace={async (file) => {
                  setCropFile(file)
                }}
              />
            ))}
          </div>
        )
      )}
      {cropFile && (
        <ImageCropper
          file={cropFile}
          targetWidth={spec.width}
          targetHeight={spec.height}
          onCropped={handleCropped}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  )
}

export default function TossInAppTab({ gameId, gameName, onBanner }: Props) {
  const specs = buildSpecs(gameId)
  return (
    <div>
      <h1 className="page-title">토스 인앱 스토어</h1>
      <p className="page-subtitle">{gameName} — 스토어 등록 필수 이미지</p>
      {specs.map((s) => <StoreCategory key={s.key} spec={s} onBanner={onBanner} />)}
    </div>
  )
}
