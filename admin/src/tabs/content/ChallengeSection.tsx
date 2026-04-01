import { useState, useEffect, useCallback } from 'react'
import { getJson, putJson } from '../../api'
import type { ChallengeQuote, SectionProps } from './types'
import { CHALLENGE_KEY } from './types'

const TYPE_LABELS: Record<ChallengeQuote['type'], string> = { normal: '일반', record: '신기록' }

export function ChallengeSection({ gameId, onBanner }: SectionProps) {
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

      {/* 필터 — pill 토글 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {([['all', `전체 ${quotes.length}`], ['normal', `일반 ${normalCount}`], ['record', `신기록 ${recordCount}`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '5px 14px', borderRadius: 20,
              border: filter === key ? '1px solid #111' : '1px solid #ddd',
              background: filter === key ? '#111' : '#fff',
              color: filter === key ? '#fff' : '#888',
              fontSize: 13, fontWeight: filter === key ? 600 : 400,
              cursor: 'pointer',
            }}
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
