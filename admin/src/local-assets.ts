export interface LocalAsset {
  path: string
  category: string
  filename: string
}

export const LOCAL_ASSETS: LocalAsset[] = [
  // character
  { path: 'character/rabbit.png', category: 'character', filename: 'rabbit.png' },
  { path: 'character/rabbit-front.png', category: 'character', filename: 'rabbit-front.png' },
  { path: 'character/rabbit-back.png', category: 'character', filename: 'rabbit-back.png' },
  { path: 'character/rabbit-side.png', category: 'character', filename: 'rabbit-side.png' },
  // map
  { path: 'map/straight.png', category: 'map', filename: 'straight.png' },
  { path: 'map/corner-tl.png', category: 'map', filename: 'corner-tl.png' },
  { path: 'map/corner-tr.png', category: 'map', filename: 'corner-tr.png' },
  { path: 'map/corner-bl.png', category: 'map', filename: 'corner-bl.png' },
  { path: 'map/corner-br.png', category: 'map', filename: 'corner-br.png' },
  { path: 'map/bg-tile.png', category: 'map', filename: 'bg-tile.png' },
  // obstacles
  { path: 'obstacles/building1.png', category: 'obstacles', filename: 'building1.png' },
  { path: 'obstacles/building2.png', category: 'obstacles', filename: 'building2.png' },
  { path: 'obstacles/building3.png', category: 'obstacles', filename: 'building3.png' },
  { path: 'obstacles/building4.png', category: 'obstacles', filename: 'building4.png' },
  { path: 'obstacles/building5.png', category: 'obstacles', filename: 'building5.png' },
  { path: 'obstacles/building6.png', category: 'obstacles', filename: 'building6.png' },
  // ui
  { path: 'ui/btn-forward.png', category: 'ui', filename: 'btn-forward.png' },
  { path: 'ui/btn-switch.png', category: 'ui', filename: 'btn-switch.png' },
  { path: 'ui/btn-pause.png', category: 'ui', filename: 'btn-pause.png' },
  { path: 'ui/gauge-full.png', category: 'ui', filename: 'gauge-full.png' },
  { path: 'ui/gauge-empty.png', category: 'ui', filename: 'gauge-empty.png' },
  // audio
  { path: 'audio/bgm/gameplay.mp3', category: 'audio', filename: 'gameplay.mp3' },
  { path: 'audio/bgm/menu.mp3', category: 'audio', filename: 'menu.mp3' },
  { path: 'audio/sfx/click.ogg', category: 'audio', filename: 'click.ogg' },
  { path: 'audio/sfx/combo.ogg', category: 'audio', filename: 'combo.ogg' },
  { path: 'audio/sfx/crash.ogg', category: 'audio', filename: 'crash.ogg' },
  { path: 'audio/sfx/forward.ogg', category: 'audio', filename: 'forward.ogg' },
  { path: 'audio/sfx/game-over.ogg', category: 'audio', filename: 'game-over.ogg' },
  { path: 'audio/sfx/switch.ogg', category: 'audio', filename: 'switch.ogg' },
  { path: 'audio/sfx/time-bonus.ogg', category: 'audio', filename: 'time-bonus.ogg' },
  { path: 'audio/sfx/timer-warning.ogg', category: 'audio', filename: 'timer-warning.ogg' },
]

export function getLocalAssetUrl(path: string): string {
  return `/game-assets/${path}`
}

export function getLocalAssetsByCategory(category: string): LocalAsset[] {
  return LOCAL_ASSETS.filter((a) => a.category === category)
}
