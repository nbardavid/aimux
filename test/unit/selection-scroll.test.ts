import { describe, expect, mock, test } from 'bun:test'

import {
  type RendererSelectionApi,
  resetSelectionShiftState,
  shiftSelectionByScroll,
} from '../../src/app-runtime/selection-scroll'

interface TestRenderer extends RendererSelectionApi {
  startCalls: { target: unknown; x: number; y: number }[]
  updateCalls: { target: unknown; x: number; y: number; opts: { finishDragging: boolean } }[]
  clearCalls: number
}

function makeSelection(overrides?: {
  isActive?: boolean
  isDragging?: boolean
  anchor?: { x: number; y: number }
  focus?: { x: number; y: number }
  selectedRenderables?: { selectable?: boolean }[]
  touchedRenderables?: { selectable?: boolean }[]
}) {
  return {
    anchor: overrides?.anchor ?? { x: 3, y: 5 },
    focus: overrides?.focus ?? { x: 12, y: 8 },
    isActive: overrides?.isActive ?? true,
    isDragging: overrides?.isDragging ?? false,
    selectedRenderables: overrides?.selectedRenderables ?? [{ selectable: true }],
    touchedRenderables: overrides?.touchedRenderables ?? [],
  }
}

function makeRenderer(getSelection: () => ReturnType<typeof makeSelection> | null): TestRenderer {
  const startCalls: TestRenderer['startCalls'] = []
  const updateCalls: TestRenderer['updateCalls'] = []
  let clearCalls = 0
  return {
    get clearCalls() {
      return clearCalls
    },
    clearSelection: mock(() => {
      clearCalls += 1
    }),
    getSelection,
    get startCalls() {
      return startCalls
    },
    startSelection: mock((target, x, y) => {
      startCalls.push({ target, x, y })
    }),
    get updateCalls() {
      return updateCalls
    },
    updateSelection: mock((target, x, y, opts) => {
      updateCalls.push({ opts, target, x, y })
    }),
  }
}

describe('shiftSelectionByScroll', () => {
  test('shifts selection anchor and focus by -deltaLines on wheel down', () => {
    const target = { selectable: true }
    const renderer = makeRenderer(() =>
      makeSelection({
        anchor: { x: 3, y: 10 },
        focus: { x: 12, y: 14 },
        selectedRenderables: [target],
      })
    )
    resetSelectionShiftState(renderer)

    shiftSelectionByScroll(renderer, 3)

    expect(renderer.startCalls).toEqual([{ target, x: 3, y: 7 }])
    expect(renderer.updateCalls).toEqual([{ opts: { finishDragging: true }, target, x: 12, y: 11 }])
  })

  test('shifts selection by +|delta| on wheel up (negative delta)', () => {
    const target = { selectable: true }
    const renderer = makeRenderer(() =>
      makeSelection({
        anchor: { x: 3, y: 10 },
        focus: { x: 12, y: 14 },
        selectedRenderables: [target],
      })
    )
    resetSelectionShiftState(renderer)

    shiftSelectionByScroll(renderer, -3)

    expect(renderer.startCalls[0]).toMatchObject({ x: 3, y: 13 })
    expect(renderer.updateCalls[0]).toMatchObject({ x: 12, y: 17 })
  })

  test('is a no-op when delta is zero', () => {
    const renderer = makeRenderer(() => makeSelection())
    resetSelectionShiftState(renderer)
    shiftSelectionByScroll(renderer, 0)
    expect(renderer.startCalls).toHaveLength(0)
    expect(renderer.updateCalls).toHaveLength(0)
    expect(renderer.clearCalls).toBe(0)
  })

  test('resets state when selection becomes inactive', () => {
    const renderer = makeRenderer(() => null)
    resetSelectionShiftState(renderer)
    shiftSelectionByScroll(renderer, 5)
    expect(renderer.startCalls).toHaveLength(0)
  })

  test('does nothing while the user is actively dragging', () => {
    const renderer = makeRenderer(() => makeSelection({ isDragging: true }))
    resetSelectionShiftState(renderer)
    shiftSelectionByScroll(renderer, 5)
    expect(renderer.startCalls).toHaveLength(0)
  })

  test('persists cached target across off-screen scrolls', () => {
    const target = { selectable: true }
    let live: ReturnType<typeof makeSelection> | null = makeSelection({
      anchor: { x: 3, y: 10 },
      focus: { x: 12, y: 14 },
      selectedRenderables: [target],
    })
    const renderer = makeRenderer(() => live)
    resetSelectionShiftState(renderer)

    shiftSelectionByScroll(renderer, 3)
    expect(renderer.startCalls.at(-1)).toMatchObject({ target, x: 3, y: 7 })
    expect(renderer.updateCalls.at(-1)).toMatchObject({ target, x: 12, y: 11 })

    live = makeSelection({
      anchor: { x: 3, y: 7 },
      focus: { x: 12, y: 11 },
      selectedRenderables: [],
      touchedRenderables: [],
    })

    shiftSelectionByScroll(renderer, 20)
    expect(renderer.startCalls.at(-1)).toMatchObject({ target, x: 3, y: -13 })
    expect(renderer.updateCalls.at(-1)).toMatchObject({ target, x: 12, y: -9 })
    expect(renderer.clearCalls).toBe(0)

    live = makeSelection({
      anchor: { x: 3, y: -13 },
      focus: { x: 12, y: -9 },
      selectedRenderables: [],
      touchedRenderables: [],
    })

    shiftSelectionByScroll(renderer, -20)
    expect(renderer.startCalls.at(-1)).toMatchObject({ target, x: 3, y: 7 })
    expect(renderer.updateCalls.at(-1)).toMatchObject({ target, x: 12, y: 11 })
    expect(renderer.clearCalls).toBe(0)
  })

  test('re-seeds cache when live selection diverges (new selection)', () => {
    const first = { selectable: true }
    const second = { selectable: true }
    let live: ReturnType<typeof makeSelection> = makeSelection({
      anchor: { x: 1, y: 1 },
      focus: { x: 2, y: 2 },
      selectedRenderables: [first],
    })
    const renderer = makeRenderer(() => live)
    resetSelectionShiftState(renderer)

    shiftSelectionByScroll(renderer, 1)
    expect(renderer.startCalls.at(-1)).toMatchObject({ target: first, x: 1, y: 0 })

    live = makeSelection({
      anchor: { x: 10, y: 20 },
      focus: { x: 11, y: 21 },
      selectedRenderables: [second],
    })
    shiftSelectionByScroll(renderer, 5)
    expect(renderer.startCalls.at(-1)).toMatchObject({ target: second, x: 10, y: 15 })
    expect(renderer.updateCalls.at(-1)).toMatchObject({ target: second, x: 11, y: 16 })
  })
})
