interface Props {
  onAddElement: (type: 'text' | 'image' | 'button', positioning: 'group' | 'anchor') => void
  onSave: () => void
  saving: boolean
  dirty: boolean
  onOpenAssetPicker: () => void
}

export default function Toolbar({ onAddElement, onSave, saving, dirty, onOpenAssetPicker }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 4, background: '#f5f5f5', borderRadius: 8, padding: 4 }}>
        <ToolBtn label="+ 텍스트" onClick={() => onAddElement('text', 'group')} />
        <ToolBtn label="+ 이미지" onClick={onOpenAssetPicker} />
        <ToolBtn label="+ 버튼" onClick={() => onAddElement('button', 'group')} />
      </div>
      <div style={{ display: 'flex', gap: 4, background: '#f5f5f5', borderRadius: 8, padding: 4 }}>
        <ToolBtn label="+ 앵커 텍스트" onClick={() => onAddElement('text', 'anchor')} />
        <ToolBtn label="+ 앵커 이미지" onClick={() => onAddElement('image', 'anchor')} />
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {dirty && <span style={{ fontSize: 11, color: '#e53935', fontWeight: 600 }}>변경사항 있음</span>}
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          style={{
            padding: '6px 16px', borderRadius: 8, border: 'none',
            background: dirty ? '#111' : '#ddd', color: dirty ? '#fff' : '#999',
            fontSize: 13, fontWeight: 600, cursor: dirty ? 'pointer' : 'default',
          }}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}

function ToolBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 6, border: 'none',
        background: '#fff', color: '#333', fontSize: 12,
        cursor: 'pointer', fontWeight: 500,
      }}
    >
      {label}
    </button>
  )
}
