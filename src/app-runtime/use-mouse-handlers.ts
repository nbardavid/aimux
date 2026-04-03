import type { MouseEvent as OtuiMouseEvent } from '@opentui/core'

import { useRef } from 'react'

import type { TerminalContentOrigin } from '../input/raw-input-handler'
import type { SessionBackend } from '../session-backend/types'
import type { SplitDirection } from '../state/layout-tree'
import type { AppAction, AppState, TabSession } from '../state/types'

import { logInputDebug } from '../debug/input-log'
import { encodeMouseEventForPty } from '../input/mouse-forwarding'
import { MultiClickDetector } from '../input/multi-click-detector'
import { getLineText, getWordAtColumn } from '../input/terminal-text-extraction'
import { copyToSystemClipboard } from '../platform/clipboard'

interface UseMouseHandlersOptions {
  state: AppState
  dispatch: (action: AppAction) => void
  backend: SessionBackend
  renderer: {
    clearSelection(): void
    startSelection(target: unknown, x: number, y: number): void
    updateSelection(target: unknown, x: number, y: number, opts: { finishDragging: boolean }): void
  }
  activeMouseForwardingEnabled: boolean
  activeLocalScrollbackEnabled: boolean
}

export function useMouseHandlers({
  state,
  dispatch,
  backend,
  renderer,
  activeMouseForwardingEnabled,
  activeLocalScrollbackEnabled,
}: UseMouseHandlersOptions) {
  const separatorDragRef = useRef<{
    tabId: string
    direction: SplitDirection
    screenStart: number
    totalSize: number
  } | null>(null)
  const multiClickRef = useRef(new MultiClickDetector())

  const handleTerminalMouseEvent = (event: OtuiMouseEvent, origin: TerminalContentOrigin) => {
    if (
      state.focusMode !== 'terminal-input' ||
      !state.activeTabId ||
      !activeMouseForwardingEnabled
    ) {
      return
    }

    const sequence = encodeMouseEventForPty(event, origin)
    if (!sequence) {
      return
    }

    backend.write(state.activeTabId, sequence)
  }

  const handleTerminalScrollEvent = (event: OtuiMouseEvent) => {
    if (state.focusMode !== 'terminal-input' || !state.activeTabId) {
      return
    }

    if (activeMouseForwardingEnabled) {
      return
    }

    if (!activeLocalScrollbackEnabled || event.type !== 'scroll') {
      return
    }

    const direction = event.scroll?.direction
    if (direction === 'up') {
      backend.scrollViewport(state.activeTabId, -3)
    } else if (direction === 'down') {
      backend.scrollViewport(state.activeTabId, 3)
    }
  }

  const handleSplitResize = (tabId: string, ratio: number, axis: SplitDirection) => {
    dispatch({ type: 'set-split-ratio', tabId, ratio, axis })
  }

  const handleSeparatorDragStart = (info: {
    tabId: string
    direction: SplitDirection
    screenStart: number
    totalSize: number
  }) => {
    separatorDragRef.current = info
  }

  const handleSeparatorDrag = (event: OtuiMouseEvent): boolean => {
    const drag = separatorDragRef.current
    if (!drag) return false
    const pos = drag.direction === 'vertical' ? event.x : event.y
    const newRatio = (pos - drag.screenStart) / drag.totalSize
    dispatch({ type: 'set-split-ratio', tabId: drag.tabId, ratio: newRatio, axis: drag.direction })
    return true
  }

  const handleSeparatorDragEnd = () => {
    separatorDragRef.current = null
  }

  const handlePaneActivate = (tabId: string) => {
    if (tabId !== state.activeTabId) {
      dispatch({ type: 'set-active-tab', tabId })
    }
    if (state.focusMode !== 'terminal-input') {
      dispatch({ type: 'set-focus-mode', focusMode: 'terminal-input' })
    }
  }

  const handleTerminalClick = (
    event: OtuiMouseEvent,
    origin: TerminalContentOrigin,
    tabId?: string
  ) => {
    const targetTabId = tabId ?? state.activeTabId
    if (!targetTabId || !event.target) {
      return
    }

    const clickCount = multiClickRef.current.track(event.x, event.y)
    if (clickCount < 2) {
      return
    }

    // Use actual layout positions from the DOM instead of computed paneOrigin.
    // contentOrigin.y double-counts the border for top panes in split mode.
    const lineBox = event.target.parent
    if (!lineBox) {
      return
    }
    const contentBox = (lineBox as any).parent
    if (!contentBox) {
      return
    }
    const col = event.x - (contentBox as any).x
    const row = event.y - (contentBox as any).y
    const baseX = (lineBox as any).x

    logInputDebug('click.detect', {
      eventX: event.x,
      eventY: event.y,
      contentBoxX: (contentBox as any).x,
      contentBoxY: (contentBox as any).y,
      col,
      row,
      clickCount,
      targetId: event.target?.id,
    })

    const tab = state.tabs.find((t: TabSession) => t.id === targetTabId)
    if (!tab?.viewport?.lines[row]) {
      logInputDebug('click.noViewportLine', {
        targetTabId,
        row,
        tabFound: !!tab,
        hasViewport: !!tab?.viewport,
        lineCount: tab?.viewport?.lines.length ?? 0,
      })
      return
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
        return
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
      spanTexts: line.spans.map((s) => s.text),
      spanStyles: line.spans.map((s) => ({
        bold: s.bold,
        italic: s.italic,
        underline: s.underline,
      })),
    })

    event.preventDefault()
    renderer.clearSelection()
    // event.target is always selectable (guaranteed by hit-test).
    // startSelection uses event.target.parent (lineBox) as the selection
    // container, so ALL TextRenderables on the line participate — the
    // selection rectangle (anchor→focus) determines which ones highlight.
    renderer.startSelection(event.target, baseX + startCol, event.y)
    renderer.updateSelection(event.target, baseX + endCol, event.y, {
      finishDragging: true,
    })
    // Walk up the parent chain marking each ancestor dirty so that
    // overflow="hidden" frame buffers get refreshed during the next paint.
    // Without this, selection highlight only appears on panes that receive
    // PTY updates (which independently trigger a render cycle).
    let dirtyNode: unknown = event.target
    while (dirtyNode && typeof (dirtyNode as any).requestRender === 'function') {
      ;(dirtyNode as any).requestRender()
      dirtyNode = (dirtyNode as any).parent
    }

    logInputDebug('click.done', {
      hasSelection: !!(renderer as any).hasSelection,
      targetSelectable: !!(event.target as any).selectable,
    })

    copyToSystemClipboard(selectedText)
  }

  return {
    handleTerminalMouseEvent,
    handleTerminalScrollEvent,
    handleTerminalClick,
    handlePaneActivate,
    handleSplitResize,
    handleSeparatorDragStart,
    handleSeparatorDrag,
    handleSeparatorDragEnd,
  }
}
