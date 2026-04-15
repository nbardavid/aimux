import type { AppAction, AppState, GitFileEntry, GitPanelState } from '../types'

export function emptyGitPanel(): GitPanelState {
  return {
    ahead: 0,
    behind: 0,
    branch: null,
    error: null,
    files: [],
    loading: true,
    scrollOffset: 0,
  }
}

function sameFiles(a: GitFileEntry[], b: GitFileEntry[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as GitFileEntry
    const y = b[i] as GitFileEntry
    if (
      x.path !== y.path ||
      x.status !== y.status ||
      x.section !== y.section ||
      x.added !== y.added ||
      x.removed !== y.removed ||
      x.renamedFrom !== y.renamedFrom
    ) {
      return false
    }
  }
  return true
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
      if (!state.gitPanel.loading) return state
      return state
    case 'git-refresh-success': {
      const prev = state.gitPanel
      const next = action.payload
      if (
        prev.branch === next.branch &&
        prev.ahead === next.ahead &&
        prev.behind === next.behind &&
        prev.error === null &&
        !prev.loading &&
        sameFiles(prev.files, next.files)
      ) {
        return state
      }
      return {
        ...state,
        gitPanel: {
          ...prev,
          ahead: next.ahead,
          behind: next.behind,
          branch: next.branch,
          error: null,
          files: next.files,
          loading: false,
        },
      }
    }
    case 'git-refresh-error': {
      const prev = state.gitPanel
      if (prev.error === action.kind && prev.files.length === 0 && !prev.loading) return state
      return {
        ...state,
        gitPanel: { ...prev, error: action.kind, files: [], loading: false },
      }
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
