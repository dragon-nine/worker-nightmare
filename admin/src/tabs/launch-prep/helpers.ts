export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function getFilename(pathname: string): string {
  return pathname.split('/').pop() || pathname
}

export function triggerDownload(blobUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}

// Download original file as-is
export async function downloadOriginal(url: string, filename: string) {
  const res = await fetch(url)
  const data = await res.blob()
  triggerDownload(URL.createObjectURL(data), filename)
}

// Download resized version
export async function downloadResized(url: string, filename: string, targetW: number, targetH: number) {
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
