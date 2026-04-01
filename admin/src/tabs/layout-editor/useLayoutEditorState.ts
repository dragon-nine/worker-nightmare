/** 레이아웃 에디터 코어 상태 — 요소 CRUD, 선택, 자동 맞춤 */

import { useState, useCallback } from 'react'
import type { LayoutElement, GroupElement, AnchorElement, LayoutIndex } from './types'
import { DESIGN_W, PHONE_PREVIEW_W, PHONE_PREVIEW_H, DEFAULT_PADDING, DEFAULT_GAP } from './constants'
import { computePreviewLayout } from './layout-compute'
import type { ImageSizeMap } from './useImageSizes'

export interface EditorState {
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
  dirty: boolean
  saving: boolean
  loading: boolean
}

function makeId() {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export { makeId }

export const INITIAL_STATE: EditorState = {
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
  dirty: false,
  saving: false,
  loading: true,
}

export function useLayoutEditorState(imageSizes: ImageSizeMap) {
  const [state, setState] = useState<EditorState>(INITIAL_STATE)

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
    let newEl: LayoutElement | null = null

    setState((prev) => {
      const maxOrder = prev.elements
        .filter((e): e is GroupElement => e.positioning === 'group')
        .reduce((max, e) => Math.max(max, e.order), -1)

      const isFull = type !== 'image'
      const w = isFull ? DESIGN_W - prev.padding.left - prev.padding.right : 200

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
        el.widthPx = 77
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

      newEl = el
      return {
        ...prev,
        elements: [...prev.elements, el],
        selectedId: id,
        dirty: true,
      }
    })
    return id
  }, [])

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

  // Change positioning (group ↔ anchor)
  const changePositioning = useCallback((id: string, positioning: 'group' | 'anchor') => {
    setState((prev) => {
      const el = prev.elements.find((e) => e.id === id)
      if (!el || el.positioning === positioning) return prev
      const maxOrder = prev.elements
        .filter((e): e is GroupElement => e.positioning === 'group')
        .reduce((max, e) => Math.max(max, e.order), -1)
      let updated: LayoutElement
      if (positioning === 'anchor') {
        const groupEl = el as GroupElement
        const { order: _o, gapPx: _g, hGapPx: _h, positioning: _p, ...rest } = groupEl
        updated = { ...rest, positioning: 'anchor', anchor: 'top-left' as const, offsetX: 20, offsetY: 20 }
      } else {
        const anchorEl = el as AnchorElement
        const { anchor: _a, offsetX: _ox, offsetY: _oy, positioning: _p, ...rest } = anchorEl
        updated = { ...rest, positioning: 'group', order: maxOrder + 1, gapPx: 8 }
      }
      return {
        ...prev,
        dirty: true,
        elements: prev.elements.map((e) => e.id === id ? updated : e),
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

  // Set image for element (called after image size is loaded externally)
  const setElementImageInState = useCallback((id: string, assetKey: string) => {
    setState((prev) => ({
      ...prev,
      dirty: true,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, assetKey, type: 'image' as const } as LayoutElement : el,
      ),
    }))
  }, [])

  // Update padding
  const updatePadding = useCallback((patch: Partial<EditorState['padding']>) => {
    setState((prev) => ({ ...prev, padding: { ...prev.padding, ...patch }, dirty: true }))
  }, [])

  // Update bg
  const updateBg = useCallback((patch: Partial<Pick<EditorState, 'bgType' | 'bgColor' | 'bgGradient' | 'bgAssetKey'>>) => {
    setState((prev) => ({ ...prev, ...patch, dirty: true }))
  }, [])

  // 자동 맞춤
  const autoFit = useCallback(() => {
    setState((prev) => {
      const { padding } = prev
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

      // 2단계: 이미지 축소
      const scale = PHONE_PREVIEW_W / DESIGN_W
      const padTop = padding.top * scale
      const padBottom = padding.bottom * scale
      const maxContentH = PHONE_PREVIEW_H - padTop - padBottom

      for (let i = 0; i < 20; i++) {
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

        elements = elements.map((el) => {
          if (el.positioning === 'group' && el.type === 'image') {
            return { ...el, widthPx: Math.round(el.widthPx * 0.85) }
          }
          return el
        }) as LayoutElement[]
      }

      // 3단계: 실제 요소 높이 합 계산
      const zeroGapEls = elements.map((el) => {
        if (el.positioning !== 'group') return el
        return { ...el, gapPx: 0 }
      }) as LayoutElement[]
      const zeroPositions = computePreviewLayout(zeroGapEls, PHONE_PREVIEW_W, PHONE_PREVIEW_H, imageSizes, 'top', padding)

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
  }, [imageSizes])

  return {
    state,
    setState,
    selectElement,
    updateElement,
    addElement,
    removeElement,
    duplicateElement,
    changePositioning,
    setParent,
    setElementImageInState,
    updatePadding,
    updateBg,
    autoFit,
  }
}
