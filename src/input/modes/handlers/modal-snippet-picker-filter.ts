import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { closeModalResult, handleCtrlNavigation, handleTextInput, result } from './shared'

export const modalSnippetPickerFilterMode: ModeHandler = {
  handleKey(key: KeyInput, _ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return result([{ type: 'cancel-command-edit' }], [], 'modal.snippet-picker')
    }

    if (key.name === 'return') {
      return closeModalResult([{ type: 'paste-selected-snippet' }])
    }

    if (key.ctrl && key.name === 'a') {
      return closeModalResult([{ type: 'paste-snippet-to-group' }])
    }

    return handleCtrlNavigation(key) ?? handleTextInput(key)
  },

  id: 'modal.snippet-picker.filtering',
}
