import type { LayoutElement } from './layout-types'
import { DEFAULT_LAYOUTS } from './default-layouts'

const BLOB_BASE = 'https://hhgnhfkftrktusxf.public.blob.vercel-storage.com'
const layoutCache = new Map<string, LayoutElement[]>()

/**
 * Fetch layout JSON. Tries in order:
 * 1. Local static file (public/layout/{screen}.json) — works in dev & prod
 * 2. Vercel Blob — remote storage
 * 3. Built-in defaults — hardcoded fallback
 */
export async function loadLayout(gameId: string, screen: string): Promise<LayoutElement[]> {
  const cacheKey = `${gameId}/${screen}`
  if (layoutCache.has(cacheKey)) return layoutCache.get(cacheKey)!

  // Try local static file first
  try {
    const base = import.meta.env.BASE_URL || '/'
    const localUrl = `${base}layout/${screen}.json`
    const res = await fetch(localUrl)
    if (res.ok) {
      const layout = await res.json()
      const elements: LayoutElement[] = layout.elements || []
      layoutCache.set(cacheKey, elements)
      return elements
    }
  } catch { /* try blob */ }

  // Try blob
  try {
    const url = `${BLOB_BASE}/${gameId}/layout/${screen}.json`
    const res = await fetch(url)
    if (res.ok) {
      const layout = await res.json()
      const elements: LayoutElement[] = layout.elements || []
      layoutCache.set(cacheKey, elements)
      return elements
    }
  } catch { /* fallback to defaults */ }

  const defaults = DEFAULT_LAYOUTS[screen]?.elements || []
  layoutCache.set(cacheKey, defaults)
  return defaults
}

/** Clear cache */
export function clearLayoutCache() {
  layoutCache.clear()
}
