export interface CategoryDef {
  key: string
  label: string
  prefix: string
  accept: string
  darkBg?: boolean
}

export interface TabDef {
  id: string
  label: string
  categories: Omit<CategoryDef, 'prefix'>[]
}

export const TABS: TabDef[] = [
  {
    id: 'main',
    label: '메인',
    categories: [
      { key: 'main-screen', label: '홈 화면', accept: 'image/*', darkBg: true },
      { key: 'main-ui', label: '메인 UI', accept: 'image/*' },
    ],
  },
  {
    id: 'game',
    label: '게임',
    categories: [
      { key: 'character', label: '캐릭터', accept: 'image/*', darkBg: true },
      { key: 'map', label: '맵 타일', accept: 'image/*', darkBg: true },
      { key: 'background', label: '배경', accept: 'image/*', darkBg: true },
      { key: 'ui', label: '게임 UI', accept: 'image/*' },
    ],
  },
  {
    id: 'etc',
    label: '기타',
    categories: [
      { key: 'etc-image', label: '기타', accept: 'image/*', darkBg: true },
      { key: 'audio', label: '오디오', accept: 'audio/*' },
    ],
  },
  {
    id: 'launch',
    label: '출시',
    categories: [],
  },
]

export function buildCategories(gameId: string, tab: TabDef): CategoryDef[] {
  return tab.categories.map((c) => ({
    ...c,
    prefix: c.key.startsWith('launch/') ? `${c.key.replace('launch/', `launch/${gameId}/`)}/` : `${gameId}/${c.key}/`,
  }))
}
