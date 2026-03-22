import { useState, useEffect, useRef } from 'react'
import type { BlobItem } from '../types'
import LazyImage from './LazyImage'

interface Props {
  blob: BlobItem
  onDelete: (url: string) => void
  onReplace?: (file: File, pathname: string) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getFilename(pathname: string): string {
  return pathname.split('/').pop() || pathname
}

function isAudio(pathname: string): boolean {
  return /\.(mp3|ogg|wav|m4a)$/i.test(pathname)
}

export default function AssetCard({ blob, onDelete, onReplace }: Props) {
  const [dims, setDims] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const audio = isAudio(blob.pathname)
  const filename = getFilename(blob.pathname)
  const cacheBust = blob.uploadedAt ? `?t=${new Date(blob.uploadedAt).getTime()}` : ''
  const imgUrl = blob.url + cacheBust

  useEffect(() => {
    if (audio) return
    const img = new Image()
    img.onload = () => setDims(`${img.naturalWidth}x${img.naturalHeight}`)
    img.src = imgUrl
  }, [imgUrl, audio])

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`"${filename}" 삭제하시겠습니까?`)) {
      onDelete(blob.url)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onReplace) return
    onReplace(file, blob.pathname)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={`asset-card${onReplace ? ' clickable' : ''}`} onClick={() => onReplace && fileRef.current?.click()}>
      <div className={`asset-card-preview${audio ? ' audio' : ''}`}>
        {audio ? (
          <span>&#9835;</span>
        ) : (
          <LazyImage src={imgUrl} alt={filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
        {onReplace && <div className="asset-card-overlay">클릭하여 교체</div>}
      </div>
      {onReplace && <input ref={fileRef} type="file" accept="image/*,audio/*" style={{ display: 'none' }} onChange={handleFile} />}
      <div className="asset-card-info">
        <div className="asset-card-name" title={filename}>{filename}</div>
        <div className="asset-card-meta">
          <span>{dims ? `${dims} / ` : ''}{formatSize(blob.size)}</span>
          <button className="asset-card-delete" onClick={handleDelete} title="삭제">&#x2715;</button>
        </div>
      </div>
    </div>
  )
}
