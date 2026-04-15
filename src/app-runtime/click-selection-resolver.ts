import type { MouseEvent as OtuiMouseEvent } from '@opentui/core'

import type { TabSession } from '../state/types'

import { logInputDebug } from '../debug/input-log'
import { getLineText, getWordAtColumn } from '../input/terminal-text-extraction'

interface PositionedNode {
  id?: string
  parent?: unknown
  selectable?: boolean
  x: number
  y: number
}

export interface ClickSelectionResult {
  selectedText: string
  startCol: number
  endCol: number
  baseX: number
  eventY: number
  target: unknown
}

export function isPositionedNode(value: unknown): value is PositionedNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'x') === 'number' &&
    typeof Reflect.get(value, 'y') === 'number'
  )
}

export function resolveClickSelection(
  event: OtuiMouseEvent,
  targetTabId: string,
  tab: TabSession | undefined,
  clickCount: number
): ClickSelectionResult | null {
  if (!event.target) {
    return null
  }

  const viewportText = event.target
  if (!isPositionedNode(viewportText)) {
    return null
  }

  const col = event.x - viewportText.x
  const row = event.y - viewportText.y
  const baseX = viewportText.x

  logInputDebug('click.detect', {
    clickCount,
    col,
    eventX: event.x,
    eventY: event.y,
    row,
    targetId: event.target.id,
    viewportX: viewportText.x,
    viewportY: viewportText.y,
  })

  if (!tab?.viewport?.lines[row]) {
    logInputDebug('click.noViewportLine', {
      hasViewport: !!tab?.viewport,
      lineCount: tab?.viewport?.lines.length ?? 0,
      row,
      tabFound: !!tab,
      targetTabId,
    })
    return null
  }

  const line = tab.viewport.lines[row]
  const lineText = getLineText(line)

  let selectedText: string
  let startCol: number
  let endCol: number

  if (clickCount === 2) {
    const word = getWordAtColumn(lineText, col)
    if (word.text.length === 0) {
      logInputDebug('click.emptyWord', {
        charAtCol: lineText[col] ?? 'OOB',
        col,
        lineText,
        row,
      })
      return null
    }

    selectedText = word.text
    startCol = word.startCol
    endCol = word.endCol
  } else {
    selectedText = lineText
    startCol = 0
    endCol = lineText.length
  }

  logInputDebug('click.selection', {
    baseX,
    clickCount,
    endCol,
    endX: baseX + endCol,
    lineText,
    selectedText,
    spanCount: line.spans.length,
    spanStyles: line.spans.map((span) => ({
      bold: span.bold,
      italic: span.italic,
      underline: span.underline,
    })),
    spanTexts: line.spans.map((span) => span.text),
    startCol,
    startX: baseX + startCol,
    y: event.y,
  })

  return {
    baseX,
    endCol,
    eventY: event.y,
    selectedText,
    startCol,
    target: event.target,
  }
}
