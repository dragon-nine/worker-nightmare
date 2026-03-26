/** 레이아웃 에디터 핵심 상태 관리 훅 */

import { useState, useCallback, useEffect } from 'react'
import type { LayoutElement, ScreenLayout, LayoutIndex, GroupElement, AnchorElement } from './types'
import { R2_LAYOUT_INDEX_KEY, DESIGN_W, DEFAULT_SCREENS } from './constants'
import { getJson, putJson, uploadBlob } from '../../api'

const R2_PUBLIC = 'https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev'

interface EditorState {
  screenKey: string
  screens: LayoutIndex['screens']
  elements: LayoutElement[]
  groupVAlign: 'center' | 'top'
  bgColor: string
  selectedId: string | null
  imageSizes: Record<string, { w: number; h: number }>
  dirty: boolean
  saving: boolean
  loading: boolean
}

function makeId() {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function useLayoutEditor(gameId: string) {
  const [state, setState] = useState<EditorState>({
    screenKey: '',
    screens: [],
    elements: [],
    groupVAlign: 'center',
    bgColor: '#000000',
    selectedId: null,
    imageSizes: {},
    dirty: false,
    saving: false,
    loading: true,
  })

  // Load index
  useEffect(() => {
    (async () => {
      let index = await getJson<LayoutIndex>(R2_LAYOUT_INDEX_KEY).catch(() => null)
      if (!index || !index.screens.length) {
        index = { screens: DEFAULT_SCREENS.map((s) => ({ ...s, updatedAt: new Date().toISOString() })) }
      }
      setState((prev) => ({ ...prev, screens: index!.screens, loading: false }))
    })()
  }, [])

  // Load screen
  const loadScreen = useCallback(async (key: string) => {
    setState((prev) => ({ ...prev, screenKey: key, loading: true, selectedId: null }))
    try {
      const url = `${R2_PUBLIC}/${gameId}/layout/${key}.json?t=${Date.now()}`
      const res = await fetch(url)
      if (res.ok) {
        const layout: ScreenLayout = await res.json()
        const sizes: Record<string, { w: number; h: number }> = {}
        const imageEls = layout.elements.filter((e) => e.type === 'image')
        await Promise.all(
          imageEls.map((el) =>
            new Promise<void>((resolve) => {
              const assetUrl = el.assetKey
                ? `${R2_PUBLIC}/${el.assetKey}`
                : `${R2_PUBLIC}/${gameId}/${layout.screen}/${el.id}.png`
              const img = new Image()
              img.onload = () => { sizes[el.id] = { w: img.naturalWidth, h: img.naturalHeight }; resolve() }
              img.onerror = () => resolve()
              img.src = assetUrl
            }),
          ),
        )
        setState((prev) => ({
          ...prev,
          elements: layout.elements,
          groupVAlign: layout.groupVAlign || 'center',
          bgColor: layout.bgColor || '#000000',
          imageSizes: sizes,
          loading: false,
          dirty: false,
        }))
      } else {
        setState((prev) => ({ ...prev, elements: [], imageSizes: {}, loading: false, dirty: false }))
      }
    } catch {
      setState((prev) => ({ ...prev, elements: [], imageSizes: {}, loading: false, dirty: false }))
    }
  }, [gameId])

  // Auto-load first screen
  useEffect(() => {
    if (state.screens.length > 0 && !state.screenKey) {
      loadScreen(state.screens[0].key)
    }
  }, [state.screens, state.screenKey, loadScreen])

  // Select element
  const selectElement = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedId: id }))
  }, [])

  // Update element
  const updateElement = useCallback((id: string, patch: Partial<LayoutElement>) => {
    setState((prev) => ({
      ...prev,
      dirty: true,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } as LayoutElement : el)),
    }))
  }, [])

  // Add element
  const addElement = useCallback((type: 'text' | 'image' | 'button', positioning: 'group' | 'anchor' = 'group') => {
    const id = makeId()
    const maxOrder = state.elements
      .filter((e): e is GroupElement => e.positioning === 'group')
      .reduce((max, e) => Math.max(max, e.order), -1)

    const base = { id, type, widthPx: 200, visible: true, locked: false }

    let el: LayoutElement
    if (positioning === 'group') {
      el = { ...base, positioning: 'group', order: maxOrder + 1, gapPx: 16 } as GroupElement
    } else {
      el = { ...base, positioning: 'anchor', anchor: 'top-left', offsetX: 20, offsetY: 20 } as AnchorElement
    }

    if (type === 'text') {
      el.label = '텍스트'
      el.textStyle = { fontSizePx: 22, color: '#ffffff' }
    } else if (type === 'button') {
      el.label = '버튼'
      el.buttonStyle = { styleType: 'outline', bgColor: '#24282c', scaleKey: 'lg' }
    }

    setState((prev) => ({
      ...prev,
      elements: [...prev.elements, el],
      selectedId: id,
      dirty: true,
    }))
    return id
  }, [state.elements])

  // Remove element
  const removeElement = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
      dirty: true,
    }))
  }, [])

  // Duplicate element
  const duplicateElement = useCallback((id: string) => {
    setState((prev) => {
      const source = prev.elements.find((e) => e.id === id)
      if (!source) return prev
      const newId = makeId()
      const clone = { ...source, id: newId } as LayoutElement
      if (clone.positioning === 'group') {
        (clone as GroupElement).order += 1
      }
      return {
        ...prev,
        elements: [...prev.elements, clone],
        selectedId: newId,
        dirty: true,
      }
    })
  }, [])

  // Set image for element
  const setElementImage = useCallback((id: string, assetKey: string, url: string) => {
    const img = new Image()
    img.onload = () => {
      setState((prev) => ({
        ...prev,
        dirty: true,
        imageSizes: { ...prev.imageSizes, [id]: { w: img.naturalWidth, h: img.naturalHeight } },
        elements: prev.elements.map((el) =>
          el.id === id ? { ...el, assetKey, type: 'image' as const } as LayoutElement : el,
        ),
      }))
    }
    img.src = url
  }, [])

  // Save
  const save = useCallback(async () => {
    if (!state.screenKey) return
    setState((prev) => ({ ...prev, saving: true }))
    try {
      const layout: ScreenLayout = {
        screen: state.screenKey,
        designWidth: DESIGN_W,
        elements: state.elements,
        groupVAlign: state.groupVAlign,
        bgColor: state.bgColor,
      }
      const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
      const file = new File([blob], `${state.screenKey}.json`, { type: 'application/json' })
      await uploadBlob(file, `${gameId}/layout/`)

      // Update index
      const now = new Date().toISOString()
      const screens = state.screens.map((s) =>
        s.key === state.screenKey ? { ...s, updatedAt: now } : s,
      )
      await putJson(R2_LAYOUT_INDEX_KEY, { screens })

      setState((prev) => ({ ...prev, saving: false, dirty: false, screens }))
    } catch {
      setState((prev) => ({ ...prev, saving: false }))
    }
  }, [state.screenKey, state.elements, state.groupVAlign, state.bgColor, state.screens, gameId])

  // Create screen
  const createScreen = useCallback(async (key: string, label: string) => {
    const screens = [...state.screens, { key, label, updatedAt: new Date().toISOString() }]
    await putJson(R2_LAYOUT_INDEX_KEY, { screens })
    setState((prev) => ({ ...prev, screens }))
    loadScreen(key)
  }, [state.screens, loadScreen])

  // Update bg
  const setBgColor = useCallback((bgColor: string) => {
    setState((prev) => ({ ...prev, bgColor, dirty: true }))
  }, [])

  const setGroupVAlign = useCallback((groupVAlign: 'center' | 'top') => {
    setState((prev) => ({ ...prev, groupVAlign, dirty: true }))
  }, [])

  return {
    ...state,
    loadScreen,
    selectElement,
    updateElement,
    addElement,
    removeElement,
    duplicateElement,
    setElementImage,
    save,
    createScreen,
    setBgColor,
    setGroupVAlign,
  }
}
