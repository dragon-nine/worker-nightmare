/** 레이아웃 에디터 핵심 상태 관리 훅 — 서브 훅 조합 */

import { useCallback } from 'react'
import { useImageSizes } from './useImageSizes'
import { useLayoutEditorState } from './useLayoutEditorState'
import { useLayoutEditorIO } from './useLayoutEditorIO'

export function useLayoutEditor(gameId: string) {
  const { imageSizes, loadImageSizes, loadSingleImageSize, resetImageSizes } = useImageSizes()

  const {
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
  } = useLayoutEditorState(imageSizes)

  const { loadScreen, save, createScreen } = useLayoutEditorIO(
    state,
    setState,
    gameId,
    loadImageSizes,
    resetImageSizes,
  )

  // Set image for element — bridges image sizing + state update
  const setElementImage = useCallback((id: string, assetKey: string, url: string) => {
    loadSingleImageSize(id, url).then(() => {
      setElementImageInState(id, assetKey)
    })
  }, [loadSingleImageSize, setElementImageInState])

  return {
    ...state,
    imageSizes,
    loadScreen,
    selectElement,
    updateElement,
    addElement,
    removeElement,
    duplicateElement,
    setParent,
    changePositioning,
    setElementImage,
    save,
    createScreen,
    autoFit,
    updatePadding,
    updateBg,
  }
}
