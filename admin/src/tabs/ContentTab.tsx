import { useState } from 'react'
import type { ContentTabId } from './content/types'
import { GameOverSection } from './content/GameOverSection'
import { ChallengeSection } from './content/ChallengeSection'

interface Props {
  gameId: string
  gameName: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

const TABS: { id: ContentTabId; label: string }[] = [
  { id: 'gameover', label: '게임오버 멘트' },
  { id: 'challenge', label: '도전장 멘트' },
]

export default function ContentTab({ gameId, gameName, onBanner }: Props) {
  const [activeTab, setActiveTab] = useState<ContentTabId>('gameover')

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#111' }}>콘텐츠 관리</h1>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>{gameName} — 게임 내 텍스트 콘텐츠</p>
      </div>

      {/* 탭 바 — 디자인 시스템 underline 스타일 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e8e8e8' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid #111' : '2px solid transparent',
              marginBottom: -2,
              background: 'transparent',
              color: activeTab === t.id ? '#111' : '#999',
              fontWeight: activeTab === t.id ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'gameover' && <GameOverSection gameId={gameId} onBanner={onBanner} />}
      {activeTab === 'challenge' && <ChallengeSection gameId={gameId} onBanner={onBanner} />}
    </div>
  )
}
