import type { AppAction } from '../../../state/types'
import type { KeyInput, KeyResult, ModeContext, ModeHandler, SideEffect } from '../types'

import { result } from './shared'

const PAGE_SCROLL = 10

function selectedFilePath(ctx: ModeContext): string | null {
  const file = ctx.state.gitPanel.files[ctx.state.gitMode.selectedFileIndex]
  return file?.path ?? null
}

function selectFile(ctx: ModeContext, delta: -1 | 1): KeyResult {
  const total = ctx.state.gitPanel.files.length
  if (total === 0) return result([])
  const next = (ctx.state.gitMode.selectedFileIndex + delta + total) % total
  const nextPath = ctx.state.gitPanel.files[next]?.path
  const actions: AppAction[] = [{ delta, type: 'git-mode-select-file' }]
  const effects: SideEffect[] = []
  if (nextPath && !ctx.state.gitMode.diffs[nextPath]) {
    effects.push({ path: nextPath, type: 'fetch-git-diff' })
  }
  return result(actions, effects)
}

function scrollDiff(delta: number): KeyResult {
  return result([], [{ delta, type: 'scroll-git-diff' }])
}

export const gitMode: ModeHandler = {
  handleKey(key: KeyInput, ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return result([{ type: 'exit-git-mode' }], [], 'navigation')
    }

    if (key.name === 'j') {
      return selectFile(ctx, 1)
    }

    if (key.name === 'k') {
      return selectFile(ctx, -1)
    }

    if (key.ctrl && key.name === 'd') {
      return scrollDiff(PAGE_SCROLL)
    }

    if (key.ctrl && key.name === 'u') {
      return scrollDiff(-PAGE_SCROLL)
    }

    if (key.name === 'down') {
      return scrollDiff(1)
    }

    if (key.name === 'up') {
      return scrollDiff(-1)
    }

    return result([])
  },

  id: 'git-mode',

  onEnter(ctx: ModeContext): KeyResult {
    const path = selectedFilePath(ctx)
    const effects: SideEffect[] = []
    if (path && !ctx.state.gitMode.diffs[path]) {
      effects.push({ path, type: 'fetch-git-diff' })
    }
    return result([], effects)
  },
}
