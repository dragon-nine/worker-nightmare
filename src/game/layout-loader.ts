import type { LayoutElement } from './layout-types'
import { DEFAULT_LAYOUTS } from './default-layouts'

interface LoadedLayout {
  elements: LayoutElement[]
  groupVAlign: 'center' | 'top'
  padding: { top: number; right: number; bottom: number; left: number }
}

const layoutCache = new Map<string, LoadedLayout>()

interface RawLayout {
  elements?: LayoutElement[];
  groupVAlign?: string;
  padding?: { top: number; right: number; bottom: number; left: number };
}

const LAYOUT_JSON_PATHS: Record<string, string> = {
  'main-screen': 'layout/main-screen.json',
  'game-over': 'layout/game-over.json',
  'gameplay': 'layout/gameplay.json',
  'settings': 'layout/settings.json',
  'pause': 'layout/pause.json',
  'challenge': 'layout/challenge.json',
  'ad-remove': 'layout/ad-remove.json',
}

function parseLayout(data: RawLayout): LoadedLayout {
  return {
    elements: data.elements || [],
    groupVAlign: data.groupVAlign === 'top' ? 'top' : 'center',
    padding: data.padding || { top: 0, right: 0, bottom: 0, left: 0 },
  }
}

export async function loadLayoutFull(_gameId: string, screen: string): Promise<LoadedLayout> {
  if (layoutCache.has(screen)) return layoutCache.get(screen)!

  const jsonPath = LAYOUT_JSON_PATHS[screen]
  if (jsonPath) {
    try {
      const base = import.meta.env.BASE_URL || '/'
      const url = `${base}${jsonPath}`
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const loaded = parseLayout(await res.json() as RawLayout)
        layoutCache.set(screen, loaded)
        return loaded
      }
    } catch {
      // Fall through to hardcoded defaults when layout JSON is unavailable.
    }
  }

  const defaults = DEFAULT_LAYOUTS[screen]
  const loaded = parseLayout((defaults || {}) as RawLayout)
  layoutCache.set(screen, loaded)
  return loaded
}
