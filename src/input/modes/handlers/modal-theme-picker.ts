import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { closeModalResult, handleModalSelectionKeys } from './shared'

export const modalThemePickerMode: ModeHandler = {
  handleKey(key: KeyInput, _ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return closeModalResult([{ action: 'restore', type: 'apply-theme' }])
    }

    const navigationResult = handleModalSelectionKeys(key, (delta) => [
      { action: 'preview', delta, type: 'apply-theme' },
    ])
    if (navigationResult) {
      return navigationResult
    }

    if (key.name === 'return') {
      return closeModalResult([{ action: 'confirm', type: 'apply-theme' }])
    }

    return null
  },

  id: 'modal.theme-picker',
}
