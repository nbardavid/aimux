import type { AppAction, AppState, TabSession } from '../types'

import {
  createLeaf,
  findLeaf,
  getAdjacentLeaf,
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

  let nextActiveTabId: string | null
  if (state.activeTabId === closingTabId) {
    // Try to find adjacent pane in layout tree first
    const layoutNeighbor =
      closingTabId && state.layoutTree
        ? (getAdjacentLeaf(state.layoutTree, closingTabId, 'right') ??
          getAdjacentLeaf(state.layoutTree, closingTabId, 'left') ??
          getAdjacentLeaf(state.layoutTree, closingTabId, 'down') ??
          getAdjacentLeaf(state.layoutTree, closingTabId, 'up'))
        : null
    nextActiveTabId = layoutNeighbor ?? tabs[indexToClose]?.id ?? tabs[indexToClose - 1]?.id ?? null
  } else {
    nextActiveTabId = tabs.find((tab) => tab.id === state.activeTabId)?.id ?? null
  }

  const newTree =
    closingTabId && state.layoutTree ? removeNode(state.layoutTree, closingTabId) : state.layoutTree

  return {
    ...state,
    tabs,
    activeTabId: nextActiveTabId,
    layoutTree: newTree,
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
        layoutTree: state.layoutTree ? state.layoutTree : createLeaf(newTab.id),
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
      const rawTree = action.layoutTree ?? (action.tabs[0] ? createLeaf(action.tabs[0].id) : null)
      const prunedTree = rawTree ? pruneLayoutTree(rawTree, tabIds) : null
      const hydratedTree = prunedTree ?? (action.tabs[0] ? createLeaf(action.tabs[0].id) : null)
      return {
        ...state,
        tabs: action.tabs,
        activeTabId: hydratedActiveTabId,
        layoutTree: hydratedTree,
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
      const nextIndex = activeIndex + action.delta
      if (nextIndex < 0 || nextIndex >= state.tabs.length) {
        return state
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
      const currentTree = state.layoutTree ?? createLeaf(state.activeTabId)
      const tree = findLeaf(currentTree, state.activeTabId)
        ? currentTree
        : createLeaf(state.activeTabId)
      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
        layoutTree: splitNode(tree, state.activeTabId, action.direction, newTab.id),
      }
    }
    case 'close-pane': {
      const idx = state.tabs.findIndex((tab) => tab.id === action.tabId)
      return closeTabAtIndex(state, idx)
    }
    case 'focus-pane-direction': {
      if (!state.activeTabId || !state.layoutTree) {
        return state
      }
      const neighbor = getAdjacentLeaf(state.layoutTree, state.activeTabId, action.direction)
      if (!neighbor) {
        return state
      }
      return { ...state, activeTabId: neighbor }
    }
    case 'resize-pane': {
      if (!state.layoutTree) {
        return state
      }
      const newTree = resizeSplit(state.layoutTree, action.tabId, action.delta, action.axis)
      if (newTree === state.layoutTree) {
        return state
      }
      return { ...state, layoutTree: newTree }
    }
    case 'set-split-ratio': {
      if (!state.layoutTree) {
        return state
      }
      const newTree = setSplitRatio(state.layoutTree, action.tabId, action.ratio, action.axis)
      if (newTree === state.layoutTree) {
        return state
      }
      return { ...state, layoutTree: newTree }
    }
    default:
      return null
  }
}
