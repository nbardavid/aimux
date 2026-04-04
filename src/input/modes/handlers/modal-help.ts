import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { closeModalResult } from './shared'

export const modalHelpMode: ModeHandler = {
  handleKey(key: KeyInput, _ctx: ModeContext): KeyResult | null {
    if (key.name === 'escape') {
      return closeModalResult()
    }

    return null
  },

  id: 'modal.help',
}
