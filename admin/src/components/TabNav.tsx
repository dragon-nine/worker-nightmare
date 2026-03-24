import { useState, useEffect } from 'react'
import type { PageId } from '../App'

declare const __BUILD_TIME__: string

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

function formatDateTime(isoString: string): string {
  const d = new Date(isoString)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}.${dd} ${hh}:${mi}`
}

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
      { id: 'game01-layout', icon: '📐', label: '레이아웃 편집' },
      { id: 'game01-launch', icon: '🚀', label: '출시 준비' },
    ],
  },
  {
    key: 'game02',
    title: 'game02 - (준비중)',
    gameUrl: '/game02/',
    items: [
      { id: 'game02-assets', icon: '🎨', label: '에셋 관리' },
    ],
  },
]

interface Props {
  activePage: PageId
  onPageChange: (page: PageId) => void
  open: boolean
}

export default function TabNav({ activePage, onPageChange, open }: Props) {
  const [, setTick] = useState(0)
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null

  // Update relative time every minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

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
      <div className="sidebar-nav">
        <div className="sidebar-logo" onClick={() => onPageChange('dashboard' as PageId)} style={{ cursor: 'pointer' }}>
          <div className="sidebar-logo-icon">D9</div>
          <span>Dragon Nine</span>
        </div>

        <button
          className={`sidebar-item${activePage === 'shared-files' ? ' active' : ''}`}
          onClick={() => onPageChange('shared-files' as PageId)}
        >
          <span>📁</span>
          <span>공유 파일</span>
        </button>

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
      </div>

      {buildTime && (
        <div className="sidebar-build-info">
          <span className="sidebar-build-ago">{formatRelativeTime(buildTime)} 업데이트</span>
          <span className="sidebar-build-date">{formatDateTime(buildTime)}</span>
        </div>
      )}
    </aside>
  )
}
