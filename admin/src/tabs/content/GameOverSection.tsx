import { useState, useEffect, useCallback } from 'react'
import { getJson, putJson } from '../../api'
import type { Quote, SectionProps } from './types'
import { QUOTES_KEY } from './types'

export function GameOverSection({ gameId, onBanner }: SectionProps) {
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
