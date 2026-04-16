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

interface ShiftState {
  target: SelectableLike | null
  anchor: { x: number; y: number } | null
  focus: { x: number; y: number } | null
}

const states = new WeakMap<object, ShiftState>()

function getState(renderer: object): ShiftState {
  let s = states.get(renderer)
  if (!s) {
    s = { anchor: null, focus: null, target: null }
    states.set(renderer, s)
  }
  return s
}

export function resetSelectionShiftState(renderer: object): void {
  states.set(renderer, { anchor: null, focus: null, target: null })
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

function liveDiffersFromCache(live: SelectionLike, state: ShiftState): boolean {
  if (!state.anchor || !state.focus) return true
  return (
    live.anchor.x !== state.anchor.x ||
    live.anchor.y !== state.anchor.y ||
    live.focus.x !== state.focus.x ||
    live.focus.y !== state.focus.y
  )
}

export function shiftSelectionByScroll(renderer: RendererSelectionApi, deltaLines: number): void {
  if (deltaLines === 0) return

  const live = renderer.getSelection()

  if (!live?.isActive) {
    resetSelectionShiftState(renderer)
    return
  }

  if (live.isDragging) return

  const state = getState(renderer)

  if (liveDiffersFromCache(live, state)) {
    const target = pickSelectionTarget(live) ?? state.target
    if (target) {
      state.target = target
      state.anchor = { x: live.anchor.x, y: live.anchor.y }
      state.focus = { x: live.focus.x, y: live.focus.y }
    }
  }

  if (!state.target || !state.anchor || !state.focus) return

  const anchor = { x: state.anchor.x, y: state.anchor.y - deltaLines }
  const focus = { x: state.focus.x, y: state.focus.y - deltaLines }
  state.anchor = anchor
  state.focus = focus

  renderer.startSelection(state.target, anchor.x, anchor.y)
  renderer.updateSelection(state.target, focus.x, focus.y, { finishDragging: true })
}
