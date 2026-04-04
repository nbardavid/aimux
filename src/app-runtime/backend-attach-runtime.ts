import type { MutableRefObject } from 'react'

import type { SessionBackend } from '../session-backend/types'
import type { AppAction, LayoutState, WorkspaceSnapshotV1 } from '../state/types'

import { logInputDebug } from '../debug/input-log'
import {
  createTerminalBounds,
  forEachSplitPaneRect,
  getSnapshotTrees,
  toTerminalContentSize,
} from '../state/layout-resize'

export function resizeSnapshotPanes(
  snapshot: WorkspaceSnapshotV1 | undefined,
  layoutRef: MutableRefObject<LayoutState>,
  backend: SessionBackend
): void {
  if (!snapshot) {
    return
  }

  const trees = getSnapshotTrees(snapshot)
  const bounds = createTerminalBounds(
    layoutRef.current.terminalCols,
    layoutRef.current.terminalRows
  )
  forEachSplitPaneRect(trees, bounds, (tabId, rect) => {
    const size = toTerminalContentSize(rect)
    backend.resizeTab(tabId, size.cols, size.rows)
  })
}

function hydrateAttachedSession(
  dispatch: (action: AppAction) => void,
  sessionId: string,
  workspaceSnapshot: WorkspaceSnapshotV1 | undefined,
  result: Awaited<ReturnType<SessionBackend['attach']>>,
  layoutRef: MutableRefObject<LayoutState>,
  backend: SessionBackend
): void {
  if (result) {
    dispatch({
      type: 'hydrate-workspace',
      tabs: result.tabs,
      activeTabId: result.activeTabId,
      layoutTree: workspaceSnapshot?.layoutTree,
      layoutTrees: workspaceSnapshot?.layoutTrees,
      tabGroupMap: workspaceSnapshot?.tabGroupMap,
    })
    resizeSnapshotPanes(workspaceSnapshot, layoutRef, backend)
    return
  }

  if (!workspaceSnapshot) {
    return
  }

  dispatch({
    type: 'load-session',
    sessionId,
    workspaceSnapshot,
  })
  resizeSnapshotPanes(workspaceSnapshot, layoutRef, backend)
}

interface AttachCurrentSessionOptions {
  backend: SessionBackend
  dispatch: (action: AppAction) => void
  currentSessionId: string
  currentSessionWorkspaceSnapshot: Parameters<SessionBackend['attach']>[0]['workspaceSnapshot']
  layoutRef: MutableRefObject<LayoutState>
  attachRequestIdRef: MutableRefObject<number>
}

export function attachCurrentSession({
  backend,
  dispatch,
  currentSessionId,
  currentSessionWorkspaceSnapshot,
  layoutRef,
  attachRequestIdRef,
}: AttachCurrentSessionOptions): () => void {
  const attachRequestId = attachRequestIdRef.current + 1
  attachRequestIdRef.current = attachRequestId
  let cancelled = false

  void backend
    .attach({
      sessionId: currentSessionId,
      cols: layoutRef.current.terminalCols,
      rows: layoutRef.current.terminalRows,
      workspaceSnapshot: currentSessionWorkspaceSnapshot,
    })
    .then((result) => {
      if (cancelled || attachRequestIdRef.current !== attachRequestId) {
        return
      }

      logInputDebug('app.backend.attachResult', {
        hasResult: !!result,
        tabs: result?.tabs.length ?? 0,
        activeTabId: result?.activeTabId ?? null,
      })
      hydrateAttachedSession(
        dispatch,
        currentSessionId,
        currentSessionWorkspaceSnapshot,
        result,
        layoutRef,
        backend
      )
    })
    .catch((error) => {
      if (cancelled || attachRequestIdRef.current !== attachRequestId) {
        return
      }

      logInputDebug('app.backend.attachError', {
        error: error instanceof Error ? error.message : String(error),
      })
      hydrateAttachedSession(
        dispatch,
        currentSessionId,
        currentSessionWorkspaceSnapshot,
        null,
        layoutRef,
        backend
      )
    })

  return () => {
    cancelled = true
  }
}
