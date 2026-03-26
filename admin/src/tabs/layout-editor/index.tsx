import { useState, useCallback, useEffect } from 'react'
import { useLayoutEditor } from './useLayoutEditor'
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
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#111' }}>Layout Editor</h2>

      <ScreenSelector
        screens={editor.screens}
        activeKey={editor.screenKey}
        onSelect={editor.loadScreen}
        onCreate={editor.createScreen}
      />

      <Toolbar
        onAddElement={editor.addElement}
        onSave={handleSave}
        saving={editor.saving}
        dirty={editor.dirty}
        onOpenAssetPicker={handleOpenAssetPicker}
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
            bgColor={editor.bgColor}
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
              bgColor={editor.bgColor}
              onBgColorChange={editor.setBgColor}
              groupVAlign={editor.groupVAlign}
              onGroupVAlignChange={editor.setGroupVAlign}
            />
            <ElementList
              elements={editor.elements}
              selectedId={editor.selectedId}
              onSelect={editor.selectElement}
              onUpdate={editor.updateElement}
              onRemove={editor.removeElement}
              onDuplicate={editor.duplicateElement}
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
