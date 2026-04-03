import type { TerminalModeState } from './types'

export function createDefaultTerminalModes(): TerminalModeState {
  return {
    mouseTrackingMode: 'none',
    sendFocusMode: false,
    alternateScrollMode: false,
    isAlternateBuffer: false,
    bracketedPasteMode: false,
  }
}
