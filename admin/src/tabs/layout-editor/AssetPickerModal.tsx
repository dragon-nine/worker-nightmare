import { useState, useEffect } from 'react'
import { listFolder } from '../../api'
import type { BlobItem } from '../../types'
import { R2_ASSET_PREFIX } from './constants'

const R2_PUBLIC = 'https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (assetKey: string, url: string) => void
}

export default function AssetPickerModal({ open, onClose, onSelect }: Props) {
  const [prefix, setPrefix] = useState(R2_ASSET_PREFIX)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listFolder(prefix)
      .then((data) => { setBlobs(data.blobs); setFolders(data.folders) })
      .catch(() => { setBlobs([]); setFolders([]) })
      .finally(() => setLoading(false))
  }, [prefix, open])

  if (!open) return null

  const imageBlobs = blobs.filter((b) => /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(b.pathname))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: 640, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>에셋 선택</h3>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{prefix}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {/* Breadcrumb */}
        <div style={{ padding: '8px 20px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {prefix !== R2_ASSET_PREFIX && (
            <button
              onClick={() => {
                const parts = prefix.replace(/\/$/, '').split('/')
                parts.pop()
                setPrefix(parts.join('/') + '/')
              }}
              style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #ddd', background: '#f5f5f5', fontSize: 12, cursor: 'pointer' }}
            >
              ← 상위 폴더
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '8px 20px 20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>로딩 중...</div>
          ) : (
            <>
              {/* Folders */}
              {folders.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
                  {folders.map((f) => (
                    <div
                      key={f}
                      onClick={() => setPrefix(f)}
                      style={{
                        padding: '12px 8px', borderRadius: 8, border: '1px solid #eee',
                        textAlign: 'center', cursor: 'pointer', fontSize: 12, color: '#555',
                      }}
                    >
                      📁 {f.replace(prefix, '').replace(/\/$/, '')}
                    </div>
                  ))}
                </div>
              )}

              {/* Images */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                {imageBlobs.map((b) => (
                  <div
                    key={b.pathname}
                    onClick={() => onSelect(b.pathname, `${R2_PUBLIC}/${b.pathname}`)}
                    style={{
                      borderRadius: 8, border: '1px solid #eee', overflow: 'hidden',
                      cursor: 'pointer', background: '#f5f5f5',
                    }}
                  >
                    <img
                      src={`${R2_PUBLIC}/${b.pathname}`}
                      alt={b.pathname}
                      style={{ width: '100%', height: 80, objectFit: 'contain' }}
                      loading="lazy"
                    />
                    <div style={{ padding: '4px 6px', fontSize: 10, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.pathname.split('/').pop()}
                    </div>
                  </div>
                ))}
              </div>

              {imageBlobs.length === 0 && folders.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#bbb', fontSize: 13 }}>이미지가 없습니다.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
