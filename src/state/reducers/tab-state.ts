import type { AppAction, AppState, TabSession } from '../types'

import {
  allLeafIds,
  createGroupId,
  createLeaf,
  findLeaf,
  getAdjacentLeaf,
  getGroupIdForTab,
  getTreeForTab,
  pruneLayoutTree,
  removeNode,
  resizeSplit,
  setSplitRatio,
  splitNode,
} from '../layout-tree'

function clampBuffer(buffer: string): string {
  return buffer.length <= 50_000 ? buffer : buffer.slice(buffer.length - 50_000)
}

function updateTab(
  tabs: TabSession[],
  tabId: string,
  updater: (tab: TabSession) => TabSession
): TabSession[] {
  return tabs.map((tab) => (tab.id === tabId ? updater(tab) : tab))
}

function getActiveIndex(state: AppState): number {
  if (!state.activeTabId) {
    return -1
  }

  return state.tabs.findIndex((tab) => tab.id === state.activeTabId)
}

function closeTabAtIndex(state: AppState, indexToClose: number): AppState {
  if (indexToClose < 0 || indexToClose >= state.tabs.length) {
    return state
  }

  const closingTabId = state.tabs[indexToClose]?.id
  const tabs = state.tabs.filter((_, index) => index !== indexToClose)

  // Find the tree for the closing tab's group
  const groupId = closingTabId ? getGroupIdForTab(state.tabGroupMap, closingTabId) : null
  const groupTree = groupId ? (state.layoutTrees[groupId] ?? null) : null

  let nextActiveTabId: string | null
  if (state.activeTabId === closingTabId) {
    const layoutNeighbor =
      closingTabId && groupTree
        ? (getAdjacentLeaf(groupTree, closingTabId, 'right') ??
          getAdjacentLeaf(groupTree, closingTabId, 'left') ??
          getAdjacentLeaf(groupTree, closingTabId, 'down') ??
          getAdjacentLeaf(groupTree, closingTabId, 'up'))
        : null
    nextActiveTabId = layoutNeighbor ?? tabs[indexToClose]?.id ?? tabs[indexToClose - 1]?.id ?? null
  } else {
    nextActiveTabId = tabs.find((tab) => tab.id === state.activeTabId)?.id ?? null
  }

  // Update the group's tree and clean up if needed
  let newLayoutTrees = state.layoutTrees
  let newTabGroupMap = state.tabGroupMap
  if (closingTabId && groupId && groupTree) {
    const newTree = removeNode(groupTree, closingTabId)
    newLayoutTrees = { ...state.layoutTrees }
    newTabGroupMap = { ...state.tabGroupMap }
    delete newTabGroupMap[closingTabId]
    if (newTree === null || newTree.type === 'leaf') {
      // Group collapsed to single leaf or empty — remove the group
      delete newLayoutTrees[groupId]
      if (newTree?.type === 'leaf') {
        delete newTabGroupMap[newTree.tabId]
      }
    } else {
      newLayoutTrees[groupId] = newTree
    }
  }

  return {
    ...state,
    tabs,
    activeTabId: nextActiveTabId,
    layoutTrees: newLayoutTrees,
    tabGroupMap: newTabGroupMap,
    focusMode: tabs.length === 0 ? 'navigation' : state.focusMode,
  }
}

