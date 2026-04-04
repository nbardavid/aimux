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

  const lineBox = event.target.parent
  if (!isPositionedNode(lineBox)) {
    return null
  }

  const contentBox = lineBox.parent
  if (!isPositionedNode(contentBox)) {
    return null
  }

  const col = event.x - contentBox.x
  const row = event.y - contentBox.y
  const baseX = lineBox.x

  logInputDebug('click.detect', {
    eventX: event.x,
    eventY: event.y,
    contentBoxX: contentBox.x,
    contentBoxY: contentBox.y,
    col,
    row,
    clickCount,
    targetId: event.target.id,
  })

  if (!tab?.viewport?.lines[row]) {
    logInputDebug('click.noViewportLine', {
      targetTabId,
      row,
      tabFound: !!tab,
      hasViewport: !!tab?.viewport,
      lineCount: tab?.viewport?.lines.length ?? 0,
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
        col,
        row,
        lineText,
        charAtCol: lineText[col] ?? 'OOB',
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
    clickCount,
    selectedText,
    startCol,
    endCol,
    baseX,
    startX: baseX + startCol,
    endX: baseX + endCol,
    y: event.y,
    lineText,
    spanCount: line.spans.length,
    spanTexts: line.spans.map((span) => span.text),
    spanStyles: line.spans.map((span) => ({
      bold: span.bold,
      italic: span.italic,
      underline: span.underline,
    })),
  })

  return {
    selectedText,
    startCol,
    endCol,
    baseX,
    eventY: event.y,
    target: event.target,
  }
}
