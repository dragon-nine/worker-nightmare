/** 레이아웃 에디터 I/O — 저장, 로드, 화면 생성 (R2 연동) */

import { useCallback, useEffect } from 'react'
import type { ScreenLayout, LayoutIndex } from './types'
import { R2_LAYOUT_INDEX_KEY, DESIGN_W, DEFAULT_SCREENS, DEFAULT_PADDING } from './constants'
import { getJson, putJson, uploadBlob } from '../../api'
import type { EditorState } from './useLayoutEditorState'
import type { ImageSizeMap } from './useImageSizes'

const R2_PUBLIC = 'https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev'

export function useLayoutEditorIO(
  state: EditorState,
  setState: React.Dispatch<React.SetStateAction<EditorState>>,
  gameId: string,
  loadImageSizes: (
    imageEls: { id: string; assetKey?: string }[],
    gameId: string,
    screenKey: string,
  ) => Promise<ImageSizeMap>,
  resetImageSizes: (sizes: ImageSizeMap) => void,
) {
  // Load index
  useEffect(() => {
    (async () => {
      let index = await getJson<LayoutIndex>(R2_LAYOUT_INDEX_KEY).catch(() => null)
      if (!index || !index.screens.length) {
        index = { screens: DEFAULT_SCREENS.map((s) => ({ ...s, updatedAt: new Date().toISOString() })) }
      }
      const order = DEFAULT_SCREENS.map((s) => s.key)
      const sorted = [...index.screens].sort((a, b) => {
        const ai = order.indexOf(a.key)
        const bi = order.indexOf(b.key)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
      setState((prev) => ({ ...prev, screens: sorted, loading: false }))
    })()
  }, [setState])

  // Load screen
  const loadScreen = useCallback(async (key: string) => {
    setState((prev) => ({ ...prev, screenKey: key, loading: true, selectedId: null }))
    try {
      const url = `${R2_PUBLIC}/layout-editor/drafts/${gameId}/${key}.json?t=${Date.now()}`
      const res = await fetch(url)
      if (res.ok) {
        const layout: ScreenLayout = await res.json()
        const imageEls = layout.elements.filter((e) => e.type === 'image')
        const sizes = await loadImageSizes(imageEls, gameId, layout.screen)
        resetImageSizes(sizes)
        setState((prev) => ({
          ...prev,
          elements: layout.elements,
          groupVAlign: 'center',
          padding: layout.padding || { ...DEFAULT_PADDING },
          bgType: layout.bgType || 'solid',
          bgColor: layout.bgColor || '#000000',
          bgGradient: layout.bgGradient || 'Wine → Black',
          bgAssetKey: layout.bgAssetKey || '',
          loading: false,
          dirty: false,
        }))
      } else {
        resetImageSizes({})
        setState((prev) => ({ ...prev, elements: [], loading: false, dirty: false }))
      }
    } catch {
      resetImageSizes({})
      setState((prev) => ({ ...prev, elements: [], loading: false, dirty: false }))
    }
  }, [gameId, setState, loadImageSizes, resetImageSizes])

  // Auto-load first screen
  useEffect(() => {
    if (state.screens.length > 0 && !state.screenKey) {
      loadScreen(state.screens[0].key)
    }
  }, [state.screens, state.screenKey, loadScreen])

  // Save
  const save = useCallback(async () => {
    if (!state.screenKey) return
    setState((prev) => ({ ...prev, saving: true }))
    try {
      const layout: ScreenLayout = {
        screen: state.screenKey,
        designWidth: DESIGN_W,
        elements: state.elements,
        groupVAlign: 'center',
        padding: state.padding,
        bgType: state.bgType,
        bgColor: state.bgColor,
        bgGradient: state.bgGradient,
        bgAssetKey: state.bgAssetKey || undefined,
      }
      const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
      const file = new File([blob], `${state.screenKey}.json`, { type: 'application/json' })
      await uploadBlob(file, `layout-editor/drafts/${gameId}/`)

      const now = new Date().toISOString()
      const screens = state.screens.map((s) =>
        s.key === state.screenKey ? { ...s, updatedAt: now } : s,
      )
      await putJson(R2_LAYOUT_INDEX_KEY, { screens })

      setState((prev) => ({ ...prev, saving: false, dirty: false, screens }))
    } catch {
      setState((prev) => ({ ...prev, saving: false }))
    }
  }, [state.screenKey, state.elements, state.groupVAlign, state.bgColor, state.screens, gameId, setState])

  // Create screen
  const createScreen = useCallback(async (key: string, label: string) => {
    const screens = [...state.screens, { key, label, updatedAt: new Date().toISOString() }]
    await putJson(R2_LAYOUT_INDEX_KEY, { screens })
    setState((prev) => ({ ...prev, screens }))
    loadScreen(key)
  }, [state.screens, loadScreen, setState])

  return { loadScreen, save, createScreen }
}
