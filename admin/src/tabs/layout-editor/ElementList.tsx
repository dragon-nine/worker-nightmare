import { useState, useRef } from 'react'
import type { LayoutElement, GroupElement } from './types'
import { Copy, Trash2, GripVertical } from 'lucide-react'

interface Props {
  elements: LayoutElement[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onReorder: (id: string, patch: Partial<LayoutElement>) => void
  onSetParent: (childId: string, parentId: string | undefined) => void
}

type DropTarget = { type: 'between'; order: number } | { type: 'merge'; targetId: string } | { type: 'nest'; parentId: string }

export default function ElementList({ elements, selectedId, onSelect, onRemove, onDuplicate, onReorder, onSetParent }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const dragRef = useRef<string | null>(null)

  const rootEls = elements.filter((e) => !e.parentId)
  const groupEls = rootEls.filter((e): e is GroupElement => e.positioning === 'group')
  const anchorEls = rootEls.filter((e) => e.positioning === 'anchor')
  const childrenOf = (parentId: string) => elements.filter((e) => e.parentId === parentId)

  const rowMap = new Map<number, GroupElement[]>()
  for (const el of groupEls) {
    const row = rowMap.get(el.order) || []
    row.push(el)
    rowMap.set(el.order, row)
  }
  const rowOrders = [...rowMap.keys()].sort((a, b) => a - b)

  const handleDragStart = (id: string) => { dragRef.current = id; setDragId(id) }
  const handleDragEnd = () => { setDragId(null); setDropTarget(null) }

  const handleDropOnElement = (targetId: string) => {
    const sourceId = dragRef.current
    if (!sourceId || sourceId === targetId) { handleDragEnd(); return }
    const source = elements.find((e) => e.id === sourceId) as GroupElement | undefined
    const target = elements.find((e) => e.id === targetId) as GroupElement | undefined
    if (!source || !target || source.positioning !== 'group' || target.positioning !== 'group') { handleDragEnd(); return }
    onReorder(sourceId, { order: target.order })
    handleDragEnd()
  }

  const handleDropNest = (parentId: string) => {
    const sourceId = dragRef.current
    if (!sourceId || sourceId === parentId) { handleDragEnd(); return }
    onSetParent(sourceId, parentId)
    handleDragEnd()
  }

  const handleDropBetween = (newOrder: number) => {
    const sourceId = dragRef.current
    if (!sourceId) { handleDragEnd(); return }
    const source = elements.find((e) => e.id === sourceId) as GroupElement | undefined
    if (!source || source.positioning !== 'group') { handleDragEnd(); return }
    groupEls.filter((e) => e.id !== sourceId).forEach((e) => {
      if (e.order >= newOrder) onReorder(e.id, { order: e.order + 1 })
    })
    onReorder(sourceId, { order: newOrder })
    handleDragEnd()
  }

  const renderRow = (el: LayoutElement, indent = 0) => {
    const isContainer = el.type === 'card' || el.type === 'modal'
    const children = isContainer ? childrenOf(el.id) : []
    const isGroup = el.positioning === 'group'

    return (
      <div key={el.id}>
        <div
          draggable={isGroup}
          onDragStart={() => handleDragStart(el.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => {
            e.preventDefault()
            if (isContainer) setDropTarget({ type: 'nest', parentId: el.id })
            else setDropTarget({ type: 'merge', targetId: el.id })
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={() => isContainer ? handleDropNest(el.id) : handleDropOnElement(el.id)}
          onClick={() => onSelect(el.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: `6px ${14}px 6px ${14 + indent * 16}px`,
            background: selectedId === el.id ? '#e8f0fe'
              : (dropTarget?.type === 'nest' && dropTarget.parentId === el.id) ? '#fff7e0'
              : (dropTarget?.type === 'merge' && dropTarget.targetId === el.id) ? '#e0ecff'
              : 'transparent',
            opacity: dragId === el.id ? 0.3 : 1,
            cursor: 'pointer',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {isGroup && <span style={{ cursor: 'grab', color: '#ccc', display: 'flex' }}><GripVertical size={14} /></span>}
          <TypeDot type={el.type} />
          <span style={{ fontSize: 12, color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {el.label || el.id}
          </span>
          <IconBtn onClick={(e) => { e.stopPropagation(); onDuplicate(el.id) }}><Copy size={12} /></IconBtn>
          <IconBtn onClick={(e) => { e.stopPropagation(); onRemove(el.id) }}><Trash2 size={12} /></IconBtn>
        </div>
        {/* 자식 */}
        {children.length > 0 && renderChildren(children, indent + 1)}
      </div>
    )
  }

  const renderChildren = (children: LayoutElement[], indent: number) => {
    // 행 그룹핑
    const groups = children.filter((e): e is GroupElement => e.positioning === 'group')
    const childRowMap = new Map<number, GroupElement[]>()
    for (const c of groups) {
      const row = childRowMap.get(c.order) || []
      row.push(c)
      childRowMap.set(c.order, row)
    }
    const orders = [...childRowMap.keys()].sort((a, b) => a - b)

    return (
      <div style={{ borderLeft: `3px solid ${indent === 1 ? '#f59e0b' : '#8b5cf6'}`, marginLeft: indent * 8, background: indent === 1 ? 'rgba(245,158,11,0.03)' : 'rgba(139,92,246,0.03)' }}>
        <div style={{ padding: '2px 14px 0', fontSize: 10, color: indent === 1 ? '#f59e0b' : '#8b5cf6', fontWeight: 600 }}>
          하위 ({children.length}개)
        </div>
        {orders.map((order) => {
          const rowEls = childRowMap.get(order)!
          const isMulti = rowEls.length > 1
          return (
            <div key={`cr-${order}`}>
              <DropZone
                active={dropTarget?.type === 'between' && dropTarget.order === order + 10000 * indent}
                onDragOver={(e) => { e.preventDefault(); setDropTarget({ type: 'between', order: order + 10000 * indent }) }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={() => {
                  const sourceId = dragRef.current
                  if (!sourceId) { handleDragEnd(); return }
                  // 새 order 삽입
                  groups.filter((e) => e.id !== sourceId && e.order >= order).forEach((e) => {
                    onReorder(e.id, { order: e.order + 1 })
                  })
                  onReorder(sourceId, { order })
                  handleDragEnd()
                }}
              />
              {isMulti && <div style={{ padding: '2px 28px 0', fontSize: 10, color: '#3182f6', fontWeight: 600 }}>같은 행 ({rowEls.length}개)</div>}
              {rowEls.map((el) => renderRow(el, indent))}
            </div>
          )
        })}
        {orders.length > 0 && (
          <DropZone
            active={dropTarget?.type === 'between' && dropTarget.order === (orders[orders.length - 1] + 1) + 10000 * indent}
            onDragOver={(e) => { e.preventDefault(); setDropTarget({ type: 'between', order: (orders[orders.length - 1] + 1) + 10000 * indent }) }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={() => {
              const sourceId = dragRef.current
              if (!sourceId) { handleDragEnd(); return }
              onReorder(sourceId, { order: orders[orders.length - 1] + 1 })
              handleDragEnd()
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>요소 목록</span>
        <span style={{ fontSize: 11, color: '#bbb', marginLeft: 6 }}>{elements.length}</span>
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {rowOrders.map((order) => {
          const rowEls = rowMap.get(order)!
          const isMulti = rowEls.length > 1
          return (
            <div key={order}>
              <DropZone
                active={dropTarget?.type === 'between' && dropTarget.order === order}
                onDragOver={(e) => { e.preventDefault(); setDropTarget({ type: 'between', order }) }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={() => handleDropBetween(order)}
              />
              {isMulti && <div style={{ padding: '2px 14px 0', fontSize: 10, color: '#3182f6', fontWeight: 600 }}>같은 행 ({rowEls.length}개)</div>}
              {rowEls.map((el) => renderRow(el))}
            </div>
          )
        })}
        {rowOrders.length > 0 && (
          <DropZone
            active={dropTarget?.type === 'between' && dropTarget.order === (rowOrders[rowOrders.length - 1] + 1)}
            onDragOver={(e) => { e.preventDefault(); setDropTarget({ type: 'between', order: rowOrders[rowOrders.length - 1] + 1 }) }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={() => handleDropBetween(rowOrders[rowOrders.length - 1] + 1)}
          />
        )}
        {anchorEls.length > 0 && (
          <>
            <div style={{ padding: '6px 14px', fontSize: 10, color: '#999', fontWeight: 600, borderTop: '1px solid #eee' }}>앵커</div>
            {anchorEls.map((el) => renderRow(el))}
          </>
        )}
        {elements.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#bbb' }}>요소가 없습니다</div>}
      </div>
    </div>
  )
}

function DropZone({ active, onDragOver, onDragLeave, onDrop }: {
  active: boolean; onDragOver: (e: React.DragEvent) => void; onDragLeave: () => void; onDrop: () => void
}) {
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{ height: active ? 4 : 2, background: active ? '#3182f6' : 'transparent', transition: 'all 0.1s' }} />
  )
}

function TypeDot({ type }: { type: string }) {
  const bg: Record<string, string> = { text: '#3182f6', image: '#e53935', button: '#111', card: '#8b5cf6', modal: '#f59e0b', toggle: '#434750', close: '#666', gauge: '#c41e1e', 'circle-btn': '#4a5a6a' }
  return <div style={{ width: 8, height: 8, borderRadius: 4, background: bg[type] || '#999', flexShrink: 0 }} />
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return <button onClick={onClick} style={{ padding: 2, background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', display: 'flex' }}>{children}</button>
}
