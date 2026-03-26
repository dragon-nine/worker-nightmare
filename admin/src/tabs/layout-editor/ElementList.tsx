import { useState, useRef } from 'react'
import type { LayoutElement, GroupElement } from './types'
import { Eye, EyeOff, Lock, Unlock, Copy, Trash2, GripVertical } from 'lucide-react'

interface Props {
  elements: LayoutElement[]
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<LayoutElement>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onReorder: (id: string, patch: Partial<LayoutElement>) => void
  onSetParent: (childId: string, parentId: string | undefined) => void
}

type DropTarget = { type: 'between'; order: number } | { type: 'merge'; targetId: string } | { type: 'nest'; parentId: string }

export default function ElementList({ elements, selectedId, onSelect, onUpdate, onRemove, onDuplicate, onReorder, onSetParent }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const dragRef = useRef<string | null>(null)

  // 루트 요소만 (parentId 없는)
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

  const handleDragStart = (id: string) => {
    dragRef.current = id
    setDragId(id)
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDropTarget(null)
  }

  // 요소 위에 드롭 → 같은 행으로 합침
  const handleDropOnElement = (targetId: string) => {
    const sourceId = dragRef.current
    if (!sourceId || sourceId === targetId) { handleDragEnd(); return }
    const source = elements.find((e) => e.id === sourceId) as GroupElement | undefined
    const target = elements.find((e) => e.id === targetId) as GroupElement | undefined
    if (!source || !target || source.positioning !== 'group' || target.positioning !== 'group') { handleDragEnd(); return }
    onReorder(sourceId, { order: target.order })
    handleDragEnd()
  }

  // 카드/모달 위에 드롭 → 자식으로 넣기
  const handleDropNest = (parentId: string) => {
    const sourceId = dragRef.current
    if (!sourceId || sourceId === parentId) { handleDragEnd(); return }
    onSetParent(sourceId, parentId)
    handleDragEnd()
  }

  // 행 사이에 드롭 → 순서 변경 (새 행으로)
  const handleDropBetween = (newOrder: number) => {
    const sourceId = dragRef.current
    if (!sourceId) { handleDragEnd(); return }
    const source = elements.find((e) => e.id === sourceId) as GroupElement | undefined
    if (!source || source.positioning !== 'group') { handleDragEnd(); return }

    // 새 위치에 삽입: newOrder 이상의 기존 행들을 +1
    groupEls.filter((e) => e.id !== sourceId).forEach((e) => {
      if (e.order >= newOrder) onReorder(e.id, { order: e.order + 1 })
    })
    onReorder(sourceId, { order: newOrder })
    handleDragEnd()
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
              {/* 행 사이 드롭존 */}
              <DropZone
                active={dropTarget?.type === 'between' && dropTarget.order === order}
                onDragOver={(e) => { e.preventDefault(); setDropTarget({ type: 'between', order }) }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={() => handleDropBetween(order)}
              />
              {/* 행 컨테이너 */}
              <div style={{
                borderLeft: isMulti ? '3px solid #3182f6' : '3px solid transparent',
                background: isMulti ? 'rgba(49,130,246,0.03)' : 'transparent',
              }}>
                {isMulti && (
                  <div style={{ padding: '2px 14px 0', fontSize: 10, color: '#3182f6', fontWeight: 600 }}>
                    같은 행 ({rowEls.length}개)
                  </div>
                )}
                {rowEls.map((el) => {
                  const isContainer = el.type === 'card' || el.type === 'modal'
                  const children = isContainer ? childrenOf(el.id) : []
                  const isNestTarget = dropTarget?.type === 'nest' && dropTarget.parentId === el.id
                  const isMergeTarget = dropTarget?.type === 'merge' && dropTarget.targetId === el.id
                  return (
                    <div key={el.id}>
                      <ElementRow
                        el={el}
                        selected={selectedId === el.id}
                        dragging={dragId === el.id}
                        dropOver={isNestTarget || isMergeTarget}
                        onSelect={() => onSelect(el.id)}
                        onDragStart={() => handleDragStart(el.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDropTarget(isContainer ? { type: 'nest', parentId: el.id } : { type: 'merge', targetId: el.id })
                        }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={() => isContainer ? handleDropNest(el.id) : handleDropOnElement(el.id)}
                        onToggleVisible={() => onUpdate(el.id, { visible: el.visible === false })}
                        onToggleLock={() => onUpdate(el.id, { locked: !el.locked })}
                        onDuplicate={() => onDuplicate(el.id)}
                        onRemove={() => onRemove(el.id)}
                      />
                      {/* 자식 요소 (인덴트, 행 그룹핑) */}
                      {children.length > 0 && (
                        <div style={{ borderLeft: '3px solid #f59e0b', marginLeft: 14, background: 'rgba(245,158,11,0.03)' }}>
                          <div style={{ padding: '2px 14px 0', fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
                            하위 ({children.length}개)
                          </div>
                          {renderChildRows(children, {
                            selectedId, dragId, dropTarget, childrenOf,
                            onSelect, onUpdate, onDuplicate, onRemove,
                            handleDragStart, handleDragEnd, handleDropOnElement, handleDropNest,
                            setDropTarget,
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {/* 마지막 드롭존 */}
        {rowOrders.length > 0 && (
          <DropZone
            active={dropTarget?.type === 'between' && dropTarget.order === (rowOrders[rowOrders.length - 1] + 1)}
            onDragOver={(e) => { e.preventDefault(); setDropTarget({ type: 'between', order: rowOrders[rowOrders.length - 1] + 1 }) }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={() => handleDropBetween(rowOrders[rowOrders.length - 1] + 1)}
          />
        )}

        {/* 앵커 요소 */}
        {anchorEls.length > 0 && (
          <>
            <div style={{ padding: '6px 14px', fontSize: 10, color: '#999', fontWeight: 600, borderTop: '1px solid #eee' }}>앵커</div>
            {anchorEls.map((el) => (
              <ElementRow
                key={el.id}
                el={el}
                selected={selectedId === el.id}
                dragging={false}
                dropOver={false}
                onSelect={() => onSelect(el.id)}
                onToggleVisible={() => onUpdate(el.id, { visible: el.visible === false })}
                onToggleLock={() => onUpdate(el.id, { locked: !el.locked })}
                onDuplicate={() => onDuplicate(el.id)}
                onRemove={() => onRemove(el.id)}
              />
            ))}
          </>
        )}

        {elements.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#bbb' }}>요소가 없습니다</div>
        )}
      </div>
    </div>
  )
}

/** 하위 요소를 order 기준 행 그룹으로 렌더 */
function renderChildRows(children: LayoutElement[], ctx: {
  selectedId: string | null; dragId: string | null; dropTarget: DropTarget | null
  childrenOf: (id: string) => LayoutElement[]
  onSelect: (id: string) => void; onUpdate: (id: string, patch: Partial<LayoutElement>) => void
  onDuplicate: (id: string) => void; onRemove: (id: string) => void
  handleDragStart: (id: string) => void; handleDragEnd: () => void
  handleDropOnElement: (id: string) => void; handleDropNest: (id: string) => void
  setDropTarget: (t: DropTarget | null) => void
}) {
  // 행 그룹핑
  const groupChildren = children.filter((e): e is GroupElement => e.positioning === 'group')
  const childRowMap = new Map<number, GroupElement[]>()
  for (const c of groupChildren) {
    const row = childRowMap.get(c.order) || []
    row.push(c)
    childRowMap.set(c.order, row)
  }
  const childRowOrders = [...childRowMap.keys()].sort((a, b) => a - b)

  return childRowOrders.map((order) => {
    const rowEls = childRowMap.get(order)!
    const isMulti = rowEls.length > 1
    return (
      <div key={`child-row-${order}`}>
        {isMulti && (
          <div style={{ padding: '2px 28px 0', fontSize: 10, color: '#3182f6', fontWeight: 600 }}>같은 행 ({rowEls.length}개)</div>
        )}
        {rowEls.map((child) => {
          const isContainer = child.type === 'card' || child.type === 'modal'
          return (
            <ElementRow
              key={child.id}
              el={child}
              indent
              selected={ctx.selectedId === child.id}
              dragging={ctx.dragId === child.id}
              dropOver={
                (ctx.dropTarget?.type === 'nest' && ctx.dropTarget.parentId === child.id) ||
                (ctx.dropTarget?.type === 'merge' && ctx.dropTarget.targetId === child.id)
              }
              onSelect={() => ctx.onSelect(child.id)}
              onDragStart={() => ctx.handleDragStart(child.id)}
              onDragEnd={ctx.handleDragEnd}
              onDragOver={(e) => {
                e.preventDefault()
                if (isContainer) ctx.setDropTarget({ type: 'nest', parentId: child.id })
                else ctx.setDropTarget({ type: 'merge', targetId: child.id })
              }}
              onDragLeave={() => ctx.setDropTarget(null)}
              onDrop={() => isContainer ? ctx.handleDropNest(child.id) : ctx.handleDropOnElement(child.id)}
              onToggleVisible={() => ctx.onUpdate(child.id, { visible: child.visible === false })}
              onToggleLock={() => ctx.onUpdate(child.id, { locked: !child.locked })}
              onDuplicate={() => ctx.onDuplicate(child.id)}
              onRemove={() => ctx.onRemove(child.id)}
            />
          )
        })}
      </div>
    )
  })
}

function DropZone({ active, onDragOver, onDragLeave, onDrop }: {
  active: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: () => void
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        height: active ? 4 : 2,
        background: active ? '#3182f6' : 'transparent',
        transition: 'all 0.1s',
      }}
    />
  )
}

function ElementRow({ el, indent, selected, dragging, dropOver, onSelect, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onToggleVisible, onToggleLock, onDuplicate, onRemove }: {
  el: LayoutElement; indent?: boolean; selected: boolean; dragging: boolean; dropOver: boolean
  onSelect: () => void
  onDragStart?: () => void; onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent) => void; onDragLeave?: () => void; onDrop?: () => void
  onToggleVisible: () => void; onToggleLock: () => void; onDuplicate: () => void; onRemove: () => void
}) {
  const isGroup = el.positioning === 'group'
  return (
    <div
      draggable={isGroup}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: indent ? '6px 14px 6px 28px' : '6px 14px',
        background: selected ? '#e8f0fe' : dropOver ? (el.type === 'card' || el.type === 'modal' ? '#fff7e0' : '#e0ecff') : 'transparent',
        opacity: dragging ? 0.3 : 1,
        cursor: 'pointer',
        borderBottom: '1px solid #f0f0f0',
        transition: 'background 0.1s',
      }}
    >
      {isGroup && <span style={{ cursor: 'grab', color: '#ccc', display: 'flex' }}><GripVertical size={14} /></span>}
      <TypeDot type={el.type} />
      <span style={{ fontSize: 12, color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {el.label || el.id}
      </span>
      <IconBtn onClick={(e) => { e.stopPropagation(); onToggleVisible() }}>
        {el.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
      </IconBtn>
      <IconBtn onClick={(e) => { e.stopPropagation(); onToggleLock() }}>
        {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
      </IconBtn>
      <IconBtn onClick={(e) => { e.stopPropagation(); onDuplicate() }}>
        <Copy size={12} />
      </IconBtn>
      <IconBtn onClick={(e) => { e.stopPropagation(); onRemove() }}>
        <Trash2 size={12} />
      </IconBtn>
    </div>
  )
}

function TypeDot({ type }: { type: string }) {
  const bg: Record<string, string> = { text: '#3182f6', image: '#e53935', button: '#111', card: '#8b5cf6', modal: '#f59e0b', toggle: '#434750', close: '#666', gauge: '#c41e1e', 'circle-btn': '#4a5a6a' }
  return <div style={{ width: 8, height: 8, borderRadius: 4, background: bg[type] || '#999', flexShrink: 0 }} />
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} style={{ padding: 2, background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', display: 'flex' }}>
      {children}
    </button>
  )
}
