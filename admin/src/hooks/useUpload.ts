import { useState, useCallback } from 'react'
import { uploadBlob } from '../api'
import type { BlobItem } from '../types'

type BannerFn = (type: 'success' | 'error', message: string) => void

/**
 * Single-file upload: manages a boolean `uploading` state.
 * Returns the uploaded BlobItem on success, or null on failure.
 */
export function useUpload(onBanner: BannerFn) {
  const [uploading, setUploading] = useState(false)

  const upload = useCallback(async (
    file: File,
    prefix: string,
    filename?: string,
    errorLabel = '업로드',
  ): Promise<BlobItem | null> => {
    setUploading(true)
    try {
      const blob = await uploadBlob(file, prefix, filename)
      return blob
    } catch (err) {
      onBanner('error', `${errorLabel} 실패: ${(err as Error).message}`)
      return null
    } finally {
      setUploading(false)
    }
  }, [onBanner])

  return { uploading, upload } as const
}

/**
 * Multi-file upload: manages an array of uploading file names.
 * Stops on first error (early return).
 * Returns true if all files uploaded successfully, false otherwise.
 */
export function useBatchUpload(onBanner: BannerFn) {
  const [uploading, setUploading] = useState<string[]>([])

  const uploadAll = useCallback(async (
    files: File[],
    prefix: string,
  ): Promise<boolean> => {
    const names = files.map((f) => f.name)
    setUploading(names)
    for (const file of files) {
      try {
        await uploadBlob(file, prefix)
      } catch (err) {
        onBanner('error', `"${file.name}" 업로드 실패: ${(err as Error).message}`)
        setUploading([])
        return false
      }
    }
    setUploading([])
    onBanner('success', `${files.length}개 파일 업로드 완료`)
    return true
  }, [onBanner])

  return { uploading, uploadAll } as const
}
