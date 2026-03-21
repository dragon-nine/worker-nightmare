import { useState, useEffect, useCallback, useRef } from 'react'
import type { BlobItem } from '../types'
import { listBlobs, uploadBlob, deleteBlob } from '../api'
import AssetCard from '../components/AssetCard'

interface Spec {
  key: string
  label: string
  desc: string
  accept: string
  prefix: string
  maxCount: number
}

function buildSpecs(gameId: string): Spec[] {
  return [
    { key: 'icon', label: '앱 아이콘', desc: '512x512 PNG', accept: 'image/png', prefix: `store/${gameId}/google-play/icon/`, maxCount: 1 },
    { key: 'feature', label: '피처 그래픽', desc: '1024x500 JPEG/PNG', accept: 'image/png,image/jpeg', prefix: `store/${gameId}/google-play/feature/`, maxCount: 1 },
    { key: 'phone', label: '폰 스크린샷', desc: '2~8장', accept: 'image/png,image/jpeg', prefix: `store/${gameId}/google-play/phone/`, maxCount: 8 },
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

  const refresh = useCallback(async () => {
    try { setBlobs(await listBlobs(spec.prefix)) } catch { /* local */ }
  }, [spec.prefix])

  useEffect(() => { refresh() }, [refresh])

  const handleUpload = useCallback(async (files: File[]) => {
    if (blobs.length + files.length > spec.maxCount) {
      onBanner('error', `최대 ${spec.maxCount}개까지 (현재 ${blobs.length}개)`)
      return
    }
    for (const file of files) {
      try { await uploadBlob(file, spec.prefix) }
      catch (err) { onBanner('error', `업로드 실패: ${(err as Error).message}`); return }
    }
    onBanner('success', `${files.length}개 파일 업로드 완료`)
    refresh()
  }, [blobs.length, spec, onBanner, refresh])

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
              onChange={(e) => { if (e.target.files) handleUpload(Array.from(e.target.files)); e.target.value = '' }} />
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
                onReplace={async (file, pathname) => {
                  const pfx = pathname.substring(0, pathname.lastIndexOf('/') + 1)
                  try { await uploadBlob(file, pfx); onBanner('success', '교체 완료'); refresh() }
                  catch (err) { onBanner('error', `교체 실패: ${(err as Error).message}`) }
                }}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}

export default function GooglePlayTab({ gameId, gameName, onBanner }: Props) {
  const specs = buildSpecs(gameId)
  return (
    <div>
      <h1 className="page-title">Google Play 스토어</h1>
      <p className="page-subtitle">{gameName} — 스토어 등록 필수 이미지</p>
      {specs.map((s) => <StoreCategory key={s.key} spec={s} onBanner={onBanner} />)}
    </div>
  )
}
