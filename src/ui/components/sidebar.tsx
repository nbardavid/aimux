import type { ScrollBoxRenderable } from '@opentui/core'

import { useMemo, useRef } from 'react'

import { useGitPanelPolling } from '../../git/git-poller'
import { useAppStore } from '../../state/app-store'
import { theme } from '../theme'
import { GitPanel } from './git-panel'
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

function SidebarTop() {
  const sidebarWidth = useAppStore((s) => s.sidebar.width)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const sessions = useAppStore((s) => s.sessions)
  const currentSession = currentSessionId
    ? sessions.find((s) => s.id === currentSessionId)
    : undefined
  const projectPath = currentSession?.projectPath
  const branch = useSidebarBranch(projectPath)

  return (
    <box flexDirection="column" flexShrink={0} gap={0}>
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
      <text fg={theme.dim}>{'·'.repeat(Math.max(0, sidebarWidth - 2))}</text>
    </box>
  )
}

function renderGroupGutter(
  isGroupStart: boolean,
  isGroupMiddle: boolean,
  isGroupEnd: boolean,
  isActive: boolean
) {
  return (
    <box flexDirection="column" width={1} overflow="hidden">
      <text fg={theme.accentAlt} bg={isActive ? theme.panelHighlight : undefined}>
        {/* oxlint-disable-next-line no-nested-ternary */}
        {isGroupStart ? GUTTER_START : isGroupMiddle ? GUTTER_MIDDLE : GUTTER_PAD}
      </text>
      <text fg={theme.accentAlt} bg={isActive ? theme.panelHighlight : undefined}>
        {isGroupEnd ? GUTTER_END : GUTTER_PAD}
      </text>
    </box>
  )
}

interface TabsBodyProps {
  onTabActivate?: (tabId: string) => void
}

function TabsBody({ onTabActivate }: TabsBodyProps) {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const focusMode = useAppStore((s) => s.focusMode)
  const layoutTrees = useAppStore((s) => s.layoutTrees)
  const sidebarVisible = useAppStore((s) => s.sidebar.visible)

  const scrollRef = useRef<ScrollBoxRenderable | null>(null)
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId)
  const tabGroupInfo = useMemo(() => buildTabGroupInfo(layoutTrees, tabs), [layoutTrees, tabs])

  useSidebarAutoScroll({
    activeIndex,
    activeTabId,
    scrollRef,
    tabCount: tabs.length,
    visible: sidebarVisible,
  })

  return (
    <scrollbox
      paddingTop={0}
      ref={scrollRef}
      flexGrow={1}
      scrollY
      viewportCulling
      contentOptions={{ flexDirection: 'column', gap: 0 }}
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
              key={tab.id}
              flexDirection="row"
              onMouseDown={onTabActivate ? () => onTabActivate(tab.id) : undefined}
            >
              {inGroup
                ? renderGroupGutter(isGroupStart, isGroupMiddle, isGroupEnd, isActive)
                : null}
              <box flexGrow={1}>
                <TabItem
                  id={`sidebar-tab-${tab.id}`}
                  tab={tab}
                  active={isActive}
                  focused={focusMode === 'navigation'}
                  isFocusedInput={isActive && focusMode === 'terminal-input'}
                  inLayout={inLayout}
                />
              </box>
            </box>
          )
        })
      )}
    </scrollbox>
  )
}

function GitBody() {
  const gitPanel = useAppStore((s) => s.gitPanel)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const sessions = useAppStore((s) => s.sessions)
  const sidebarVisible = useAppStore((s) => s.sidebar.visible)
  const currentSession = currentSessionId
    ? sessions.find((s) => s.id === currentSessionId)
    : undefined
  const projectPath = currentSession?.projectPath

  useGitPanelPolling({
    enabled: sidebarVisible,
    projectPath,
  })

  return <GitPanel gitPanel={gitPanel} projectPath={projectPath} />
}

function SidebarBody({ onTabActivate }: TabsBodyProps) {
  const view = useAppStore((s) => s.sidebar.view)
  return view === 'git' ? <GitBody /> : <TabsBody onTabActivate={onTabActivate} />
}

export function Sidebar({ onTabActivate }: SidebarProps) {
  const sidebarVisible = useAppStore((s) => s.sidebar.visible)
  const sidebarWidth = useAppStore((s) => s.sidebar.width)

  if (!sidebarVisible) {
    return null
  }

  return (
    <box
      width={sidebarWidth}
      padding={0}
      flexDirection="column"
      backgroundColor={theme.panel}
      gap={0}
    >
      <SidebarTop />
      <SidebarBody onTabActivate={onTabActivate} />
    </box>
  )
}
