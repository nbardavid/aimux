import type { ModalCreateSession } from '../../../state/types'
import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { handleCtrlNavigation, handleTextInput, result } from './shared'

function getDefaultSessionName(projectPath?: string): string {
  if (!projectPath) {
    return ''
  }

  const segments = projectPath.split('/').filter(Boolean)
  return segments.at(-1) ?? ''
}

export const modalCreateSessionMode: ModeHandler = {
  handleKey(key: KeyInput, ctx: ModeContext): KeyResult | null {
    const modal = ctx.state.modal as ModalCreateSession

    if (key.name === 'escape') {
      return result([{ type: 'open-session-picker' }], [], 'modal.session-picker')
    }

    if (key.name === 'tab') {
      return result([{ type: 'switch-create-session-field' }])
    }

    if (key.name === 'return') {
      if (modal.activeField === 'directory') {
        return result([{ type: 'select-directory' }])
      }

      const trimmed = (modal.editBuffer ?? '').trim()
      const projectPath = modal.pendingProjectPath ?? undefined
      const sessionName = trimmed || getDefaultSessionName(projectPath)
      if (sessionName) {
        return result(
          [{ type: 'close-modal' }],
          [{ name: sessionName, projectPath, type: 'create-session' }],
          'navigation'
        )
      }

      return result([{ type: 'close-modal' }], [], 'navigation')
    }

    return handleCtrlNavigation(key) ?? handleTextInput(key)
  },

  id: 'modal.create-session',
}
