import { useState } from 'react'
import type { PageId } from '../App'

interface NavItem {
  id: PageId
  icon: string
  label: string
}

interface GameSection {
  key: string
  title: string
  gameUrl: string
  items: NavItem[]
}

const GAMES: GameSection[] = [
  {
    key: 'game01',
    title: 'game01 - 직장인 잔혹시',
    gameUrl: '/game01/',
    items: [
      { id: 'game01-assets', icon: '🎨', label: '에셋 관리' },
      { id: 'game01-preview', icon: '👁', label: '에셋 프리뷰' },
      { id: 'game01-google-play', icon: '▶', label: 'Google Play' },
      { id: 'game01-toss', icon: '💙', label: '토스 인앱' },
    ],
  },
  {
    key: 'game02',
    title: 'game02 - (준비중)',
    gameUrl: '/game02/',
    items: [
      { id: 'game02-assets', icon: '🎨', label: '에셋 관리' },
      { id: 'game02-preview', icon: '👁', label: '에셋 프리뷰' },
      { id: 'game02-google-play', icon: '▶', label: 'Google Play' },
      { id: 'game02-toss', icon: '💙', label: '토스 인앱' },
    ],
  },
]

interface Props {
  activePage: PageId
  onPageChange: (page: PageId) => void
  open: boolean
}

export default function TabNav({ activePage, onPageChange, open }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    GAMES.forEach((g) => {
      const isActive = g.items.some((item) => item.id === activePage)
      init[g.key] = !isActive
    })
    return init
  })

  const toggle = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">D9</div>
        <span>Dragon Nine</span>
      </div>

      {GAMES.map((game) => (
        <div key={game.key} className="sidebar-game-group">
          <button className="sidebar-section-btn" onClick={() => toggle(game.key)}>
            <span className={`sidebar-chevron${collapsed[game.key] ? '' : ' open'}`}>&#9656;</span>
            <span>{game.title}</span>
          </button>
          {!collapsed[game.key] && (
            <>
              {game.items.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-item${activePage === item.id ? ' active' : ''}`}
                  onClick={() => onPageChange(item.id)}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <a className="sidebar-item sidebar-link" href={game.gameUrl} target="_blank" rel="noopener">
                <span>🎮</span>
                <span>게임으로 이동</span>
              </a>
            </>
          )}
        </div>
      ))}
    </aside>
  )
}
