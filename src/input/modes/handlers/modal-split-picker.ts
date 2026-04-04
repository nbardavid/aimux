import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { closeModalResult, handleModalSelectionKeys, result } from './shared'

export const modalSplitPickerMode: ModeHandler = {
  handleKey(key: KeyInput, _ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return closeModalResult()
    }

    const navigationResult = handleModalSelectionKeys(key)
    if (navigationResult) {
      return navigationResult
    }

    if (key.name === 'return') {
      return result([], [{ type: 'confirm-split' }])
    }

    return null
  },

  id: 'modal.split-picker',
}
