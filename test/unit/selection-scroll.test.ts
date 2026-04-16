import { describe, expect, mock, test } from 'bun:test'

import {
  type RendererSelectionApi,
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

function makeRenderer(selection: ReturnType<typeof makeSelection> | null): TestRenderer {
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
    getSelection: () => selection,
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
    const renderer = makeRenderer(
      makeSelection({
        anchor: { x: 3, y: 10 },
        focus: { x: 12, y: 14 },
        selectedRenderables: [target],
      })
    )

    shiftSelectionByScroll(renderer, 3)

    expect(renderer.startCalls).toEqual([{ target, x: 3, y: 7 }])
    expect(renderer.updateCalls).toEqual([{ opts: { finishDragging: true }, target, x: 12, y: 11 }])
  })

  test('shifts selection by +|delta| on wheel up (negative delta)', () => {
    const target = { selectable: true }
    const renderer = makeRenderer(
      makeSelection({
        anchor: { x: 3, y: 10 },
        focus: { x: 12, y: 14 },
        selectedRenderables: [target],
      })
    )

    shiftSelectionByScroll(renderer, -3)

    expect(renderer.startCalls[0]).toMatchObject({ x: 3, y: 13 })
    expect(renderer.updateCalls[0]).toMatchObject({ x: 12, y: 17 })
  })

  test('is a no-op when delta is zero', () => {
    const renderer = makeRenderer(makeSelection())
    shiftSelectionByScroll(renderer, 0)
    expect(renderer.startCalls).toHaveLength(0)
    expect(renderer.updateCalls).toHaveLength(0)
    expect(renderer.clearCalls).toBe(0)
  })

  test('does nothing when there is no active selection', () => {
    const renderer = makeRenderer(null)
    shiftSelectionByScroll(renderer, 5)
    expect(renderer.startCalls).toHaveLength(0)
  })

  test('does nothing while the user is actively dragging', () => {
    const renderer = makeRenderer(makeSelection({ isDragging: true }))
    shiftSelectionByScroll(renderer, 5)
    expect(renderer.startCalls).toHaveLength(0)
  })

  test('clears selection when no selectable renderable is available', () => {
    const renderer = makeRenderer(
      makeSelection({
        selectedRenderables: [{ selectable: false }],
        touchedRenderables: [],
      })
    )

    shiftSelectionByScroll(renderer, 3)

    expect(renderer.clearCalls).toBe(1)
    expect(renderer.startCalls).toHaveLength(0)
  })

  test('falls back to touchedRenderables when selectedRenderables are not selectable', () => {
    const fallback = { selectable: true }
    const renderer = makeRenderer(
      makeSelection({
        selectedRenderables: [{ selectable: false }],
        touchedRenderables: [fallback],
      })
    )

    shiftSelectionByScroll(renderer, 2)

    expect(renderer.startCalls[0]?.target).toBe(fallback)
  })
})
