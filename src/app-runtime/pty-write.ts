import type { SessionBackend } from '../session-backend/types'
import type { TabSession } from '../state/types'

import { buildPtyPastePayload } from '../input/paste'

function shouldScrollViewportToBottom(tab: TabSession): boolean {
  const viewport = tab.viewport
  return viewport !== undefined && viewport.viewportY < viewport.baseY
}

export function writeToTab(
  backend: SessionBackend,
  tabId: string,
  tab: TabSession | undefined,
  input: string
): void {
  if (tab && shouldScrollViewportToBottom(tab)) {
    backend.scrollViewportToBottom(tabId)
  }

  backend.write(tabId, input)
}

export function writePasteToTab(
  backend: SessionBackend,
  tabId: string,
  tab: TabSession | undefined,
  text: string
): void {
  const payload = buildPtyPastePayload(text, tab?.terminalModes.bracketedPasteMode ?? false)
  writeToTab(backend, tabId, tab, payload)
}
