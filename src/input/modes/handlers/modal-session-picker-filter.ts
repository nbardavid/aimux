import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { handleCtrlNavigation, handleTextInput, result } from './shared'

export const modalSessionPickerFilterMode: ModeHandler = {
  handleKey(key: KeyInput, _ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return result([{ type: 'cancel-command-edit' }], [], 'modal.session-picker')
    }

    if (key.name === 'return') {
      return result([], [{ type: 'confirm-selected-session' }])
    }

    return handleCtrlNavigation(key) ?? handleTextInput(key)
  },

  id: 'modal.session-picker.filtering',
}
