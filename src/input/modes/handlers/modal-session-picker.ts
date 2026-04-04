import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { closeModalResult, handleModalSelectionKeys, result } from './shared'

export const modalSessionPickerMode: ModeHandler = {
  handleKey(key: KeyInput, ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      if (!ctx.state.currentSessionId) return null
      return closeModalResult()
    }

    const navigationResult = handleModalSelectionKeys(key)
    if (navigationResult) {
      return navigationResult
    }

    if (key.name === 'return') {
      return result([], [{ type: 'confirm-selected-session' }])
    }

    if (key.name === 'n') {
      return result([{ type: 'open-create-session-modal' }], [], 'modal.create-session')
    }

    if (key.name === 'r') {
      return result([], [{ type: 'open-rename-selected-session' }])
    }

    if (key.name === 'd') {
      return result([], [{ type: 'delete-selected-session' }])
    }

    if (key.sequence === '/') {
      return result([{ type: 'begin-session-filter' }], [], 'modal.session-picker.filtering')
    }

    return null
  },

  id: 'modal.session-picker',
}
