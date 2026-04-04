import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { closeModalResult, handleModalSelectionKeys, result } from './shared'

export const modalSnippetPickerMode: ModeHandler = {
  handleKey(key: KeyInput, _ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return closeModalResult()
    }

    const navigationResult = handleModalSelectionKeys(key)
    if (navigationResult) {
      return navigationResult
    }

    if (key.name === 'return') {
      return closeModalResult([{ type: 'paste-selected-snippet' }])
    }

    if (key.name === 'a') {
      return closeModalResult([{ type: 'paste-snippet-to-group' }])
    }

    if (key.name === 'n') {
      return result([{ type: 'open-snippet-editor' }], [], 'modal.snippet-editor')
    }

    if (key.name === 'r' || key.name === 'e') {
      return result([], [{ type: 'edit-selected-snippet' }])
    }

    if (key.name === 'd') {
      return result([], [{ type: 'delete-selected-snippet' }])
    }

    if (key.sequence === '/') {
      return result([{ type: 'begin-snippet-filter' }], [], 'modal.snippet-picker.filtering')
    }

    return null
  },

  id: 'modal.snippet-picker',
}
