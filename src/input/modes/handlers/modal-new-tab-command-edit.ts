import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { handleCtrlNavigation, handleTextInput, result } from './shared'

export const modalNewTabCommandEditMode: ModeHandler = {
  handleKey(key: KeyInput, _ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return result([{ type: 'cancel-command-edit' }], [], 'modal.new-tab')
    }

    if (key.name === 'return') {
      return result(
        [{ type: 'commit-command-edit' }],
        [{ type: 'save-custom-command' }],
        'modal.new-tab'
      )
    }

    return handleCtrlNavigation(key) ?? handleTextInput(key)
  },

  id: 'modal.new-tab.command-edit',
}
