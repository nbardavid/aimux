import type { ScrollBoxRenderable } from '@opentui/core'

import { useMemo, useRef } from 'react'

import { useAppStore } from '../../state/app-store'
import { theme } from '../theme'
import { buildTabGroupInfo } from './sidebar-group-metadata'
import { TabItem } from './tab-item'
import { useSidebarAutoScroll } from './use-sidebar-auto-scroll'
import { useSidebarBranch } from './use-sidebar-branch'

interface SidebarProps {
  onTabActivate?: (tabId: string) => void
}

const GUTTER_START = '╭'
const GUTTER_MIDDLE = '├'
const GUTTER_END = '╰'
const GUTTER_PAD = '│'

function renderGroupGutter(isGroupStart: boolean, isGroupMiddle: boolean, isGroupEnd: boolean) {
  return (
    <box flexDirection="column" overflow="hidden" width={1}>
      <text fg={theme.accent}>{isGroupStart ? GUTTER_START : GUTTER_PAD}</text>
      <text fg={theme.accent}>{GUTTER_PAD}</text>
      <text fg={theme.accent}>{isGroupMiddle ? GUTTER_MIDDLE : GUTTER_PAD}</text>
      <text fg={theme.accent}>{isGroupEnd ? GUTTER_END : GUTTER_PAD}</text>
    </box>
  )
}

export function Sidebar({ onTabActivate }: SidebarProps) {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const sidebar = useAppStore((s) => s.sidebar)
  const focusMode = useAppStore((s) => s.focusMode)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const sessions = useAppStore((s) => s.sessions)
  const layoutTrees = useAppStore((s) => s.layoutTrees)

  const scrollRef = useRef<ScrollBoxRenderable | null>(null)
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId)

  const currentSession = currentSessionId
    ? sessions.find((s) => s.id === currentSessionId)
    : undefined
  const projectPath = currentSession?.projectPath
  const branch = useSidebarBranch(projectPath)
  const tabGroupInfo = useMemo(() => buildTabGroupInfo(layoutTrees, tabs), [layoutTrees, tabs])

  useSidebarAutoScroll({
    activeIndex,
    activeTabId,
    scrollRef,
    tabCount: tabs.length,
    visible: sidebar.visible,
  })

  if (!sidebar.visible) {
    return null
  }

  return (
    <box
      borderColor={focusMode === 'navigation' ? theme.borderActive : theme.border}
      backgroundColor={theme.panelMuted}
      flexDirection="column"
      width={sidebar.width}
      padding={0}
      gap={0}
      border
    >
      <text fg={theme.accent}>
        <strong>aimux</strong>
      </text>
      <text fg={theme.accentAlt}>
        {currentSession ? currentSession.name : 'No session selected'}
      </text>
      {branch ? (
        <box flexDirection="row">
          <text fg={theme.accent}>{'\u{e702}'} </text>
          <text fg={theme.textMuted}>{branch}</text>
        </box>
      ) : null}
      <text fg={theme.dim}>{'─'.repeat(Math.max(0, sidebar.width - 2))}</text>
      <scrollbox
        contentOptions={{ flexDirection: 'column', gap: 0 }}
        ref={scrollRef}
        viewportCulling
        paddingTop={0}
        flexGrow={1}
        scrollY
      >
        {tabs.length === 0 ? (
          <box paddingTop={1}>
            <text fg={theme.textMuted}>No tabs yet. Press Ctrl+n.</text>
          </box>
        ) : (
          tabs.map((tab, index) => {
            const isActive = tab.id === activeTabId
            const info = tabGroupInfo.get(tab.id)
            const inLayout = !!info?.inLayout
            const inGroup = info ? index >= info.groupStart && index <= info.groupEnd : false
            const isGroupStart = info ? index === info.groupStart : false
            const isGroupEnd = info ? index === info.groupEnd : false
            const isGroupMiddle = inGroup && !isGroupStart && !isGroupEnd

            return (
              <box
                onMouseDown={onTabActivate ? () => onTabActivate(tab.id) : undefined}
                flexDirection="row"
                key={tab.id}
              >
                {inGroup ? renderGroupGutter(isGroupStart, isGroupMiddle, isGroupEnd) : null}
                <box flexGrow={1}>
                  <TabItem
                    isFocusedInput={isActive && focusMode === 'terminal-input'}
                    focused={focusMode === 'navigation'}
                    id={`sidebar-tab-${tab.id}`}
                    inLayout={inLayout}
                    active={isActive}
                    tab={tab}
                  />
                </box>
              </box>
            )
          })
        )}
      </scrollbox>
    </box>
  )
}
