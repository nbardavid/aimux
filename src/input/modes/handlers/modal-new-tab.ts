import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { closeModalResult, handleModalSelectionKeys, result } from './shared'

export const modalNewTabMode: ModeHandler = {
  handleKey(key: KeyInput, _ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return closeModalResult()
    }

    const navigationResult = handleModalSelectionKeys(key)
    if (navigationResult) {
      return navigationResult
    }

    if (key.name === 'return') {
      return result([], [{ type: 'launch-selected-assistant' }])
    }

    if (key.name === 'e') {
      return result([{ type: 'begin-command-edit' }], [], 'modal.new-tab.command-edit')
    }

    return null
  },

  id: 'modal.new-tab',
}
