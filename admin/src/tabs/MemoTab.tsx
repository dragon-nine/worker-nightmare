import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getJson, putJson } from '../api'

interface Memo {
  id: string
  title: string
  content: string
  updatedAt: string
}

const STORE_KEY = 'admin/memos.json'
const AUTOSAVE_DELAY = 800

interface Props {
  onBanner: (type: 'success' | 'error', message: string) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}.${dd} ${hh}:${mi}`
}

export default function MemoTab({ onBanner }: Props) {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const memosRef = useRef(memos)
  memosRef.current = memos

  const load = useCallback(async () => {
    try {
      const data = await getJson<Memo[]>(STORE_KEY)
      const list = data || []
      setMemos(list)
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id)
        setEditTitle(list[0].title)
        setEditContent(list[0].content)
      }
    } catch {
      // empty
    } finally {
      setLoaded(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const persistNow = useCallback(async (updated: Memo[]) => {
    setAutoSaveStatus('saving')
    try {
      await putJson(STORE_KEY, updated)
      setMemos(updated)
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus((s) => s === 'saved' ? 'idle' : s), 2000)
    } catch (err) {
      onBanner('error', `저장 실패: ${(err as Error).message}`)
      setAutoSaveStatus('idle')
    }
  }, [onBanner])

  const scheduleAutoSave = useCallback((title: string, content: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const updated = memosRef.current.map((m) =>
        m.id === selectedId
          ? { ...m, title: title || '제목 없음', content, updatedAt: new Date().toISOString() }
          : m
      )
      persistNow(updated)
    }, AUTOSAVE_DELAY)
  }, [selectedId, persistNow])

  // Flush pending autosave on unmount or memo switch
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [selectedId])

  const selected = memos.find((m) => m.id === selectedId) || null

  const handleNew = () => {
    const memo: Memo = {
      id: Date.now().toString(),
      title: '새 메모',
      content: '',
      updatedAt: new Date().toISOString(),
    }
    const updated = [memo, ...memos]
    setMemos(updated)
    setSelectedId(memo.id)
    setEditTitle(memo.title)
    setEditContent(memo.content)
    persistNow(updated)
  }

  const handleSelect = (memo: Memo) => {
    // Flush pending save before switching
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      if (selectedId) {
        const updated = memosRef.current.map((m) =>
          m.id === selectedId
            ? { ...m, title: editTitle || '제목 없음', content: editContent, updatedAt: new Date().toISOString() }
            : m
        )
        persistNow(updated)
      }
    }
    setSelectedId(memo.id)
    setEditTitle(memo.title)
    setEditContent(memo.content)
  }

  const handleTitleChange = (val: string) => {
    setEditTitle(val)
    scheduleAutoSave(val, editContent)
  }

  const handleContentChange = (val: string) => {
    setEditContent(val)
    scheduleAutoSave(editTitle, val)
  }

  const handleDelete = () => {
    if (!selectedId || !confirm('이 메모를 삭제하시겠습니까?')) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const updated = memos.filter((m) => m.id !== selectedId)
    setSelectedId(null)
    persistNow(updated)
    onBanner('success', '삭제 완료')
  }

  return (
    <div className="memo-fullscreen">
      <div className="memo-layout">
        <div className="memo-list card">
          <div className="category-header">
            <div className="card-title" style={{ marginBottom: 0 }}>메모</div>
            <button className="category-add-btn" onClick={handleNew} title="새 메모"><Plus size={16} /></button>
          </div>
          {!loaded && <div className="empty">로딩 중...</div>}
          {loaded && memos.length === 0 && <div className="empty">메모가 없습니다</div>}
          {memos.map((m) => (
            <div
              key={m.id}
              className={`memo-list-item${m.id === selectedId ? ' active' : ''}`}
              onClick={() => handleSelect(m)}
            >
              <span className="memo-list-title">{m.title}</span>
              <span className="memo-list-date">{formatDate(m.updatedAt)}</span>
            </div>
          ))}
        </div>

        <div className="memo-editor card">
          {selected ? (
            <>
              <div className="memo-editor-header">
                <input
                  className="memo-title-input"
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="제목"
                />
                <div className="memo-editor-actions">
                  {autoSaveStatus === 'saving' && <span className="memo-autosave-status">저장 중...</span>}
                  {autoSaveStatus === 'saved' && <span className="memo-autosave-status saved">저장됨</span>}
                  <button className="memo-delete-btn" onClick={handleDelete} title="삭제"><Trash2 size={16} /></button>
                </div>
              </div>
              <textarea
                className="memo-content-input"
                value={editContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="내용을 입력하세요..."
              />
            </>
          ) : (
            <div className="empty">메모를 선택하거나 새로 만드세요</div>
          )}
        </div>
      </div>
    </div>
  )
}
