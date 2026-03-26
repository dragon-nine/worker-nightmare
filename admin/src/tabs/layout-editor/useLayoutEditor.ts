/** 레이아웃 에디터 핵심 상태 관리 훅 */

import { useState, useCallback, useEffect } from 'react'
import type { LayoutElement, ScreenLayout, LayoutIndex, GroupElement, AnchorElement } from './types'
import { R2_LAYOUT_INDEX_KEY, DESIGN_W, PHONE_PREVIEW_W, PHONE_PREVIEW_H, DEFAULT_SCREENS, DEFAULT_GAP, DEFAULT_PADDING } from './constants'
import { getJson, putJson, uploadBlob } from '../../api'
import { computePreviewLayout } from './layout-compute'

const R2_PUBLIC = 'https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev'

interface EditorState {
  screenKey: string
  screens: LayoutIndex['screens']
  elements: LayoutElement[]
  groupVAlign: 'center' | 'top'
  padding: { top: number; right: number; bottom: number; left: number }
  bgType: 'transparent' | 'solid' | 'gradient' | 'image'
  bgColor: string
  bgGradient: string
  bgAssetKey: string
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
    padding: { ...DEFAULT_PADDING },
    bgType: 'solid',
    bgColor: '#000000',
    bgGradient: 'Wine → Black',
    bgAssetKey: '',
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
      // DEFAULT_SCREENS 순서로 정렬, 나머지는 뒤에
      const order = DEFAULT_SCREENS.map((s) => s.key)
      const sorted = [...index.screens].sort((a, b) => {
        const ai = order.indexOf(a.key)
        const bi = order.indexOf(b.key)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
      setState((prev) => ({ ...prev, screens: sorted, loading: false }))
    })()
  }, [])

  // Load screen
  const loadScreen = useCallback(async (key: string) => {
    setState((prev) => ({ ...prev, screenKey: key, loading: true, selectedId: null }))
    try {
      const url = `${R2_PUBLIC}/layout-editor/drafts/${gameId}/${key}.json?t=${Date.now()}`
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
          groupVAlign: 'center',  // 화면 레벨은 항상 center
          padding: layout.padding || { ...DEFAULT_PADDING },
          bgType: layout.bgType || 'solid',
          bgColor: layout.bgColor || '#000000',
          bgGradient: layout.bgGradient || 'Wine → Black',
          bgAssetKey: layout.bgAssetKey || '',
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
  const addElement = useCallback((type: string, positioning: 'group' | 'anchor' = 'group') => {
    const id = makeId()
    const maxOrder = state.elements
      .filter((e): e is GroupElement => e.positioning === 'group')
      .reduce((max, e) => Math.max(max, e.order), -1)

    const isFull = type !== 'image'
    const w = isFull ? DESIGN_W - state.padding.left - state.padding.right : 200

    const base = { id, type, widthMode: isFull ? 'full' as const : 'fixed' as const, widthPx: w, visible: true, locked: false }

    let el: LayoutElement
    if (positioning === 'group') {
      el = { ...base, positioning: 'group', order: maxOrder + 1, gapPx: DEFAULT_GAP } as GroupElement
    } else {
      el = { ...base, positioning: 'anchor', anchor: 'top-left', offsetX: 20, offsetY: 20 } as AnchorElement
    }

    if (type === 'text') {
      el.label = '텍스트'
      el.textStyle = { fontSizePx: 22, color: '#ffffff', scaleKey: 'md' }
    } else if (type === 'button') {
      el.label = '버튼'
      el.buttonStyle = { styleType: 'outline', bgColor: '#24282c', scaleKey: 'lg' }
    } else if (type === 'card') {
      el.label = '카드'
      el.innerPadding = { top: 20, right: 16, bottom: 20, left: 16 }
    } else if (type === 'modal') {
      el.label = '모달'
      el.innerPadding = { top: 48, right: 20, bottom: 24, left: 20 }
    } else if (type === 'toggle') {
      el.widthMode = 'fixed'
      el.widthPx = 77  // 44 * 1.75
      el.heightPx = 44
      el.label = '토글'
    } else if (type === 'close') {
      el.widthMode = 'fixed'
      el.widthPx = 32
      el.heightPx = 32
      el.label = '닫기'
    } else if (type === 'gauge') {
      el.heightPx = 28
      el.label = '게이지'
    } else if (type === 'circle-btn') {
      el.widthMode = 'fixed'
      el.widthPx = 80
      el.heightPx = 80
      el.label = '원형 버튼'
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

  // Set parent (nest element inside card/modal)
  const setParent = useCallback((childId: string, parentId: string | undefined) => {
    setState((prev) => ({
      ...prev,
      dirty: true,
      elements: prev.elements.map((el) =>
        el.id === childId ? { ...el, parentId } as LayoutElement : el,
      ),
    }))
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

  // Update padding
  const updatePadding = useCallback((patch: Partial<EditorState['padding']>) => {
    setState((prev) => ({ ...prev, padding: { ...prev.padding, ...patch }, dirty: true }))
  }, [])

  // 자동 맞춤 — 모든 요소를 패딩 박스 안에 맞춤 (너비 + 높이 + 간격)
  const autoFit = useCallback(() => {
    setState((prev) => {
      const { padding, imageSizes } = prev
      const contentW = DESIGN_W - padding.left - padding.right
      const MIN_GAP = 4

      // 1단계: 너비 맞춤
      let elements = prev.elements.map((el) => {
        if (el.positioning === 'anchor') {
          return { ...el, widthPx: Math.min(el.widthPx, contentW) }
        }
        if (el.positioning === 'group') {
          if (el.type === 'image') {
            return { ...el, widthMode: 'fixed' as const, widthPx: Math.min(el.widthPx, contentW) }
          }
          return { ...el, widthMode: 'full' as const, widthPx: contentW }
        }
        return el
      }) as LayoutElement[]

      // 행 정보
      const groupEls = elements.filter((e): e is GroupElement => e.positioning === 'group')
      const rowOrders = [...new Set(groupEls.map((e) => e.order))].sort((a, b) => a - b)
      const rowCount = rowOrders.length
      const gapSlots = Math.max(0, rowCount - 1)

      // 2단계: 이미지 축소 — 실제 렌더 결과로 확인
      const scale = PHONE_PREVIEW_W / DESIGN_W
      const padTop = padding.top * scale
      const padBottom = padding.bottom * scale
      const maxContentH = PHONE_PREVIEW_H - padTop - padBottom

      for (let i = 0; i < 20; i++) {
        // 임시 gap으로 렌더링
        const testEls = elements.map((el) => {
          if (el.positioning !== 'group') return el
          const isFirst = (el as GroupElement).order === rowOrders[0]
          return { ...el, gapPx: isFirst ? 0 : MIN_GAP }
        }) as LayoutElement[]

        const positions = computePreviewLayout(testEls, PHONE_PREVIEW_W, PHONE_PREVIEW_H, imageSizes, 'top', padding)
        if (positions.length === 0) break

        const maxY = Math.max(...positions.map((p) => p.y + p.h * (1 - p.originY)))
        const usedH = maxY - padTop
        if (usedH <= maxContentH) break

        // 이미지 축소
        elements = elements.map((el) => {
          if (el.positioning === 'group' && el.type === 'image') {
            return { ...el, widthPx: Math.round(el.widthPx * 0.85) }
          }
          return el
        }) as LayoutElement[]
      }

      // 3단계: 실제 요소 높이 합 계산 (gap=0으로)
      const zeroGapEls = elements.map((el) => {
        if (el.positioning !== 'group') return el
        const isFirst = (el as GroupElement).order === rowOrders[0]
        return { ...el, gapPx: isFirst ? 0 : 0 }
      }) as LayoutElement[]
      const zeroPositions = computePreviewLayout(zeroGapEls, PHONE_PREVIEW_W, PHONE_PREVIEW_H, imageSizes, 'top', padding)

      // 행별 bottom 위치로 총 높이 계산
      const rowBottoms = new Map<number, number>()
      const rowTops = new Map<number, number>()
      for (const pos of zeroPositions) {
        const el = elements.find((e) => e.id === pos.id) as GroupElement | undefined
        if (!el || el.positioning !== 'group') continue
        const top = pos.y - pos.h * pos.originY
        const bottom = pos.y + pos.h * (1 - pos.originY)
        rowBottoms.set(el.order, Math.max(rowBottoms.get(el.order) || 0, bottom))
        rowTops.set(el.order, Math.min(rowTops.get(el.order) || Infinity, top))
      }

      const totalElH = rowOrders.reduce((sum, order) => {
        return sum + (rowBottoms.get(order) || 0) - (rowTops.get(order) || 0)
      }, 0)

      // 4단계: 간격 균등 배분
      const gap = gapSlots > 0
        ? Math.max(MIN_GAP, Math.floor((maxContentH - totalElH) / gapSlots / scale))
        : 0

      // 5단계: 적용
      const firstOrder = rowOrders[0]
      elements = elements.map((el) => {
        if (el.positioning === 'group') {
          const isFirst = (el as GroupElement).order === firstOrder
          return { ...el, gapPx: isFirst ? 0 : gap }
        }
        return el
      }) as LayoutElement[]

      return { ...prev, elements, dirty: true }
    })
  }, [])

  // Update bg
  const updateBg = useCallback((patch: Partial<Pick<EditorState, 'bgType' | 'bgColor' | 'bgGradient' | 'bgAssetKey'>>) => {
    setState((prev) => ({ ...prev, ...patch, dirty: true }))
  }, [])

  return {
    ...state,
    loadScreen,
    selectElement,
    updateElement,
    addElement,
    removeElement,
    duplicateElement,
    setParent,
    setElementImage,
    save,
    createScreen,
    autoFit,
    updatePadding,
    updateBg,
  }
}
