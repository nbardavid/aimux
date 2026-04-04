import type { MouseEvent } from '@opentui/core'

import type { TerminalContentOrigin } from '../input/raw-input-handler'
import type { ModalState, SessionRecord, SnippetRecord } from '../state/types'
import type { ThemeId } from './themes'

import { useAppStore } from '../state/app-store'
import { getTreeForTab, type SplitDirection } from '../state/layout-tree'
import { CreateSessionModal } from './components/create-session-modal'
import { HelpModal } from './components/help-modal'
import { NewTabModal } from './components/new-tab-modal'
import { SessionNameModal } from './components/session-name-modal'
import { SessionPickerModal } from './components/session-picker-modal'
import { Sidebar } from './components/sidebar'
import { SnippetEditorModal } from './components/snippet-editor-modal'
import { SnippetPickerModal } from './components/snippet-picker-modal'
import { SplitLayout } from './components/split-layout'
import { StatusBar } from './components/status-bar'
import { TerminalPane } from './components/terminal-pane'
import { ThemePickerModal } from './components/theme-picker-modal'
import { theme } from './theme'

function getCreateSessionFields(modal: ModalState) {
  if (modal.type !== 'create-session') {
    return { directoryQuery: '', sessionName: '' }
  }

  if (modal.activeField === 'directory') {
    return {
      directoryQuery: modal.editBuffer ?? '',
      sessionName: modal.nameBuffer,
    }
  }

  return {
    directoryQuery: modal.nameBuffer,
    sessionName: modal.editBuffer ?? '',
  }
}

function getSnippetEditorFields(modal: ModalState) {
  if (modal.type !== 'snippet-editor') {
    return { snippetContent: '', snippetName: '' }
  }

  if (modal.activeField === 'name') {
    return {
      snippetContent: modal.contentBuffer,
      snippetName: modal.editBuffer ?? '',
    }
  }

  return {
    snippetContent: modal.editBuffer ?? '',
    snippetName: modal.contentBuffer,
  }
}

function renderModal(
  modal: ModalState,
  options: {
    customCommands: Record<string, string>
    sessions: SessionRecord[]
    currentSessionId: string | null
    currentTabCount: number
    snippets: SnippetRecord[]
    themeId: ThemeId
    createSessionFields: { directoryQuery: string; sessionName: string }
    snippetEditorFields: { snippetName: string; snippetContent: string }
  }
) {
  switch (modal.type) {
    case 'new-tab':
    case 'split-picker':
      return (
        <NewTabModal
          customCommands={options.customCommands}
          selectedIndex={modal.selectedIndex}
          editBuffer={modal.editBuffer}
        />
      )
    case 'session-picker':
      return (
        <SessionPickerModal
          currentSessionId={options.currentSessionId}
          currentTabCount={options.currentTabCount}
          selectedIndex={modal.selectedIndex}
          sessions={options.sessions}
          filter={modal.editBuffer}
        />
      )
    case 'session-name':
      return (
        <SessionNameModal
          title={modal.sessionTargetId ? 'Rename session' : 'Create session'}
          value={modal.editBuffer ?? ''}
        />
      )
    case 'rename-tab':
      return <SessionNameModal value={modal.editBuffer ?? ''} title="Rename tab" />
    case 'create-session':
      return (
        <CreateSessionModal
          directoryQuery={options.createSessionFields.directoryQuery}
          sessionName={options.createSessionFields.sessionName}
          pendingProjectPath={modal.pendingProjectPath}
          selectedIndex={modal.selectedIndex}
          results={modal.directoryResults}
          activeField={modal.activeField}
        />
      )
    case 'snippet-picker':
      return (
        <SnippetPickerModal
          selectedIndex={modal.selectedIndex}
          snippets={options.snippets}
          filter={modal.editBuffer}
        />
      )
    case 'snippet-editor':
      return (
        <SnippetEditorModal
          snippetContent={options.snippetEditorFields.snippetContent}
          snippetName={options.snippetEditorFields.snippetName}
          isEditing={modal.sessionTargetId !== null}
          activeField={modal.activeField}
        />
      )
    case 'theme-picker':
      return (
        <ThemePickerModal selectedIndex={modal.selectedIndex} currentThemeId={options.themeId} />
      )
    case 'help':
      return <HelpModal />
    case null:
      return null
    default:
      modal satisfies never
  }
}

