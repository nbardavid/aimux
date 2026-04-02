import type { MutableRefObject } from 'react'

import { useEffect, useMemo, useRef } from 'react'

import type { TerminalContentOrigin } from '../input/raw-input-handler'
import type { SessionBackend } from '../session-backend/types'
import type { AppAction, AppState } from '../state/types'

import { PANE_BORDER, computePaneRects } from '../state/layout-tree'

const MAIN_AREA_HORIZONTAL_CHROME = 2
const MAIN_AREA_VERTICAL_PADDING = 0
const STATUS_BAR_HEIGHT = 4
const TERMINAL_PANE_VERTICAL_CHROME = 2
const MIN_TERMINAL_ROWS = 1
const MIN_TERMINAL_COLS = 20

interface UseTerminalResizeOptions {
  state: AppState
  dispatch: (action: AppAction) => void
  backend: SessionBackend
  dimensions: { width: number; height: number }
  contentOriginRef: MutableRefObject<TerminalContentOrigin>
  resizingRef: MutableRefObject<boolean>
}

export function useTerminalResize({
  state,
  dispatch,
  backend,
  dimensions,
  contentOriginRef,
  resizingRef,
}: UseTerminalResizeOptions) {
  const resizingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const terminalSize = useMemo(() => {
    const sidebarWidth = state.sidebar.visible ? state.sidebar.width + 1 : 0
    const reservedRows =
      MAIN_AREA_VERTICAL_PADDING + STATUS_BAR_HEIGHT + TERMINAL_PANE_VERTICAL_CHROME
    const cols = Math.max(
      MIN_TERMINAL_COLS,
      Math.floor(dimensions.width - sidebarWidth - MAIN_AREA_HORIZONTAL_CHROME)
    )
    const rows = Math.max(MIN_TERMINAL_ROWS, Math.floor(dimensions.height - reservedRows))

    contentOriginRef.current = {
      x: sidebarWidth + 1,
      y: 1,
      cols,
      rows,
    }

    return { cols, rows }
  }, [
    contentOriginRef,
    dimensions.height,
    dimensions.width,
    state.sidebar.visible,
    state.sidebar.width,
  ])

  useEffect(() => {
    dispatch({
      type: 'set-terminal-size',
      cols: terminalSize.cols,
      rows: terminalSize.rows,
    })
    resizingRef.current = true
    if (resizingTimerRef.current) {
      clearTimeout(resizingTimerRef.current)
    }
    if (state.layoutTree && state.layoutTree.type === 'split') {
      const bounds = { x: 0, y: 0, cols: terminalSize.cols, rows: terminalSize.rows }
      const rects = computePaneRects(state.layoutTree, bounds)
      const chrome = PANE_BORDER * 2
      for (const [tabId, rect] of rects) {
        backend.resizeTab(tabId, Math.max(1, rect.cols - chrome), Math.max(1, rect.rows - chrome))
      }
    } else {
      backend.resizeAll(terminalSize.cols, terminalSize.rows)
    }
    resizingTimerRef.current = setTimeout(() => {
      resizingRef.current = false
      resizingTimerRef.current = null
    }, 500)
  }, [backend, dispatch, resizingRef, terminalSize.cols, terminalSize.rows, state.layoutTree])

  return terminalSize
}
