import type { MouseEvent as OtuiMouseEvent } from '@opentui/core'

import type { TerminalContentOrigin } from '../../input/raw-input-handler'
import type { LayoutNode } from '../../state/layout-tree'
import type { FocusMode, TabSession } from '../../state/types'

import { theme } from '../theme'
import { TerminalPane } from './terminal-pane'

interface SplitLayoutProps {
  node: LayoutNode
  tabs: TabSession[]
  activeTabId: string | null
  focusMode: FocusMode
  mouseForwardingEnabled: boolean
  localScrollbackEnabled: boolean
  onTerminalMouseEvent: (event: OtuiMouseEvent, origin: TerminalContentOrigin) => void
  onTerminalScrollEvent: (event: OtuiMouseEvent) => void
  onTerminalClick?: (event: OtuiMouseEvent, origin: TerminalContentOrigin) => void
  contentOrigin: TerminalContentOrigin
}

export function SplitLayout({
  node,
  tabs,
  activeTabId,
  focusMode,
  mouseForwardingEnabled,
  localScrollbackEnabled,
  onTerminalMouseEvent,
  onTerminalScrollEvent,
  onTerminalClick,
  contentOrigin,
}: SplitLayoutProps) {
  if (node.type === 'leaf') {
    const tab = tabs.find((t) => t.id === node.tabId)
    const isActive = node.tabId === activeTabId
    return (
      <TerminalPane
        tab={tab}
        focusMode={focusMode}
        isActive={isActive}
        contentOrigin={contentOrigin}
        mouseForwardingEnabled={isActive && mouseForwardingEnabled}
        localScrollbackEnabled={isActive && localScrollbackEnabled}
        onTerminalMouseEvent={onTerminalMouseEvent}
        onTerminalScrollEvent={onTerminalScrollEvent}
        onTerminalClick={onTerminalClick}
      />
    )
  }

  const flexDir = node.direction === 'vertical' ? 'row' : 'column'
  const firstGrow = Math.round(node.ratio * 100)
  const secondGrow = 100 - firstGrow

  return (
    <box flexDirection={flexDir} flexGrow={1} gap={0}>
      <box flexGrow={firstGrow} flexDirection="column">
        <SplitLayout
          node={node.first}
          tabs={tabs}
          activeTabId={activeTabId}
          focusMode={focusMode}
          mouseForwardingEnabled={mouseForwardingEnabled}
          localScrollbackEnabled={localScrollbackEnabled}
          onTerminalMouseEvent={onTerminalMouseEvent}
          onTerminalScrollEvent={onTerminalScrollEvent}
          onTerminalClick={onTerminalClick}
          contentOrigin={contentOrigin}
        />
      </box>
      <box
        minWidth={node.direction === 'vertical' ? 1 : undefined}
        minHeight={node.direction === 'horizontal' ? 1 : undefined}
        backgroundColor={theme.border}
      />
      <box flexGrow={secondGrow} flexDirection="column">
        <SplitLayout
          node={node.second}
          tabs={tabs}
          activeTabId={activeTabId}
          focusMode={focusMode}
          mouseForwardingEnabled={mouseForwardingEnabled}
          localScrollbackEnabled={localScrollbackEnabled}
          onTerminalMouseEvent={onTerminalMouseEvent}
          onTerminalScrollEvent={onTerminalScrollEvent}
          onTerminalClick={onTerminalClick}
          contentOrigin={contentOrigin}
        />
      </box>
    </box>
  )
}
