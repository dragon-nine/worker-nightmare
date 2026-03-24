import type { PageId } from '../App'

interface GameInfo {
  id: string
  name: string
  desc: string
  icon: string | null
  gameUrl: string
  firstPage: PageId
  status: 'live' | 'dev' | 'planned'
}

const GAMES: GameInfo[] = [
  {
    id: 'game01',
    name: '직장인 잔혹사 : 퇴근길',
    desc: '2레인 도로 러너',
    icon: '/images/game01-icon.png',
    gameUrl: '/game01/',
    firstPage: 'game01-assets',
    status: 'live',
  },
  {
    id: 'game02',
    name: 'game02',
    desc: '준비중',
    icon: null,
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
              {game.icon ? (
                <img src={game.icon} alt={game.name} />
              ) : (
                <div className="game-dashboard-icon-placeholder">🎮</div>
              )}
            </div>
            <div className="game-dashboard-info">
              <span className="game-dashboard-name">{game.name}</span>
              <span className="game-dashboard-desc">{game.desc}</span>
            </div>
            <span className={`game-dashboard-status ${game.status}`}>{STATUS_LABEL[game.status]}</span>
            {game.status !== 'planned' && (
              <a
                className="game-dashboard-play"
                href={game.gameUrl}
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
                title="게임 바로가기"
              >
                ▶
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
