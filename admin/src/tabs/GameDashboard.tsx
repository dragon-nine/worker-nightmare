import { useState, useEffect } from 'react'
import { listBlobs } from '../api'
import type { PageId } from '../App'

interface GameInfo {
  id: string
  name: string
  desc: string
  iconPrefix: string
  gameUrl: string
  firstPage: PageId
  status: 'live' | 'dev' | 'planned'
}

const GAMES: GameInfo[] = [
  {
    id: 'game01',
    name: '직장인 잔혹사 : 퇴근길',
    desc: '퇴근길은 만만치 않다! 2레인 도로를 달리며 장애물을 피하는 캐주얼 러너 게임.',
    iconPrefix: 'launch/game01/icon/',
    gameUrl: '/game01/',
    firstPage: 'game01-assets',
    status: 'live',
  },
  {
    id: 'game02',
    name: 'game02',
    desc: '준비중',
    iconPrefix: 'launch/game02/icon/',
    gameUrl: '/game02/',
    firstPage: 'game02-assets',
    status: 'planned',
  },
]

const STATUS_LABEL: Record<string, string> = {
  live: '운영중',
  dev: '개발중',
  planned: '준비중',
}

interface Props {
  onPageChange: (page: PageId) => void
}

export default function GameDashboard({ onPageChange }: Props) {
  const [icons, setIcons] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState<Set<string>>(new Set())

  useEffect(() => {
    GAMES.forEach(async (game) => {
      try {
        const blobs = await listBlobs(game.iconPrefix)
        if (blobs.length > 0) {
          setIcons((prev) => ({ ...prev, [game.id]: blobs[0].url }))
        }
      } catch {
        // no icon
      } finally {
        setLoaded((prev) => new Set(prev).add(game.id))
      }
    })
  }, [])

  return (
    <div>
      <h1 className="page-title">Games</h1>
      <p className="page-subtitle">게임을 선택하여 관리하세요</p>
      <div className="game-dashboard-grid">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className={`game-dashboard-card${game.status === 'planned' ? ' planned' : ''}`}
            onClick={() => game.status !== 'planned' && onPageChange(game.firstPage)}
          >
            <div className="game-dashboard-icon">
              {icons[game.id] ? (
                <img src={icons[game.id]} alt={game.name} />
              ) : !loaded.has(game.id) ? (
                <div className="game-dashboard-icon-shimmer" />
              ) : null}
            </div>
            <div className="game-dashboard-info">
              <span className="game-dashboard-name">{game.name}</span>
              <span className="game-dashboard-desc">{game.desc}</span>
            </div>
            <span className={`game-dashboard-status ${game.status}`}>{STATUS_LABEL[game.status]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
