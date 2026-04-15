import { useRenderer } from '@opentui/react'
import { type MutableRefObject, useEffect } from 'react'

import type { SessionBackend } from '../session-backend/types'
import type { AppAction, FocusMode, TabSession } from '../state/types'

import { INPUT_DEBUG_LOG_PATH, logInputDebug } from '../debug/input-log'
import { createRawInputHandler } from '../input/raw-input-handler'
import { extractStreamText } from '../input/terminal-text-extraction'
import { copyToSystemClipboard } from '../platform/clipboard'
import { writePasteToTab, writeToTab } from './pty-write'

interface PositionedNode {
  parent?: unknown
  x: number
  y: number
}

function isPositionedNode(value: unknown): value is PositionedNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'x') === 'number' &&
    typeof Reflect.get(value, 'y') === 'number'
  )
}

interface OtuiSelection {
  isDragging?: boolean
  anchor: { x: number; y: number }
  focus: { x: number; y: number }
  touchedRenderables?: unknown[]
  getSelectedText(): string
}

function computeStreamSelectedText(
  selection: OtuiSelection,
  lines: { spans: { text: string }[] }[]
): string | null {
  const touched = selection.touchedRenderables
  if (!touched || touched.length === 0) return null

  const viewportText = touched[0]
  if (!isPositionedNode(viewportText)) return null

  const originX = viewportText.x
  const originY = viewportText.y

  const anchorRow = selection.anchor.y - originY
  const anchorCol = selection.anchor.x - originX
  const focusRow = selection.focus.y - originY
  const focusCol = selection.focus.x - originX

  return extractStreamText(
    lines as Parameters<typeof extractStreamText>[0],
    anchorRow,
    anchorCol,
    focusRow,
    focusCol
  )
}

const BRACKETED_PASTE_ENABLE_SEQUENCE = '\x1b[?2004h'
const BRACKETED_PASTE_DISABLE_SEQUENCE = '\x1b[?2004l'
const PASTE_DEBUG_PREVIEW_LENGTH = 120
const TEXT_DECODER = new TextDecoder()

interface UseRendererBindingsOptions {
  backend: SessionBackend
  renderer: ReturnType<typeof useRenderer>
  dispatch: (action: AppAction) => void
  focusMode: FocusMode
  activeTabId: string | null
  focusModeRef: MutableRefObject<FocusMode>
  activeTabIdRef: MutableRefObject<string | null>
  activeTabRef: MutableRefObject<TabSession | undefined>
}

function decodeBytes(bytes: Uint8Array): string {
  return TEXT_DECODER.decode(bytes)
}

export function useRendererBindings({
  activeTabId,
  activeTabIdRef,
  activeTabRef,
  backend,
  dispatch,
  focusMode,
  focusModeRef,
  renderer,
}: UseRendererBindingsOptions): void {
  useEffect(() => {
    renderer.useMouse = true
    renderer.useConsole = false
    renderer.console.hide()
    renderer.console.show = () => {}

    const handler = createRawInputHandler({
      enterLayoutMode: () => dispatch({ focusMode: 'layout', type: 'set-focus-mode' }),
      getActiveTabId: () => activeTabIdRef.current,
      getBracketedPasteModeEnabled: () =>
        activeTabRef.current?.terminalModes.bracketedPasteMode ?? false,
      getFocusMode: () => focusModeRef.current,
      leaveTerminalInput: () => dispatch({ focusMode: 'navigation', type: 'set-focus-mode' }),
      toggleSidebar: () => dispatch({ type: 'toggle-sidebar' }),
      writeToPty: (tabId, data) => writeToTab(backend, tabId, activeTabRef.current, data),
    })

    const handlePasteEvent = (event: { bytes: Uint8Array; defaultPrevented?: boolean }) => {
      logInputDebug('app.rendererPaste', {
        byteLength: event.bytes.length,
        defaultPrevented: event.defaultPrevented ?? false,
      })

      if (event.defaultPrevented) {
        return
      }

      const tab = activeTabRef.current
      const tabId = activeTabIdRef.current
      const currentFocusMode = focusModeRef.current
      const payload = decodeBytes(event.bytes)

      logInputDebug('app.onTerminalPaste', {
        activeTabId: tabId,
        bracketedPasteMode: tab?.terminalModes.bracketedPasteMode ?? false,
        byteLength: event.bytes.length,
        decodedPreview: payload.slice(0, PASTE_DEBUG_PREVIEW_LENGTH),
        focusMode: currentFocusMode,
      })

      if (currentFocusMode !== 'terminal-input' || !tabId || !tab) {
        return
      }

      writePasteToTab(backend, tabId, tab, payload)
    }

    const handleSelection = (selection: OtuiSelection) => {
      const fallback = selection.getSelectedText()
      const tab = activeTabRef.current
      const streamText =
        tab?.viewport && tab.viewport.lines.length > 0
          ? computeStreamSelectedText(selection, tab.viewport.lines)
          : null
      const selectedText = streamText ?? fallback

      logInputDebug('app.selection', {
        fallbackLength: fallback.length,
        isDragging: selection.isDragging ?? false,
        osc52Supported: renderer.isOsc52Supported(),
        streamLength: streamText?.length ?? null,
        textLength: selectedText.length,
      })

      if (selection.isDragging || selectedText.length === 0) {
        return
      }

      renderer.copyToClipboardOSC52(selectedText)
      copyToSystemClipboard(selectedText)
    }

    renderer.prependInputHandler(handler)
    renderer.keyInput.on('paste', handlePasteEvent)
    renderer.on('selection', handleSelection)

    return () => {
      renderer.removeInputHandler(handler)
      renderer.keyInput.off('paste', handlePasteEvent)
      renderer.off('selection', handleSelection)
    }
  }, [activeTabIdRef, activeTabRef, backend, dispatch, focusModeRef, renderer])

  useEffect(() => {
    const shouldEnableBracketedPaste = focusMode === 'terminal-input' && activeTabId !== null
    logInputDebug('app.bracketedPasteMode', {
      activeTabId,
      enabled: shouldEnableBracketedPaste,
      focusMode,
      logPath: INPUT_DEBUG_LOG_PATH,
    })
    process.stdout.write(
      shouldEnableBracketedPaste
        ? BRACKETED_PASTE_ENABLE_SEQUENCE
        : BRACKETED_PASTE_DISABLE_SEQUENCE
    )

    return () => {
      process.stdout.write(BRACKETED_PASTE_DISABLE_SEQUENCE)
    }
  }, [activeTabId, focusMode])
}
