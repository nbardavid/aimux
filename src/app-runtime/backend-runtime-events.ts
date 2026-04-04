import type { MutableRefObject } from 'react'

import type { SessionBackend } from '../session-backend/types'
import type { AppAction, TabSession, TerminalModeState } from '../state/types'

import { type TabRuntimeTimeouts } from './tab-runtime-timeouts'

const IDLE_ACTIVITY_TIMEOUT_MS = 2_000

interface BindBackendRuntimeEventsOptions {
  backend: SessionBackend
  dispatch: (action: AppAction) => void
  resizingRef: MutableRefObject<boolean>
  timeouts: Pick<
    TabRuntimeTimeouts,
    | 'clearIdleTimer'
    | 'clearStartupGrace'
    | 'isStartupGraceActive'
    | 'scheduleIdle'
    | 'clearAllTimers'
  >
}

function clearTabRuntimeState(
  timeouts: Pick<TabRuntimeTimeouts, 'clearIdleTimer' | 'clearStartupGrace'>,
  tabId: string
): void {
  timeouts.clearIdleTimer(tabId)
  timeouts.clearStartupGrace(tabId)
}

export function bindBackendRuntimeEvents({
  backend,
  dispatch,
  resizingRef,
  timeouts,
}: BindBackendRuntimeEventsOptions): () => void {
  const handleRender = (
    tabId: string,
    viewport: TabSession['viewport'],
    terminalModes: TerminalModeState
  ) => {
    if (!viewport) {
      return
    }

    dispatch({ type: 'replace-tab-viewport', tabId, viewport, terminalModes })
    if (timeouts.isStartupGraceActive(tabId) || resizingRef.current) {
      return
    }

    dispatch({ type: 'set-tab-activity', tabId, activity: 'busy' })
    timeouts.scheduleIdle(tabId, IDLE_ACTIVITY_TIMEOUT_MS)
  }

  const handleExit = (tabId: string, exitCode: number) => {
    clearTabRuntimeState(timeouts, tabId)
    dispatch({ type: 'set-tab-status', tabId, status: 'exited', exitCode })
    dispatch({ type: 'set-tab-activity', tabId, activity: undefined })
  }

  const handleError = (tabId: string, message: string) => {
    clearTabRuntimeState(timeouts, tabId)
    dispatch({ type: 'set-tab-error', tabId, message })
  }

  backend.on('render', handleRender)
  backend.on('exit', handleExit)
  backend.on('error', handleError)

  return () => {
    timeouts.clearAllTimers()
    backend.off('render', handleRender)
    backend.off('exit', handleExit)
    backend.off('error', handleError)
    void backend.destroy(true)
  }
}
