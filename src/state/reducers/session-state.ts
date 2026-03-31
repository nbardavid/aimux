import type { AppAction, AppState } from '../types'

import { filterSessions } from '../selectors'
import { restoreWorkspaceState } from '../session-persistence'

const CLOSED_MODAL = {
  type: null,
  selectedIndex: 0,
  editBuffer: null,
  sessionTargetId: null,
} as const

export function reduceSessionState(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case 'load-session': {
      const snapshot =
        action.workspaceSnapshot ??
        state.sessions.find((entry) => entry.id === action.sessionId)?.workspaceSnapshot
      return {
        ...state,
        ...restoreWorkspaceState(state, snapshot),
        currentSessionId: action.sessionId,
        sessions: state.sessions.map((entry) =>
          entry.id === action.sessionId
            ? {
                ...entry,
                lastOpenedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : entry
        ),
        focusMode: 'navigation',
        modal: CLOSED_MODAL,
      }
    }
    case 'set-sessions':
      return { ...state, sessions: action.sessions }
    case 'create-session-record':
      return {
        ...state,
        sessions: [...state.sessions, action.session],
        currentSessionId: action.session.id,
        focusMode: 'navigation',
        modal: CLOSED_MODAL,
      }
    case 'rename-session-record':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.sessionId
            ? { ...session, name: action.name, updatedAt: new Date().toISOString() }
            : session
        ),
        focusMode: 'modal',
        modal: {
          type: 'session-picker',
          selectedIndex: state.modal.selectedIndex,
          editBuffer: null,
          sessionTargetId: null,
        },
      }
    case 'delete-session-record': {
      const newSessions = state.sessions.filter((session) => session.id !== action.sessionId)
      const filteredNew = filterSessions(newSessions, state.modal.editBuffer)
      const maxIndex = filteredNew.length
      const clampedIndex = Math.min(state.modal.selectedIndex, maxIndex)
      return {
        ...state,
        sessions: newSessions,
        currentSessionId:
          action.sessionId === state.currentSessionId ? null : state.currentSessionId,
        tabs: action.sessionId === state.currentSessionId ? [] : state.tabs,
        activeTabId: action.sessionId === state.currentSessionId ? null : state.activeTabId,
        focusMode: 'modal',
        modal: {
          type: 'session-picker',
          selectedIndex: clampedIndex,
          editBuffer: null,
          sessionTargetId: null,
        },
      }
    }
    default:
      return null
  }
}
