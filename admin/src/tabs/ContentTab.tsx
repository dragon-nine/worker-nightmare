import { useState, useEffect, useCallback } from 'react'
import { getJson, putJson } from '../api'

interface Quote {
  line1: string
  line2?: string
}

interface ChallengeQuote {
  text: string
  type: 'normal' | 'record'
}

interface Props {
  gameId: string
  gameName: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

const QUOTES_KEY = (gameId: string) => `${gameId}/content/quotes.json`
const CHALLENGE_KEY = (gameId: string) => `${gameId}/content/challenge-quotes.json`

type ContentTabId = 'gameover' | 'challenge'

/* ─── 게임오버 멘트 섹션 ─── */

function GameOverSection({ gameId, onBanner }: { gameId: string; onBanner: Props['onBanner'] }) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editLine1, setEditLine1] = useState('')
  const [editLine2, setEditLine2] = useState('')
  const [addMode, setAddMode] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getJson<Quote[]>(QUOTES_KEY(gameId))
      if (data && data.length > 0) setQuotes(data)
    } catch { /* empty */ } finally { setLoaded(true) }
  }, [gameId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (updated: Quote[]) => {
    setSaving(true)
    try {
      await putJson(QUOTES_KEY(gameId), updated)
      setQuotes(updated)
      onBanner('success', '게임오버 멘트 저장 완료')
    } catch (err) {
      onBanner('error', `저장 실패: ${(err as Error).message}`)
    } finally { setSaving(false) }
  }, [gameId, onBanner])

  const handleEdit = (idx: number) => {
    setEditIdx(idx)
    setEditLine1(quotes[idx].line1)
    setEditLine2(quotes[idx].line2 || '')
    setAddMode(false)
  }

  const handleSaveEdit = () => {
    if (!editLine1.trim()) return
    if (editIdx !== null) {
      const updated = quotes.map((q, i) =>
        i === editIdx ? { line1: editLine1.trim(), ...(editLine2.trim() ? { line2: editLine2.trim() } : {}) } : q
      )
      save(updated)
    }
    setEditIdx(null)
  }

  const handleDelete = (idx: number) => {
    if (!confirm(`"${quotes[idx].line1}" 삭제하시겠습니까?`)) return
    save(quotes.filter((_, i) => i !== idx))
  }

  const handleAdd = () => {
    if (!editLine1.trim()) return
    const newQuote: Quote = { line1: editLine1.trim(), ...(editLine2.trim() ? { line2: editLine2.trim() } : {}) }
    save([...quotes, newQuote])
    setAddMode(false)
    setEditLine1('')
    setEditLine2('')
  }

  const handleStartAdd = () => {
    setAddMode(true)
    setEditIdx(null)
    setEditLine1('')
    setEditLine2('')
  }

  return (
    <>
      <div className="category-header">
        <span className="section-count">{quotes.length}개</span>
        <button className="category-add-btn" onClick={handleStartAdd} title="추가">+</button>
      </div>

      {!loaded && <div className="empty">로딩 중...</div>}
      {loaded && quotes.length === 0 && (
        <div className="ct-empty">
          <p>아직 등록된 멘트가 없습니다.</p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>게임에서는 로컬 기본 멘트가 사용됩니다.</p>
        </div>
      )}

      {addMode && (
        <div className="ct-edit-row">
          <div className="ct-edit-fields">
            <input className="ct-input" value={editLine1} onChange={(e) => setEditLine1(e.target.value)} placeholder="1줄 (필수)" autoFocus />
            <input className="ct-input" value={editLine2} onChange={(e) => setEditLine2(e.target.value)} placeholder="2줄 (선택)" />
          </div>
          <div className="ct-edit-actions">
            <button className="ct-save-btn" onClick={handleAdd} disabled={saving}>추가</button>
            <button className="ct-cancel-btn" onClick={() => setAddMode(false)}>취소</button>
          </div>
        </div>
      )}

      <div className="ct-list">
        {quotes.map((q, i) => (
          <div key={i} className="ct-item">
            {editIdx === i ? (
              <div className="ct-edit-row">
                <div className="ct-edit-fields">
                  <input className="ct-input" value={editLine1} onChange={(e) => setEditLine1(e.target.value)} placeholder="1줄" autoFocus />
                  <input className="ct-input" value={editLine2} onChange={(e) => setEditLine2(e.target.value)} placeholder="2줄 (선택)" />
                </div>
                <div className="ct-edit-actions">
                  <button className="ct-save-btn" onClick={handleSaveEdit} disabled={saving}>저장</button>
                  <button className="ct-cancel-btn" onClick={() => setEditIdx(null)}>취소</button>
                </div>
              </div>
            ) : (
              <>
                <span className="ct-num">{i + 1}</span>
                <div className="ct-text">
                  <span className="ct-line1">{q.line1}</span>
                  {q.line2 && <span className="ct-line2">{q.line2}</span>}
                </div>
                <div className="ct-actions">
                  <button className="ct-edit-btn" onClick={() => handleEdit(i)}>수정</button>
                  <button className="ct-delete-btn" onClick={() => handleDelete(i)}>&#x2715;</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

/* ─── 도전장 멘트 섹션 ─── */

const TYPE_LABELS: Record<ChallengeQuote['type'], string> = { normal: '일반', record: '신기록' }

function ChallengeSection({ gameId, onBanner }: { gameId: string; onBanner: Props['onBanner'] }) {
  const [quotes, setQuotes] = useState<ChallengeQuote[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editType, setEditType] = useState<ChallengeQuote['type']>('normal')
  const [addMode, setAddMode] = useState(false)
  const [filter, setFilter] = useState<'all' | 'normal' | 'record'>('all')

  const load = useCallback(async () => {
    try {
      const data = await getJson<ChallengeQuote[]>(CHALLENGE_KEY(gameId))
      if (data && data.length > 0) setQuotes(data)
    } catch { /* empty */ } finally { setLoaded(true) }
  }, [gameId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (updated: ChallengeQuote[]) => {
    setSaving(true)
    try {
      await putJson(CHALLENGE_KEY(gameId), updated)
      setQuotes(updated)
      onBanner('success', '도전장 멘트 저장 완료')
    } catch (err) {
      onBanner('error', `저장 실패: ${(err as Error).message}`)
    } finally { setSaving(false) }
  }, [gameId, onBanner])

  const handleEdit = (idx: number) => {
    setEditIdx(idx)
    setEditText(quotes[idx].text)
    setEditType(quotes[idx].type)
    setAddMode(false)
  }

  const handleSaveEdit = () => {
    if (!editText.trim()) return
    if (editIdx !== null) {
      const updated = quotes.map((q, i) =>
        i === editIdx ? { text: editText.trim(), type: editType } : q
      )
      save(updated)
    }
    setEditIdx(null)
  }

  const handleDelete = (idx: number) => {
    if (!confirm(`"${quotes[idx].text}" 삭제하시겠습니까?`)) return
    save(quotes.filter((_, i) => i !== idx))
  }

  const handleAdd = () => {
    if (!editText.trim()) return
    save([...quotes, { text: editText.trim(), type: editType }])
    setAddMode(false)
    setEditText('')
    setEditType('normal')
  }

  const handleStartAdd = () => {
    setAddMode(true)
    setEditIdx(null)
    setEditText('')
    setEditType('normal')
  }

  const filtered = filter === 'all' ? quotes : quotes.filter((q) => q.type === filter)
  const normalCount = quotes.filter((q) => q.type === 'normal').length
  const recordCount = quotes.filter((q) => q.type === 'record').length

  return (
    <>
      <div className="category-header">
        <span className="section-count">{quotes.length}개</span>
        <button className="category-add-btn" onClick={handleStartAdd} title="추가">+</button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 12px', lineHeight: 1.5 }}>
        변수: <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 4 }}>{'{s}'}</code> = 현재 점수 · <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 4 }}>{'{b}'}</code> = 최고기록
      </p>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {([['all', `전체 ${quotes.length}`], ['normal', `일반 ${normalCount}`], ['record', `신기록 ${recordCount}`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={filter === key ? 'ct-filter-active' : 'ct-filter'}
          >
            {label}
          </button>
        ))}
      </div>

      {!loaded && <div className="empty">로딩 중...</div>}
      {loaded && quotes.length === 0 && (
        <div className="ct-empty">
          <p>아직 등록된 멘트가 없습니다.</p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>게임에서는 로컬 기본 멘트가 사용됩니다.</p>
        </div>
      )}

      {addMode && (
        <div className="ct-edit-row">
          <div className="ct-edit-fields">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select className="ct-input" value={editType} onChange={(e) => setEditType(e.target.value as ChallengeQuote['type'])} style={{ flex: '0 0 90px' }}>
                <option value="normal">일반</option>
                <option value="record">신기록</option>
              </select>
              <input className="ct-input" value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="멘트 입력 ({s}=점수, {b}=최고기록)" autoFocus style={{ flex: 1 }} />
            </div>
          </div>
          <div className="ct-edit-actions">
            <button className="ct-save-btn" onClick={handleAdd} disabled={saving}>추가</button>
            <button className="ct-cancel-btn" onClick={() => setAddMode(false)}>취소</button>
          </div>
        </div>
      )}

      <div className="ct-list">
        {filtered.map((q, _fi) => {
          const realIdx = quotes.indexOf(q)
          return (
            <div key={realIdx} className="ct-item">
              {editIdx === realIdx ? (
                <div className="ct-edit-row">
                  <div className="ct-edit-fields">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select className="ct-input" value={editType} onChange={(e) => setEditType(e.target.value as ChallengeQuote['type'])} style={{ flex: '0 0 90px' }}>
                        <option value="normal">일반</option>
                        <option value="record">신기록</option>
                      </select>
                      <input className="ct-input" value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="멘트" autoFocus style={{ flex: 1 }} />
                    </div>
                  </div>
                  <div className="ct-edit-actions">
                    <button className="ct-save-btn" onClick={handleSaveEdit} disabled={saving}>저장</button>
                    <button className="ct-cancel-btn" onClick={() => setEditIdx(null)}>취소</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="ct-num">{realIdx + 1}</span>
                  <span className={`ct-type-badge ct-type-${q.type}`}>{TYPE_LABELS[q.type]}</span>
                  <div className="ct-text">
                    <span className="ct-line1">{q.text}</span>
                  </div>
                  <div className="ct-actions">
                    <button className="ct-edit-btn" onClick={() => handleEdit(realIdx)}>수정</button>
                    <button className="ct-delete-btn" onClick={() => handleDelete(realIdx)}>&#x2715;</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ─── 메인 탭 ─── */

const TABS: { id: ContentTabId; label: string }[] = [
  { id: 'gameover', label: '게임오버 멘트' },
  { id: 'challenge', label: '도전장 멘트' },
]

export default function ContentTab({ gameId, gameName, onBanner }: Props) {
  const [activeTab, setActiveTab] = useState<ContentTabId>('gameover')

  return (
    <div>
      <h1 className="page-title">콘텐츠 관리</h1>
      <p className="page-subtitle">{gameName} — 게임 내 텍스트 콘텐츠</p>

      {/* 탭 바 */}
      <div className="content-tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`content-tab-btn${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        {activeTab === 'gameover' && <GameOverSection gameId={gameId} onBanner={onBanner} />}
        {activeTab === 'challenge' && <ChallengeSection gameId={gameId} onBanner={onBanner} />}
      </div>
    </div>
  )
}
