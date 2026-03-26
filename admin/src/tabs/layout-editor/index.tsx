import { useState, useCallback, useEffect } from 'react'
import { gradients, type GradientKey } from '../../components/common/design-tokens'
import { useLayoutEditor } from './useLayoutEditor'

function computeBgCss(bgType: string, bgColor: string, bgGradient: string): string {
  if (bgType === 'transparent') return 'transparent'
  if (bgType === 'gradient') {
    const g = gradients[bgGradient as GradientKey]
    if (g) return `linear-gradient(${g.direction}, ${g.from}, ${g.to})`
  }
  return bgColor
}
import ScreenSelector from './ScreenSelector'
import Toolbar from './Toolbar'
import PhoneCanvas from './PhoneCanvas'
import Inspector from './Inspector'
import ElementList from './ElementList'
import AssetPickerModal from './AssetPickerModal'

interface Props {
  gameId: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

export default function LayoutEditorTab({ gameId, onBanner }: Props) {
  const editor = useLayoutEditor(gameId)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [assetPickerTarget, setAssetPickerTarget] = useState<string | null>(null)

  const selectedElement = editor.elements.find((e) => e.id === editor.selectedId) || null

  const handleOpenAssetPicker = useCallback(() => {
    const id = editor.addElement('image', 'group')
    setAssetPickerTarget(id)
    setAssetPickerOpen(true)
  }, [editor])

  const handleAssetSelect = useCallback((assetKey: string, url: string) => {
    const targetId = assetPickerTarget || editor.addElement('image', 'group')
    editor.setElementImage(targetId, assetKey, url)
    setAssetPickerOpen(false)
    setAssetPickerTarget(null)
  }, [assetPickerTarget, editor])

  const handleSave = useCallback(async () => {
    await editor.save()
    onBanner('success', '레이아웃 저장됨')
  }, [editor, onBanner])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!editor.selectedId) return
      const el = editor.elements.find((x) => x.id === editor.selectedId)
      if (!el || el.locked) return
      const step = e.shiftKey ? 10 : 1
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
        e.preventDefault()
        editor.removeElement(editor.selectedId)
      }
      if (el.positioning === 'group') {
        if (e.key === 'ArrowUp') { e.preventDefault(); editor.updateElement(el.id, { gapPx: (el as any).gapPx - step }) }
        if (e.key === 'ArrowDown') { e.preventDefault(); editor.updateElement(el.id, { gapPx: (el as any).gapPx + step }) }
      } else if (el.positioning === 'anchor') {
        if (e.key === 'ArrowLeft') { e.preventDefault(); editor.updateElement(el.id, { offsetX: (el as any).offsetX - step }) }
        if (e.key === 'ArrowRight') { e.preventDefault(); editor.updateElement(el.id, { offsetX: (el as any).offsetX + step }) }
        if (e.key === 'ArrowUp') { e.preventDefault(); editor.updateElement(el.id, { offsetY: (el as any).offsetY - step }) }
        if (e.key === 'ArrowDown') { e.preventDefault(); editor.updateElement(el.id, { offsetY: (el as any).offsetY + step }) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor])

  if (editor.loading && !editor.screenKey) {
    return <div style={{ padding: 40, color: '#999' }}>로딩 중...</div>
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header — 디자인 시스템과 동일 패턴 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111' }}>Layout Editor</h1>
          {editor.dirty && <span style={{ fontSize: 12, color: '#e53935', background: '#fee', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>변경사항 있음</span>}
        </div>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>직장인 잔혹사 — 게임 화면 레이아웃 편집</p>
      </div>

      {/* Screen tabs — 디자인 시스템 탭바 스타일 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e8e8e8' }}>
        <ScreenSelector
          screens={editor.screens}
          activeKey={editor.screenKey}
          onSelect={editor.loadScreen}
          onCreate={editor.createScreen}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
          <button
            onClick={handleSave}
            disabled={editor.saving || !editor.dirty}
            style={{
              padding: '5px 14px', borderRadius: 6, border: '1px solid #ddd',
              background: editor.dirty ? '#111' : '#f5f5f5',
              color: editor.dirty ? '#fff' : '#999',
              fontSize: 12, fontWeight: 600,
              cursor: editor.dirty ? 'pointer' : 'default',
            }}
          >
            {editor.saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        onAddElement={editor.addElement}
        onOpenAssetPicker={handleOpenAssetPicker}
        onResetGaps={editor.resetGaps}
      />

      {editor.loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>화면 로딩 중...</div>
      ) : (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Left: Phone canvas */}
          <PhoneCanvas
            elements={editor.elements}
            imageSizes={editor.imageSizes}
            groupVAlign={editor.groupVAlign}
            bgCss={computeBgCss(editor.bgType, editor.bgColor, editor.bgGradient)}
            screenKey={editor.screenKey}
            gameId={gameId}
            selectedId={editor.selectedId}
            onSelect={editor.selectElement}
            onUpdate={editor.updateElement}
          />

          {/* Right: Inspector + Element list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <Inspector
              element={selectedElement}
              onUpdate={editor.updateElement}
              onRemove={editor.removeElement}
              onDuplicate={editor.duplicateElement}
              bgType={editor.bgType}
              bgColor={editor.bgColor}
              bgGradient={editor.bgGradient}
              onBgUpdate={editor.updateBg}
            />
            <ElementList
              elements={editor.elements}
              selectedId={editor.selectedId}
              onSelect={editor.selectElement}
              onUpdate={editor.updateElement}
              onRemove={editor.removeElement}
              onDuplicate={editor.duplicateElement}
              onReorder={editor.updateElement}
            />
          </div>
        </div>
      )}

      <AssetPickerModal
        open={assetPickerOpen}
        onClose={() => { setAssetPickerOpen(false); setAssetPickerTarget(null) }}
        onSelect={handleAssetSelect}
      />
    </div>
  )
}
