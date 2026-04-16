import type { AppAction, AppState, GitModeState } from '../types'

export function emptyGitMode(): GitModeState {
  return {
    diffs: {},
    focusedPane: 'after',
    loading: {},
    selectedFileIndex: 0,
    syncScroll: true,
  }
}

export function reduceGitModeState(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case 'enter-git-mode': {
      if (state.focusMode === 'git') return state
      return {
        ...state,
        focusMode: 'git',
        gitMode: {
          ...state.gitMode,
          focusedPane: 'after',
          selectedFileIndex: 0,
          syncScroll: true,
        },
      }
    }
    case 'exit-git-mode': {
      if (state.focusMode !== 'git') return state
      return { ...state, focusMode: 'navigation' }
    }
    case 'git-mode-select-file': {
      const total = state.gitPanel.files.length
      if (total === 0) return state
      const next = (state.gitMode.selectedFileIndex + action.delta + total) % total
      if (next === state.gitMode.selectedFileIndex) return state
      return {
        ...state,
        gitMode: { ...state.gitMode, selectedFileIndex: next },
      }
    }
    case 'git-mode-toggle-sync': {
      if (state.gitMode.syncScroll) {
        return {
          ...state,
          gitMode: { ...state.gitMode, focusedPane: 'after', syncScroll: false },
        }
      }
      if (state.gitMode.focusedPane === 'after') {
        return { ...state, gitMode: { ...state.gitMode, focusedPane: 'before' } }
      }
      return { ...state, gitMode: { ...state.gitMode, syncScroll: true } }
    }
    case 'git-mode-set-diff': {
      const nextLoading = { ...state.gitMode.loading }
      delete nextLoading[action.path]
      return {
        ...state,
        gitMode: {
          ...state.gitMode,
          diffs: { ...state.gitMode.diffs, [action.path]: action.diff },
          loading: nextLoading,
        },
      }
    }
    case 'git-mode-set-loading': {
      const nextLoading = { ...state.gitMode.loading }
      if (action.loading) {
        nextLoading[action.path] = true
      } else {
        delete nextLoading[action.path]
      }
      return { ...state, gitMode: { ...state.gitMode, loading: nextLoading } }
    }
    default:
      return null
  }
}
