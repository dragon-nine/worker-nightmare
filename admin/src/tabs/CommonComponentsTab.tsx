import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_SPEC, R2_KEY, type DesignSpec } from '../components/common/design-spec'
import { getJson, putJson } from '../api'
import { TypographySection } from './common-components/TypographySection'
import { ColorSection } from './common-components/ColorSection'
import { SpaceShapeSection } from './common-components/SpaceShapeSection'
import { ButtonStylesSection } from './common-components/ButtonStylesSection'
import { ComponentsSection } from './common-components/ComponentsSection'
import { CompositionsSection } from './common-components/CompositionsSection'

type Tab = 'typography' | 'color' | 'space' | 'buttons' | 'components' | 'compositions'

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'typography', label: 'Typography', desc: '서체 & 타입 스케일' },
  { id: 'color', label: 'Color', desc: '컬러 팔레트' },
  { id: 'space', label: 'Space & Shape', desc: '간격 & 형태' },
  { id: 'buttons', label: 'Buttons', desc: '버튼 스타일 유형' },
  { id: 'components', label: 'Components', desc: '버튼 & UI 요소' },
  { id: 'compositions', label: 'Compositions', desc: '복합 패턴' },
]

export default function CommonComponentsTab() {
  const [tab, setTab] = useState<Tab>('typography')
  const [spec, setSpec] = useState<DesignSpec>(DEFAULT_SPEC)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState('')

  useEffect(() => {
    getJson<DesignSpec>(R2_KEY).then((data) => {
      if (data) setSpec({ ...DEFAULT_SPEC, ...data })
    }).catch(() => {})
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await putJson(R2_KEY, spec)
      setLastSaved(new Date().toLocaleTimeString())
    } catch { /* ignore */ }
    setSaving(false)
  }, [spec])

  const update = <K extends keyof DesignSpec>(key: K, partial: Partial<DesignSpec[K]>) => {
    setSpec((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }))
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111' }}>Design System</h1>
          <span style={{ fontSize: 12, color: '#999', background: '#f0f0f0', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>v1.0</span>
        </div>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>직장인 잔혹사 — 게임 UI 디자인 토큰 & 컴포넌트 라이브러리</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '2px solid #e8e8e8' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #111' : '2px solid transparent',
              marginBottom: -2,
              background: 'transparent',
              color: tab === t.id ? '#111' : '#999',
              fontWeight: tab === t.id ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
          {lastSaved && <span style={{ fontSize: 11, color: '#999' }}>저장됨 {lastSaved}</span>}
          <button
            onClick={handleSave}
            style={{
              padding: '5px 14px', borderRadius: 6, border: '1px solid #ddd',
              background: saving ? '#f5f5f5' : '#111', color: saving ? '#999' : '#fff',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? '저장 중...' : '스펙 저장'}
          </button>
        </div>
      </div>

      {tab === 'typography' && <TypographySection />}
      {tab === 'color' && <ColorSection />}
      {tab === 'space' && <SpaceShapeSection />}
      {tab === 'buttons' && <ButtonStylesSection />}
      {tab === 'components' && <ComponentsSection spec={spec} update={update} />}
      {tab === 'compositions' && <CompositionsSection spec={spec} update={update} />}
    </div>
  )
}
