import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { handleCursorNavigation, handleTextInput, result } from './shared'

function isBody(ctx: ModeContext): boolean {
  return ctx.state.modal.type === 'git-commit' && ctx.state.modal.activeField === 'body'
}

export const modalGitCommitMode: ModeHandler = {
  handleKey(key: KeyInput, ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return result([{ type: 'close-modal' }], [], 'git-mode')
    }

    if (key.ctrl && key.name === 'return') {
      return result([{ type: 'close-modal' }], [{ type: 'git-commit' }], 'git-mode')
    }

    if (key.name === 'tab') {
      return result([{ type: 'switch-create-session-field' }])
    }

    if (key.name === 'return') {
      if (isBody(ctx)) {
        return result([{ char: '\n', type: 'update-command-edit' }])
      }
      return result([{ type: 'switch-create-session-field' }])
    }

    return handleCursorNavigation(key) ?? handleTextInput(key)
  },

  id: 'modal.git-commit',
}
