import type { ReactNode } from 'react'
import {
  Image, FileText, FileSpreadsheet, FileIcon,
  Film, Music, Archive, Paperclip, Presentation,
} from 'lucide-react'
import { createElement } from 'react'
import type { BlobItem } from '../../types'

export type FileCategory = 'image' | 'document' | 'media' | 'archive' | 'other'

const IC = 16

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function getFilename(pathname: string): string {
  return pathname.split('/').pop() || pathname
}

export function getFolderName(folderPath: string): string {
  const parts = folderPath.replace(/\/$/, '').split('/')
  return parts[parts.length - 1]
}

export function getFileIcon(name: string): ReactNode {
  if (/\.(xlsx?|csv)$/i.test(name)) return createElement(FileSpreadsheet, { size: 32 })
  if (/\.(docx?|txt|hwp)$/i.test(name)) return createElement(FileText, { size: 32 })
  if (/\.(pptx?|key)$/i.test(name)) return createElement(Presentation, { size: 32 })
  if (/\.(pdf)$/i.test(name)) return createElement(FileText, { size: 32 })
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return createElement(Image, { size: 32 })
  if (/\.(mp3|ogg|wav|m4a)$/i.test(name)) return createElement(Music, { size: 32 })
  if (/\.(mp4|mov|avi|webm)$/i.test(name)) return createElement(Film, { size: 32 })
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return createElement(Archive, { size: 32 })
  return createElement(FileIcon, { size: 32 })
}

export function isImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name)
}

export function getFileCategory(name: string): FileCategory {
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return 'image'
  if (/\.(xlsx?|csv|docx?|txt|pptx?|key|pdf|hwp)$/i.test(name)) return 'document'
  if (/\.(mp3|ogg|wav|m4a|mp4|mov|avi|webm)$/i.test(name)) return 'media'
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return 'archive'
  return 'other'
}

export const CATEGORY_META: Record<FileCategory, { label: string; icon: ReactNode }> = {
  image: { label: '이미지', icon: createElement(Image, { size: IC }) },
  document: { label: '문서', icon: createElement(FileText, { size: IC }) },
  media: { label: '미디어', icon: createElement(Music, { size: IC }) },
  archive: { label: '압축 파일', icon: createElement(Archive, { size: IC }) },
  other: { label: '기타', icon: createElement(Paperclip, { size: IC }) },
}

const CATEGORY_ORDER: FileCategory[] = ['image', 'document', 'media', 'archive', 'other']

export function groupByCategory(blobs: BlobItem[]): { category: FileCategory; items: BlobItem[] }[] {
  const map = new Map<FileCategory, BlobItem[]>()
  for (const b of blobs) {
    const name = getFilename(b.pathname)
    if (name === '.folder') continue
    const cat = getFileCategory(name)
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(b)
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }))
}

export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}

export function getBreadcrumbs(currentPath: string, root: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [{ label: '공유 파일', path: root }]
  if (currentPath === root) return crumbs

  const relative = currentPath.slice(root.length)
  const parts = relative.replace(/\/$/, '').split('/')
  let accumulated = root
  for (const part of parts) {
    accumulated += part + '/'
    crumbs.push({ label: part, path: accumulated })
  }
  return crumbs
}

export function cacheBustUrl(b: BlobItem): string {
  if (!b.uploadedAt) return b.url
  const sep = b.url.includes('?') ? '&' : '?'
  return b.url + sep + 't=' + new Date(b.uploadedAt).getTime()
}