interface RootViewProps {
  themeId: ThemeId
  contentOrigin: TerminalContentOrigin
  mouseForwardingEnabled: boolean
  localScrollbackEnabled: boolean
  onTerminalMouseEvent: (event: MouseEvent, origin: TerminalContentOrigin) => void
  onTerminalScrollEvent: (event: MouseEvent) => void
  onTerminalClick?: (event: MouseEvent, origin: TerminalContentOrigin, tabId?: string) => void
  onPaneActivate?: (tabId: string) => void
  onSplitResize?: (tabId: string, ratio: number, axis: SplitDirection) => void
  onSeparatorDragStart?: (info: {
    tabId: string
    direction: SplitDirection
    screenStart: number
    totalSize: number
  }) => void
  onSeparatorDrag?: (event: MouseEvent) => boolean
  onSeparatorDragEnd?: () => void
  terminalCols: number
  terminalRows: number
}

export function RootView({
  contentOrigin,
  localScrollbackEnabled,
  mouseForwardingEnabled,
  onPaneActivate,
  onSeparatorDrag,
  onSeparatorDragEnd,
  onSeparatorDragStart,
  onSplitResize,
  onTerminalClick,
  onTerminalMouseEvent,
  onTerminalScrollEvent,
  terminalCols,
  terminalRows,
  themeId,
}: RootViewProps) {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const layoutTrees = useAppStore((s) => s.layoutTrees)
  const tabGroupMap = useAppStore((s) => s.tabGroupMap)
  const focusMode = useAppStore((s) => s.focusMode)
  const modal = useAppStore((s) => s.modal)
  const snippets = useAppStore((s) => s.snippets)
  const customCommands = useAppStore((s) => s.customCommands)
  const sessions = useAppStore((s) => s.sessions)
  const currentSessionId = useAppStore((s) => s.currentSessionId)

  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  const activeTree = activeTabId ? getTreeForTab(layoutTrees, tabGroupMap, activeTabId) : null
  const createSessionFields = getCreateSessionFields(modal)
  const snippetEditorFields = getSnippetEditorFields(modal)

  return (
    <box backgroundColor={theme.background} flexDirection="column" height="100%" width="100%">
      <box flexDirection="row" flexGrow={1} padding={0} gap={0}>
        <Sidebar onTabActivate={onPaneActivate} />
        {activeTree && activeTree.type === 'split' ? (
          <SplitLayout
            bounds={{ cols: terminalCols, rows: terminalRows, x: 0, y: 0 }}
            localScrollbackEnabled={localScrollbackEnabled}
            mouseForwardingEnabled={mouseForwardingEnabled}
            onTerminalScrollEvent={onTerminalScrollEvent}
            onSeparatorDragStart={onSeparatorDragStart}
            onTerminalMouseEvent={onTerminalMouseEvent}
            onSeparatorDragEnd={onSeparatorDragEnd}
            onSeparatorDrag={onSeparatorDrag}
            onTerminalClick={onTerminalClick}
            onPaneActivate={onPaneActivate}
            contentOrigin={contentOrigin}
            onSplitResize={onSplitResize}
            activeTabId={activeTabId}
            focusMode={focusMode}
            node={activeTree}
            tabs={tabs}
          />
        ) : (
          <TerminalPane
            localScrollbackEnabled={localScrollbackEnabled}
            mouseForwardingEnabled={mouseForwardingEnabled}
            onTerminalScrollEvent={onTerminalScrollEvent}
            onTerminalMouseEvent={onTerminalMouseEvent}
            onTerminalClick={onTerminalClick}
            contentOrigin={contentOrigin}
            focusMode={focusMode}
            tab={activeTab}
          />
        )}
      </box>
      <StatusBar />
      {renderModal(modal, {
        createSessionFields,
        currentSessionId,
        currentTabCount: tabs.length,
        customCommands,
        sessions,
        snippetEditorFields,
        snippets,
        themeId,
      })}
    </box>
  )
}
