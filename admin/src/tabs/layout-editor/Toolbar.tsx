interface Props {
  onAddElement: (type: string, positioning: 'group' | 'anchor') => void
  onOpenAssetPicker: () => void
  onAutoFit: () => void
}

export default function Toolbar({ onAddElement, onOpenAssetPicker, onAutoFit }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', marginRight: 4 }}>그룹</div>
      <ToolBtn label="텍스트" onClick={() => onAddElement('text', 'group')} />
      <ToolBtn label="이미지" onClick={onOpenAssetPicker} />
      <ToolBtn label="버튼" onClick={() => onAddElement('button', 'group')} />
      <ToolBtn label="카드" onClick={() => onAddElement('card', 'group')} />
      <ToolBtn label="모달" onClick={() => onAddElement('modal', 'group')} />
      <div style={{ width: 1, height: 24, background: '#e8e8e8', margin: '0 8px' }} />
      <div style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', marginRight: 4 }}>컴포넌트</div>
      <ToolBtn label="토글" onClick={() => onAddElement('toggle', 'group')} />
      <ToolBtn label="게이지" onClick={() => onAddElement('gauge', 'group')} />
      <ToolBtn label="원형 버튼" onClick={() => onAddElement('circle-btn', 'group')} />
      <div style={{ width: 1, height: 24, background: '#e8e8e8', margin: '0 8px' }} />
      <ToolBtn label="자동 맞춤" onClick={onAutoFit} secondary />
    </div>
  )
}

function ToolBtn({ label, onClick, secondary }: { label: string; onClick: () => void; secondary?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 6,
        border: '1px solid #e8e8e8',
        background: secondary ? '#f5f5f5' : '#fff',
        color: secondary ? '#999' : '#333',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}
    >
      {secondary ? label : `+ ${label}`}
    </button>
  )
}
