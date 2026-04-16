import type { AppAction, AppState, DiffData, GitModeState } from '../types'

export function emptyGitMode(): GitModeState {
  return {
    afterScrollOffset: 0,
    beforeScrollOffset: 0,
    diffs: {},
    focusedPane: 'after',
    loading: {},
    scrollOffset: 0,
    selectedFileIndex: 0,
    syncScroll: true,
  }
}

function maxScrollForDiff(diff: DiffData | undefined): number {
  if (!diff) return 0
  const maxLen = Math.max(diff.beforeLineCount, diff.afterLineCount, diff.lines.length)
  return Math.max(0, maxLen - 1)
}

function currentDiff(state: AppState): DiffData | undefined {
  const file = state.gitPanel.files[state.gitMode.selectedFileIndex]
  if (!file) return undefined
  return state.gitMode.diffs[file.path]
}

function clampScroll(offset: number, diff: DiffData | undefined): number {
  if (!diff) return 0
  return Math.max(0, Math.min(offset, maxScrollForDiff(diff)))
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
          afterScrollOffset: 0,
          beforeScrollOffset: 0,
          focusedPane: 'after',
          scrollOffset: 0,
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
        gitMode: {
          ...state.gitMode,
          afterScrollOffset: 0,
          beforeScrollOffset: 0,
          scrollOffset: 0,
          selectedFileIndex: next,
        },
      }
    }
    case 'git-mode-scroll': {
      const diff = currentDiff(state)
      if (!diff) return state
      if (state.gitMode.syncScroll) {
        const nextScroll = clampScroll(state.gitMode.scrollOffset + action.delta, diff)
        if (nextScroll === state.gitMode.scrollOffset) return state
        return { ...state, gitMode: { ...state.gitMode, scrollOffset: nextScroll } }
      }
      if (state.gitMode.focusedPane === 'before') {
        const nextScroll = clampScroll(state.gitMode.beforeScrollOffset + action.delta, diff)
        if (nextScroll === state.gitMode.beforeScrollOffset) return state
        return { ...state, gitMode: { ...state.gitMode, beforeScrollOffset: nextScroll } }
      }
      const nextScroll = clampScroll(state.gitMode.afterScrollOffset + action.delta, diff)
      if (nextScroll === state.gitMode.afterScrollOffset) return state
      return { ...state, gitMode: { ...state.gitMode, afterScrollOffset: nextScroll } }
    }
    case 'git-mode-toggle-sync': {
      if (state.gitMode.syncScroll) {
        return {
          ...state,
          gitMode: {
            ...state.gitMode,
            afterScrollOffset: state.gitMode.scrollOffset,
            beforeScrollOffset: state.gitMode.scrollOffset,
            focusedPane: 'after',
            syncScroll: false,
          },
        }
      }
      if (state.gitMode.focusedPane === 'after') {
        return { ...state, gitMode: { ...state.gitMode, focusedPane: 'before' } }
      }
      return {
        ...state,
        gitMode: {
          ...state.gitMode,
          scrollOffset: state.gitMode.afterScrollOffset,
          syncScroll: true,
        },
      }
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
