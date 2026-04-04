import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { handleTextInput, result } from './shared'

export const modalSessionNameMode: ModeHandler = {
  handleKey(key: KeyInput, ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return result([{ type: 'open-session-picker' }], [], 'modal.session-picker')
    }

    if (key.name === 'return') {
      const trimmed = (ctx.state.modal.editBuffer ?? '').trim()
      const sessionId = ctx.state.modal.sessionTargetId
      if (trimmed && sessionId) {
        return result(
          [{ type: 'open-session-picker' }],
          [{ name: trimmed, sessionId, type: 'rename-session' }],
          'modal.session-picker'
        )
      }

      return result([{ type: 'open-session-picker' }], [], 'modal.session-picker')
    }

    return handleTextInput(key)
  },

  id: 'modal.session-name',
}
