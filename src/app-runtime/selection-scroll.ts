interface SelectableLike {
  selectable?: boolean
}

interface SelectionLike {
  isActive: boolean
  isDragging: boolean
  anchor: { x: number; y: number }
  focus: { x: number; y: number }
  selectedRenderables: SelectableLike[]
  touchedRenderables: SelectableLike[]
}

export interface RendererSelectionApi {
  getSelection(): SelectionLike | null
  startSelection(target: unknown, x: number, y: number): void
  updateSelection(target: unknown, x: number, y: number, opts: { finishDragging: boolean }): void
  clearSelection(): void
}

function pickSelectionTarget(selection: SelectionLike): SelectableLike | null {
  for (const r of selection.selectedRenderables) {
    if (r?.selectable) return r
  }
  for (const r of selection.touchedRenderables) {
    if (r?.selectable) return r
  }
  return null
}

export function shiftSelectionByScroll(renderer: RendererSelectionApi, deltaLines: number): void {
  if (deltaLines === 0) return

  const selection = renderer.getSelection()
  if (!selection || !selection.isActive || selection.isDragging) return

  const target = pickSelectionTarget(selection)
  if (!target) {
    renderer.clearSelection()
    return
  }

  const anchorX = selection.anchor.x
  const anchorY = selection.anchor.y - deltaLines
  const focusX = selection.focus.x
  const focusY = selection.focus.y - deltaLines

  renderer.startSelection(target, anchorX, anchorY)
  renderer.updateSelection(target, focusX, focusY, { finishDragging: true })
}
