import { useState, useRef } from 'react'
import { useUpload } from '../../hooks/useUpload'
import { getLocalAssetUrl } from '../../local-assets'
import { isAudio } from './helpers'

interface Props {
  asset: { path: string; filename: string }
  darkBg?: boolean
  prefix: string
  onBanner: (type: 'success' | 'error', message: string) => void
  onReplaced: () => void
}

export default function LocalAssetCard({ asset, darkBg, prefix, onBanner, onReplaced }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dims, setDims] = useState('')
  const { uploading: replacing, upload } = useUpload(onBanner)
  const url = getLocalAssetUrl(asset.path)
  const audio = isAudio(asset.filename)

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await upload(file, prefix, undefined, `"${asset.filename}" 교체`)
    if (result) {
      onBanner('success', `"${asset.filename}" 교체 업로드 완료`)
      onReplaced()
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={`asset-card clickable${replacing ? ' busy' : ''}`} onClick={() => !replacing && fileRef.current?.click()}>
      <div className={`asset-card-preview${darkBg ? ' dark-bg' : ''}${audio ? ' audio' : ''}`}>
        {audio ? (
          <span>&#9835;</span>
        ) : (
          <img
            src={url}
            alt={asset.filename}
            loading="lazy"
            onLoad={(e) => {
              const img = e.currentTarget
              setDims(`${img.naturalWidth}x${img.naturalHeight}`)
            }}
          />
        )}
        {replacing && <div className="asset-card-overlay busy-overlay"><div className="upload-spinner" />교체 중...</div>}
        {!replacing && <div className="asset-card-overlay">클릭하여 교체</div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*,audio/*" style={{ display: 'none' }} onChange={handleReplace} />
      <div className="asset-card-info">
        <div className="asset-card-name" title={asset.path}>{asset.filename}</div>
        <div className="asset-card-meta">
          <span>{dims || ''}</span>
        </div>
      </div>
    </div>
  )
}
