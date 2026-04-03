import type { ScrollBoxRenderable } from '@opentui/core'

import { useEffect, useRef, useState } from 'react'

import type { TabSession } from '../../state/types'

import { useAppStore } from '../../state/app-store'
import { allLeafIds, type LayoutNode } from '../../state/layout-tree'
import { getCurrentBranch } from '../git-branch'
import { theme } from '../theme'
import { getSidebarScrollTarget } from './sidebar-scroll'
import { TabItem } from './tab-item'

interface SidebarProps {
  onTabActivate?: (tabId: string) => void
}

const GUTTER_START = '╭'
const GUTTER_MIDDLE = '├'
const GUTTER_END = '╰'
const GUTTER_PAD = '│'
const BRANCH_POLL_INTERVAL_MS = 5_000

interface TabGroupInfo {
  inLayout: boolean
  groupStart: number
  groupEnd: number
}

function buildTabGroupInfo(
  layoutTrees: Record<string, LayoutNode>,
  tabs: TabSession[]
): Map<string, TabGroupInfo> {
  const tabGroupInfo = new Map<string, TabGroupInfo>()

  for (const tree of Object.values(layoutTrees)) {
    const ids = allLeafIds(tree)
    if (ids.length <= 1) {
      continue
    }

    const idSet = new Set(ids)
    let groupStart = -1
    let groupEnd = -1

    for (const [index, tab] of tabs.entries()) {
      if (idSet.has(tab.id)) {
        if (groupStart === -1) {
          groupStart = index
        }
        groupEnd = index
      }
    }

    for (const id of ids) {
      tabGroupInfo.set(id, { inLayout: true, groupStart, groupEnd })
    }
  }

  return tabGroupInfo
}

function renderGroupGutter(isGroupStart: boolean, isGroupMiddle: boolean, isGroupEnd: boolean) {
  return (
    <box flexDirection="column" width={1} overflow="hidden">
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
  const previousActiveIndexRef = useRef(-1)
  const previousVisibilityRef = useRef(sidebar.visible)
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId)
  const [branch, setBranch] = useState<string | null>(null)

  const currentSession = currentSessionId
    ? sessions.find((s) => s.id === currentSessionId)
    : undefined
  const projectPath = currentSession?.projectPath
  const tabGroupInfo = buildTabGroupInfo(layoutTrees, tabs)

  useEffect(() => {
    if (!projectPath) {
      setBranch(null)
      return
    }

    let isCurrent = true
    const updateBranch = async () => {
      const nextBranch = await getCurrentBranch(projectPath)
      if (isCurrent) {
        setBranch(nextBranch)
      }
    }

    void updateBranch()
    const interval = setInterval(() => {
      void updateBranch()
    }, BRANCH_POLL_INTERVAL_MS)

    return () => {
      isCurrent = false
      clearInterval(interval)
    }
  }, [projectPath])

  useEffect(() => {
    if (!sidebar.visible) {
      previousVisibilityRef.current = false
      previousActiveIndexRef.current = activeIndex
      return
    }

    const scrollbox = scrollRef.current
    if (!scrollbox) {
      previousVisibilityRef.current = sidebar.visible
      previousActiveIndexRef.current = activeIndex
      return
    }

    if (!previousVisibilityRef.current && activeTabId) {
      scrollbox.scrollChildIntoView(`sidebar-tab-${activeTabId}`)
      previousVisibilityRef.current = true
      previousActiveIndexRef.current = activeIndex
      return
    }

    const scrollTarget = getSidebarScrollTarget({
      previousActiveIndex: previousActiveIndexRef.current,
      nextActiveIndex: activeIndex,
      tabCount: tabs.length,
    })

    if (scrollTarget === 'top') {
      scrollbox.scrollTo({ x: 0, y: 0 })
    } else if (scrollTarget === 'bottom') {
      scrollbox.scrollTo({ x: 0, y: scrollbox.scrollHeight })
    } else if (scrollTarget === 'active-item' && activeTabId) {
      scrollbox.scrollChildIntoView(`sidebar-tab-${activeTabId}`)
    }

    previousVisibilityRef.current = sidebar.visible
    previousActiveIndexRef.current = activeIndex
  }, [activeIndex, activeTabId, sidebar.visible, tabs.length])

  if (!sidebar.visible) {
    return null
  }

  return (
    <box
      width={sidebar.width}
      border
      borderColor={focusMode === 'navigation' ? theme.borderActive : theme.border}
      padding={0}
      flexDirection="column"
      backgroundColor={theme.panelMuted}
      gap={0}
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
                {inGroup ? renderGroupGutter(isGroupStart, isGroupMiddle, isGroupEnd) : null}
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
    </box>
  )
}
