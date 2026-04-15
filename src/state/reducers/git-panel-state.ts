import type { AppAction, AppState, GitPanelState } from '../types'

export function emptyGitPanel(): GitPanelState {
  return {
    ahead: 0,
    behind: 0,
    branch: null,
    error: null,
    files: [],
    loading: false,
    scrollOffset: 0,
  }
}

export function reduceGitPanelState(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case 'toggle-sidebar-view': {
      const nextView = state.sidebar.view === 'git' ? 'tabs' : 'git'
      const nextVisible = state.sidebar.visible || nextView === 'git'
      return {
        ...state,
        sidebar: { ...state.sidebar, view: nextView, visible: nextVisible },
      }
    }
    case 'git-refresh-start':
      return { ...state, gitPanel: { ...state.gitPanel, loading: true } }
    case 'git-refresh-success':
      return {
        ...state,
        gitPanel: {
          ...state.gitPanel,
          ahead: action.payload.ahead,
          behind: action.payload.behind,
          branch: action.payload.branch,
          error: null,
          files: action.payload.files,
          loading: false,
        },
      }
    case 'git-refresh-error':
      return {
        ...state,
        gitPanel: {
          ...state.gitPanel,
          error: action.kind,
          files: [],
          loading: false,
        },
      }
    case 'scroll-git-panel': {
      const maxOffset = Math.max(0, action.maxOffset)
      const next = Math.max(0, Math.min(maxOffset, state.gitPanel.scrollOffset + action.delta))
      if (next === state.gitPanel.scrollOffset) return state
      return { ...state, gitPanel: { ...state.gitPanel, scrollOffset: next } }
    }
    default:
      return null
  }
}
