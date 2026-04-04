import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { handleCtrlNavigation, handleTextInput, result } from './shared'

export const modalSnippetEditorMode: ModeHandler = {
  handleKey(key: KeyInput, _ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return result([{ type: 'open-snippet-picker' }], [], 'modal.snippet-picker')
    }

    if (key.name === 'tab') {
      return result([{ type: 'switch-create-session-field' }])
    }

    if (key.name === 'return') {
      return result([{ type: 'close-modal' }], [{ type: 'save-snippet-editor' }], 'navigation')
    }

    return handleCtrlNavigation(key) ?? handleTextInput(key)
  },

  id: 'modal.snippet-editor',
}
