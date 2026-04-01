import type { LayoutElement } from './layout-types'
import { DEFAULT_LAYOUTS } from './default-layouts'

// Vite JSON import — 빌드 시 인라인됨 (배포 환경에서도 확실히 동작)
import mainScreenLayout from '../../public/layout/main-screen.json'
import gameOverLayout from '../../public/layout/game-over.json'
import gameplayLayout from '../../public/layout/gameplay.json'
import settingsLayout from '../../public/layout/settings.json'
import pauseLayout from '../../public/layout/pause.json'
import challengeLayout from '../../public/layout/challenge.json'
import adRemoveLayout from '../../public/layout/ad-remove.json'

const BUNDLED_LAYOUTS: Record<string, unknown> = {
  'main-screen': mainScreenLayout,
  'game-over': gameOverLayout,
  'gameplay': gameplayLayout,
  'settings': settingsLayout,
  'pause': pauseLayout,
  'challenge': challengeLayout,
  'ad-remove': adRemoveLayout,
}

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

function parseLayout(data: RawLayout): LoadedLayout {
  return {
    elements: data.elements || [],
    groupVAlign: data.groupVAlign === 'top' ? 'top' : 'center',
    padding: data.padding || { top: 0, right: 0, bottom: 0, left: 0 },
  }
}

export async function loadLayoutFull(_gameId: string, screen: string): Promise<LoadedLayout> {
  if (layoutCache.has(screen)) return layoutCache.get(screen)!

  // 1. 번들된 JSON (public/layout/*.json → import)
  const bundled = BUNDLED_LAYOUTS[screen]
  if (bundled) {
    const loaded = parseLayout(bundled as RawLayout)
    layoutCache.set(screen, loaded)
    return loaded
  }

  // 2. 하드코딩 기본값
  const defaults = DEFAULT_LAYOUTS[screen]
  const loaded = parseLayout((defaults || {}) as RawLayout)
  layoutCache.set(screen, loaded)
  return loaded
}