export function reduceTabState(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case 'add-tab': {
      const newTab = { ...action.tab, activity: action.tab.activity ?? 'idle' }
      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
        focusMode: 'navigation',
        modal: { type: null, selectedIndex: 0, editBuffer: null, sessionTargetId: null },
      }
    }
    case 'hydrate-workspace': {
      const hydratedActiveTabId =
        action.activeTabId && action.tabs.some((tab) => tab.id === action.activeTabId)
          ? action.activeTabId
          : (action.tabs[0]?.id ?? null)
      const tabIds = new Set(action.tabs.map((t) => t.id))

      // Restore from new multi-tree format or migrate from legacy single tree
      let hydratedTrees: Record<string, import('../layout-tree').LayoutNode> = {}
      let hydratedGroupMap: Record<string, string> = {}

      if (action.layoutTrees && action.tabGroupMap) {
        // New format: prune each group tree
        for (const [gId, tree] of Object.entries(action.layoutTrees)) {
          const pruned = pruneLayoutTree(tree, tabIds)
          if (pruned && pruned.type === 'split') {
            hydratedTrees[gId] = pruned
            for (const leafId of allLeafIds(pruned)) {
              hydratedGroupMap[leafId] = gId
            }
          }
          // If pruned to a single leaf or null, discard the group
        }
      } else if (action.layoutTree) {
        // Legacy migration: single tree → single group
        const pruned = pruneLayoutTree(action.layoutTree, tabIds)
        if (pruned && pruned.type === 'split') {
          const gId = createGroupId()
          hydratedTrees[gId] = pruned
          for (const leafId of allLeafIds(pruned)) {
            hydratedGroupMap[leafId] = gId
          }
        }
      }

      return {
        ...state,
        tabs: action.tabs,
        activeTabId: hydratedActiveTabId,
        layoutTrees: hydratedTrees,
        tabGroupMap: hydratedGroupMap,
        focusMode: 'navigation',
      }
    }
    case 'close-tab':
      return closeTabAtIndex(
        state,
        state.tabs.findIndex((tab) => tab.id === action.tabId)
      )
    case 'close-active-tab':
      return closeTabAtIndex(state, getActiveIndex(state))
    case 'set-active-tab':
      return { ...state, activeTabId: action.tabId }
    case 'move-active-tab': {
      if (state.tabs.length === 0) {
        return state
      }
      const currentIndex = state.tabs.findIndex((tab) => tab.id === state.activeTabId)
      const safeIndex = currentIndex === -1 ? 0 : currentIndex
      const nextIndex = (safeIndex + action.delta + state.tabs.length) % state.tabs.length
      const nextTabId = state.tabs[nextIndex]?.id
      return !nextTabId || nextTabId === state.activeTabId
        ? state
        : { ...state, activeTabId: nextTabId }
    }
    case 'reorder-active-tab': {
      const activeIndex = getActiveIndex(state)
      if (activeIndex === -1) {
        return state
      }

      // Group-aware reordering: move entire layout group together
      const activeGroupId = state.activeTabId
        ? getGroupIdForTab(state.tabGroupMap, state.activeTabId)
        : null
      const activeGroupTree = activeGroupId ? state.layoutTrees[activeGroupId] : null
      const layoutIds = activeGroupTree ? allLeafIds(activeGroupTree) : []
      if (layoutIds.length > 1 && state.activeTabId && layoutIds.includes(state.activeTabId)) {
        const layoutSet = new Set(layoutIds)
        let groupStart = activeIndex
        let groupEnd = activeIndex
        while (groupStart > 0 && layoutSet.has(state.tabs[groupStart - 1]!.id)) groupStart--
        while (groupEnd < state.tabs.length - 1 && layoutSet.has(state.tabs[groupEnd + 1]!.id))
          groupEnd++

        const tabs = [...state.tabs]
        if (action.delta > 0 && groupEnd < tabs.length - 1) {
          // Check if the adjacent item belongs to another group → skip over it
          const adjacentId = tabs[groupEnd + 1]!.id
          const adjacentGroupId = getGroupIdForTab(state.tabGroupMap, adjacentId)
          const adjacentTree = adjacentGroupId ? state.layoutTrees[adjacentGroupId] : null
          if (adjacentTree && adjacentTree.type === 'split') {
            const adjacentIds = new Set(allLeafIds(adjacentTree))
            let otherEnd = groupEnd + 1
            while (otherEnd < tabs.length - 1 && adjacentIds.has(tabs[otherEnd + 1]!.id)) otherEnd++
            // Move the other group's tabs before our group
            const otherCount = otherEnd - groupEnd
            const moved = tabs.splice(groupEnd + 1, otherCount)
            tabs.splice(groupStart, 0, ...moved)
          } else {
            const [moved] = tabs.splice(groupEnd + 1, 1)
            tabs.splice(groupStart, 0, moved!)
          }
        } else if (action.delta < 0 && groupStart > 0) {
          const adjacentId = tabs[groupStart - 1]!.id
          const adjacentGroupId = getGroupIdForTab(state.tabGroupMap, adjacentId)
          const adjacentTree = adjacentGroupId ? state.layoutTrees[adjacentGroupId] : null
          if (adjacentTree && adjacentTree.type === 'split') {
            const adjacentIds = new Set(allLeafIds(adjacentTree))
            let otherStart = groupStart - 1
            while (otherStart > 0 && adjacentIds.has(tabs[otherStart - 1]!.id)) otherStart--
            const otherCount = groupStart - otherStart
            const moved = tabs.splice(otherStart, otherCount)
            tabs.splice(otherStart + (groupEnd - groupStart + 1), 0, ...moved)
          } else {
            const [moved] = tabs.splice(groupStart - 1, 1)
            tabs.splice(groupEnd, 0, moved!)
          }
        } else {
          return state
        }
        return { ...state, tabs }
      }

      // Standalone tab reorder
      const nextIndex = activeIndex + action.delta
      if (nextIndex < 0 || nextIndex >= state.tabs.length) {
        return state
      }
      // Check if target belongs to a group → skip over the entire group
      const targetTabId = state.tabs[nextIndex]!.id
      const targetGroupId = getGroupIdForTab(state.tabGroupMap, targetTabId)
      const targetTree = targetGroupId ? state.layoutTrees[targetGroupId] : null
      if (targetTree && targetTree.type === 'split') {
        const targetIds = new Set(allLeafIds(targetTree))
        const tabs = [...state.tabs]
        if (action.delta > 0) {
          let targetEnd = nextIndex
          while (targetEnd < tabs.length - 1 && targetIds.has(tabs[targetEnd + 1]!.id)) targetEnd++
          const [moved] = tabs.splice(activeIndex, 1)
          tabs.splice(targetEnd, 0, moved!)
        } else {
          let targetStart = nextIndex
          while (targetStart > 0 && targetIds.has(tabs[targetStart - 1]!.id)) targetStart--
          const [moved] = tabs.splice(activeIndex, 1)
          tabs.splice(targetStart, 0, moved!)
        }
        return { ...state, tabs }
      }
      const tabs = [...state.tabs]
      const current = tabs[activeIndex]
      const target = tabs[nextIndex]
      if (!current || !target) {
        return state
      }
      tabs[activeIndex] = target
      tabs[nextIndex] = current
      return { ...state, tabs }
    }
    case 'reset-tab-session':
      return {
        ...state,
        activeTabId: action.tabId,
        focusMode: 'navigation',
        tabs: updateTab(state.tabs, action.tabId, (tab) => ({
          ...tab,
          status: 'starting',
          activity: 'idle',
          buffer: '',
          viewport: undefined,
          errorMessage: undefined,
          exitCode: undefined,
          terminalModes: {
            mouseTrackingMode: 'none',
            sendFocusMode: false,
            alternateScrollMode: false,
            isAlternateBuffer: false,
            bracketedPasteMode: false,
          },
        })),
      }
    case 'append-tab-buffer':
      return {
        ...state,
        tabs: updateTab(state.tabs, action.tabId, (tab) => ({
          ...tab,
          buffer: clampBuffer(`${tab.buffer}${action.chunk}`),
          status: tab.status === 'starting' ? 'running' : tab.status,
        })),
      }
    case 'replace-tab-viewport':
      return {
        ...state,
        tabs: updateTab(state.tabs, action.tabId, (tab) => ({
          ...tab,
          viewport: action.viewport,
          terminalModes: action.terminalModes,
          status: tab.status === 'starting' ? 'running' : tab.status,
        })),
      }
    case 'set-tab-activity':
      return {
        ...state,
        tabs: updateTab(state.tabs, action.tabId, (tab) => ({ ...tab, activity: action.activity })),
      }
    case 'set-tab-status':
      return {
        ...state,
        tabs: updateTab(state.tabs, action.tabId, (tab) => ({
          ...tab,
          status: action.status,
          exitCode: action.exitCode,
          activity: action.status === 'running' ? tab.activity : undefined,
        })),
      }
    case 'set-tab-error':
      return {
        ...state,
        tabs: updateTab(state.tabs, action.tabId, (tab) => ({
          ...tab,
          status: 'error',
          activity: undefined,
          errorMessage: action.message,
          buffer: clampBuffer(`${tab.buffer}${action.message}\n`),
        })),
      }
    case 'rename-tab':
      return {
        ...state,
        tabs: updateTab(state.tabs, action.tabId, (tab) => ({ ...tab, title: action.title })),
      }
    case 'split-pane': {
      if (!state.activeTabId) {
        return state
      }
      const newTab = { ...action.newTab, activity: action.newTab.activity ?? 'idle' }

      // Find existing group for active tab, or create a new one
      let groupId = getGroupIdForTab(state.tabGroupMap, state.activeTabId)
      let tree: import('../layout-tree').LayoutNode
      if (groupId && state.layoutTrees[groupId] !== undefined) {
        tree = state.layoutTrees[groupId]!
      } else {
        groupId = createGroupId()
        tree = createLeaf(state.activeTabId)
      }

      const newTree = splitNode(tree, state.activeTabId, action.direction, newTab.id)

      // Insert newTab right after the last layout group member
      const layoutIdSet = new Set(allLeafIds(tree))
      let insertIndex = state.tabs.length
      for (let i = state.tabs.length - 1; i >= 0; i--) {
        if (layoutIdSet.has(state.tabs[i]!.id)) {
          insertIndex = i + 1
          break
        }
      }
      const tabs = [...state.tabs.slice(0, insertIndex), newTab, ...state.tabs.slice(insertIndex)]

      return {
        ...state,
        tabs,
        activeTabId: newTab.id,
        layoutTrees: { ...state.layoutTrees, [groupId]: newTree },
        tabGroupMap: {
          ...state.tabGroupMap,
          [state.activeTabId]: groupId,
          [newTab.id]: groupId,
        },
      }
    }
    case 'close-pane': {
      const idx = state.tabs.findIndex((tab) => tab.id === action.tabId)
      return closeTabAtIndex(state, idx)
    }
    case 'focus-pane-direction': {
      if (!state.activeTabId) {
        return state
      }
      const focusTree = getTreeForTab(state.layoutTrees, state.tabGroupMap, state.activeTabId)
      if (!focusTree) {
        return state
      }
      const neighbor = getAdjacentLeaf(focusTree, state.activeTabId, action.direction)
      if (!neighbor) {
        return state
      }
      return { ...state, activeTabId: neighbor }
    }
    case 'resize-pane': {
      const resizeGroupId = getGroupIdForTab(state.tabGroupMap, action.tabId)
      const resizeTree = resizeGroupId ? state.layoutTrees[resizeGroupId] : null
      if (!resizeGroupId || !resizeTree) {
        return state
      }
      const newTree = resizeSplit(resizeTree, action.tabId, action.delta, action.axis)
      if (newTree === resizeTree) {
        return state
      }
      return { ...state, layoutTrees: { ...state.layoutTrees, [resizeGroupId]: newTree } }
    }
    case 'set-split-ratio': {
      const ratioGroupId = getGroupIdForTab(state.tabGroupMap, action.tabId)
      const ratioTree = ratioGroupId ? state.layoutTrees[ratioGroupId] : null
      if (!ratioGroupId || !ratioTree) {
        return state
      }
      const newTree = setSplitRatio(ratioTree, action.tabId, action.ratio, action.axis)
      if (newTree === ratioTree) {
        return state
      }
      return { ...state, layoutTrees: { ...state.layoutTrees, [ratioGroupId]: newTree } }
    }
    default:
      return null
  }
}
