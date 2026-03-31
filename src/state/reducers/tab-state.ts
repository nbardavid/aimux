import type { AppAction, AppState, TabSession } from '../types'

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
  const nextActiveTab =
    state.activeTabId === closingTabId
      ? (tabs[indexToClose] ?? tabs[indexToClose - 1] ?? null)
      : (tabs.find((tab) => tab.id === state.activeTabId) ?? null)

  return {
    ...state,
    tabs,
    activeTabId: nextActiveTab?.id ?? null,
    focusMode: tabs.length === 0 ? 'navigation' : state.focusMode,
  }
}

export function reduceTabState(state: AppState, action: AppAction): AppState | null {
  switch (action.type) {
    case 'add-tab':
      return {
        ...state,
        tabs: [...state.tabs, { ...action.tab, activity: action.tab.activity ?? 'idle' }],
        activeTabId: action.tab.id,
        focusMode: 'navigation',
        modal: { type: null, selectedIndex: 0, editBuffer: null, sessionTargetId: null },
      }
    case 'hydrate-workspace': {
      const hydratedActiveTabId =
        action.activeTabId && action.tabs.some((tab) => tab.id === action.activeTabId)
          ? action.activeTabId
          : (action.tabs[0]?.id ?? null)
      return {
        ...state,
        tabs: action.tabs,
        activeTabId: hydratedActiveTabId,
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
    default:
      return null
  }
}
