import { useState } from 'react'
import { TABS, buildCategories } from './game-assets/types'
import CategorySection from './game-assets/CategorySection'
import LaunchPrepTab from './LaunchPrepTab'

interface Props {
  gameId: string
  gameName: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

export default function GameAssetsTab({ gameId, gameName, onBanner }: Props) {
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0]
  const categories = buildCategories(gameId, currentTab)

  return (
    <div>
      <h1 className="page-title">{gameId} 에셋 관리</h1>
      <p className="page-subtitle">{gameName} — 게임 에셋을 업로드하고 관리합니다</p>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)',
        paddingBottom: 0,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 150ms',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'launch' ? (
        <LaunchPrepTab gameId={gameId} gameName={gameName} onBanner={onBanner} embedded />
      ) : (
        categories.map((cat) => (
          <CategorySection key={cat.key} cat={cat} onBanner={onBanner} />
        ))
      )}
    </div>
  )
}
