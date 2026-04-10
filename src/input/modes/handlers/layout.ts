import type { KeyInput, KeyResult, ModeContext, ModeHandler } from '../types'

import { result } from './shared'

function exitToInput(
  actions: KeyResult['actions'] = [],
  effects: KeyResult['effects'] = []
): KeyResult {
  return result(
    [...actions, { focusMode: 'terminal-input', type: 'set-focus-mode' }],
    effects,
    'terminal-input'
  )
}

function resizeActivePane(
  ctx: ModeContext,
  axis: 'horizontal' | 'vertical',
  delta: -1 | 1
): KeyResult | null {
  const tabId = ctx.state.activeTabId
  if (!tabId) {
    return null
  }

  return result([{ axis, delta, tabId, type: 'resize-pane' }])
}

function focusPane(direction: 'left' | 'down' | 'up' | 'right'): KeyResult {
  return exitToInput([{ direction, type: 'focus-pane-direction' }])
}

function openSplitPicker(direction: 'vertical' | 'horizontal'): KeyResult {
  return result([{ direction, type: 'open-split-picker' }], [], 'modal.split-picker')
}

function exitToNavigation(ctx: ModeContext): KeyResult {
  const actions: KeyResult['actions'] = [{ focusMode: 'navigation', type: 'set-focus-mode' }]
  if (!ctx.state.sidebar.visible) {
    actions.push({ type: 'toggle-sidebar' })
  }
  return result(actions, [], 'navigation')
}

export const layoutMode: ModeHandler = {
  handleKey(key: KeyInput, ctx: ModeContext): KeyResult | null {
    // Escape or Ctrl+W again → back to terminal-input
    if (key.name === 'escape' || (key.ctrl && key.name === 'w')) {
      return exitToInput()
    }

    // Ctrl+Z → exit to navigation mode and reveal sidebar if hidden
    if (key.ctrl && key.name === 'z') {
      return exitToNavigation(ctx)
    }

    // Resize: Shift+H/J/K/L — stays in layout mode for repeated adjustments
    if (key.shift && key.name === 'h') {
      return resizeActivePane(ctx, 'vertical', -1)
    }

    if (key.shift && key.name === 'l') {
      return resizeActivePane(ctx, 'vertical', 1)
    }

    if (key.shift && key.name === 'k') {
      return resizeActivePane(ctx, 'horizontal', -1)
    }

    if (key.shift && key.name === 'j') {
      return resizeActivePane(ctx, 'horizontal', 1)
    }

    // Pane navigation: h/j/k/l (must be after shift checks)
    if (key.name === 'h') {
      return focusPane('left')
    }

    if (key.name === 'j') {
      return focusPane('down')
    }

    if (key.name === 'k') {
      return focusPane('up')
    }

    if (key.name === 'l') {
      return focusPane('right')
    }

    // Split: | vertical, - horizontal → open picker modal
    if (key.sequence === '|') {
      return openSplitPicker('vertical')
    }

    if (key.sequence === '-') {
      return openSplitPicker('horizontal')
    }

    // Close pane: q
    if (key.name === 'q') {
      const tabId = ctx.state.activeTabId
      if (tabId) {
        return exitToInput([{ tabId, type: 'close-pane' }], [{ tabId, type: 'close-tab' }])
      }
    }

    return null
  },

  id: 'layout',
}
