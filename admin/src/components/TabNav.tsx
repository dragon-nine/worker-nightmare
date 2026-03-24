import { useState, useEffect, type ReactNode } from 'react'
import type { PageId } from '../App'
import {
  CheckSquare, StickyNote, FolderOpen,
  Palette, LayoutGrid, Rocket, Gamepad2, ExternalLink, FileText,
} from 'lucide-react'

declare const __BUILD_TIME__: string

const ICON_SIZE = 16

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
  icon: ReactNode
  label: string
}

interface GameSection {
  key: string
  title: string
  subtitle: string
  gameUrl: string
  items: NavItem[]
}

const GAMES: GameSection[] = [
  {
    key: 'game01',
    title: 'GAME01',
    subtitle: '직장인 잔혹사 : 퇴근길',
    gameUrl: '/game01/',
    items: [
      { id: 'game01-assets', icon: <Palette size={ICON_SIZE} />, label: '에셋 관리' },
      { id: 'game01-layout', icon: <LayoutGrid size={ICON_SIZE} />, label: '레이아웃 편집' },
      { id: 'game01-launch', icon: <Rocket size={ICON_SIZE} />, label: '출시 준비' },
      { id: 'game01-content', icon: <FileText size={ICON_SIZE} />, label: '콘텐츠 관리' },
    ],
  },
  {
    key: 'game02',
    title: 'GAME02',
    subtitle: '준비중',
    gameUrl: '/game02/',
    items: [
      { id: 'game02-assets', icon: <Palette size={ICON_SIZE} />, label: '에셋 관리' },
    ],
  },
]

const COMMON_ITEMS: { id: PageId; icon: ReactNode; label: string }[] = [
  { id: 'checklist', icon: <CheckSquare size={ICON_SIZE} />, label: '체크리스트' },
  { id: 'memo', icon: <StickyNote size={ICON_SIZE} />, label: '메모' },
  { id: 'shared-files', icon: <FolderOpen size={ICON_SIZE} />, label: '공유 파일' },
]

interface Props {
  activePage: PageId
  onPageChange: (page: PageId) => void
  open: boolean
}

export default function TabNav({ activePage, onPageChange, open }: Props) {
  const [, setTick] = useState(0)
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const commonPageIds = COMMON_ITEMS.map((i) => i.id as string)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    GAMES.forEach((g) => {
      const isActive = g.items.some((item) => item.id === activePage)
      init[g.key] = !isActive
    })
    init['common'] = !commonPageIds.includes(activePage)
    return init
  })

  const toggle = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-nav">
        <div className="sidebar-logo" onClick={() => onPageChange('dashboard' as PageId)}>
          <img className="sidebar-logo-emoji" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f525.svg" alt="fire" />
          <span>Dragon Nine</span>
        </div>

        <div className="sidebar-game-group">
          <div className="sidebar-section-btn" onClick={() => toggle('common')}>
            <span>COMMON</span>
          </div>
          {!collapsed['common'] && COMMON_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`sidebar-item${activePage === item.id ? ' active' : ''}`}
              onClick={() => onPageChange(item.id)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {GAMES.map((game) => (
          <div key={game.key} className="sidebar-game-group">
            <div className="sidebar-section-btn" onClick={() => toggle(game.key)}>
              <span className="sidebar-section-label">
                <span className="sidebar-section-title">{game.title}</span>
                <span className="sidebar-section-subtitle">{game.subtitle}</span>
              </span>
            </div>
            {!collapsed[game.key] && (
              <>
                {game.items.map((item) => (
                  <button
                    key={item.id}
                    className={`sidebar-item${activePage === item.id ? ' active' : ''}`}
                    onClick={() => onPageChange(item.id)}
                  >
                    <span className="sidebar-item-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
                <a className="sidebar-item sidebar-link" href={game.gameUrl} target="_blank" rel="noopener">
                  <span className="sidebar-item-icon"><Gamepad2 size={ICON_SIZE} /></span>
                  <span>게임으로 이동</span>
                  <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />
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
