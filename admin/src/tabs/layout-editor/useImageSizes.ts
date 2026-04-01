/** 이미지 치수 추적/캐싱 훅 */

import { useState, useCallback } from 'react'

const R2_PUBLIC = 'https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev'

export type ImageSizeMap = Record<string, { w: number; h: number }>

export function useImageSizes() {
  const [imageSizes, setImageSizes] = useState<ImageSizeMap>({})

  /** 여러 이미지 요소의 치수를 한꺼번에 로드 */
  const loadImageSizes = useCallback(
    async (
      imageEls: { id: string; assetKey?: string }[],
      gameId: string,
      screenKey: string,
    ): Promise<ImageSizeMap> => {
      const sizes: ImageSizeMap = {}
      await Promise.all(
        imageEls.map(
          (el) =>
            new Promise<void>((resolve) => {
              const assetUrl = el.assetKey
                ? `${R2_PUBLIC}/${el.assetKey}`
                : `${R2_PUBLIC}/${gameId}/${screenKey}/${el.id}.png`
              const img = new Image()
              img.onload = () => {
                sizes[el.id] = { w: img.naturalWidth, h: img.naturalHeight }
                resolve()
              }
              img.onerror = () => resolve()
              img.src = assetUrl
            }),
        ),
      )
      return sizes
    },
    [],
  )

  /** 단일 이미지 로드 후 사이즈 기록 + 콜백 실행 */
  const loadSingleImageSize = useCallback(
    (id: string, url: string): Promise<{ w: number; h: number } | null> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const size = { w: img.naturalWidth, h: img.naturalHeight }
          setImageSizes((prev) => ({ ...prev, [id]: size }))
          resolve(size)
        }
        img.onerror = () => resolve(null)
        img.src = url
      })
    },
    [],
  )

  const resetImageSizes = useCallback((sizes: ImageSizeMap) => {
    setImageSizes(sizes)
  }, [])

  return { imageSizes, loadImageSizes, loadSingleImageSize, resetImageSizes }
}
