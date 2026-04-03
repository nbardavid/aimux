import { describe, expect, test } from 'bun:test'

import type { LayoutNode } from '../../src/state/layout-tree'
import type { AppState, TabSession } from '../../src/state/types'

import { deriveModeId } from '../../src/input/modes/bridge'
import { registerAllModes } from '../../src/input/modes/handlers'
import { layoutMode } from '../../src/input/modes/handlers/layout'
import { getHandler } from '../../src/input/modes/registry'
import { allLeafIds, createLeaf, getTreeForTab } from '../../src/state/layout-tree'
import { appReducer, createInitialState } from '../../src/state/store'
import { createDefaultTerminalModes } from '../../src/state/terminal-modes'

/** Helper: build layoutTrees + tabGroupMap from a single tree */
function makeLayoutGroup(tree: LayoutNode): {
  layoutTrees: Record<string, LayoutNode>
  tabGroupMap: Record<string, string>
} {
  if (tree.type === 'leaf') {
    return { layoutTrees: {}, tabGroupMap: {} }
  }
  const gId = 'test-group'
  const tabGroupMap: Record<string, string> = {}
  for (const id of allLeafIds(tree)) {
    tabGroupMap[id] = gId
  }
  return { layoutTrees: { [gId]: tree }, tabGroupMap }
}

/** Helper: get the layout tree for the active tab */
function getActiveTree(state: AppState): LayoutNode | null {
  if (!state.activeTabId) return null
  return getTreeForTab(state.layoutTrees, state.tabGroupMap, state.activeTabId)
}

/** Helper: get the first (and possibly only) layout tree */
function getFirstTree(state: AppState): LayoutNode | null {
  const trees = Object.values(state.layoutTrees)
  return trees[0] ?? null
}

registerAllModes()

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new Error(message)
  }

  return value
}

function createTab(id: string): TabSession {
  return {
    id,
    assistant: 'terminal',
    title: 'Terminal',
    status: 'running',
    buffer: '',
    terminalModes: createDefaultTerminalModes(),
    command: 'zsh',
  }
}

function stateWithSplit(): AppState {
  const tab1 = createTab('tab-1')
  const tab2 = createTab('tab-2')
  const splitTree: LayoutNode = {
    type: 'split',
    direction: 'vertical',
    ratio: 0.5,
    first: createLeaf('tab-1'),
    second: createLeaf('tab-2'),
  }
  return {
    ...createInitialState(),
    tabs: [tab1, tab2],
    activeTabId: 'tab-1',
    ...makeLayoutGroup(splitTree),
    focusMode: 'layout',
  }
}

function key(name: string, opts?: { shift?: boolean; ctrl?: boolean; sequence?: string }) {
  return {
    name,
    shift: opts?.shift ?? false,
    ctrl: opts?.ctrl ?? false,
    meta: false,
    sequence: opts?.sequence ?? name,
  }
}

describe('layout mode handler', () => {
  test('Escape exits to terminal-input', () => {
    const state = stateWithSplit()
    const result = requireValue(
      layoutMode.handleKey(key('escape'), { state }),
      'Expected escape result'
    )

    expect(result.actions).toContainEqual({ type: 'set-focus-mode', focusMode: 'terminal-input' })
    expect(result.transition).toBe('terminal-input')
  })

  test('h navigates left and exits to terminal-input', () => {
    const state = stateWithSplit()
    const result = requireValue(layoutMode.handleKey(key('h'), { state }), 'Expected h result')

    expect(result.actions).toContainEqual({ type: 'focus-pane-direction', direction: 'left' })
    expect(result.actions).toContainEqual({ type: 'set-focus-mode', focusMode: 'terminal-input' })
    expect(result.transition).toBe('terminal-input')
  })

  test('l navigates right and exits to terminal-input', () => {
    const state = stateWithSplit()
    const result = requireValue(layoutMode.handleKey(key('l'), { state }), 'Expected l result')

    expect(result.actions).toContainEqual({ type: 'focus-pane-direction', direction: 'right' })
    expect(result.transition).toBe('terminal-input')
  })

  test('Shift+H resizes and stays in layout mode', () => {
    const state = stateWithSplit()
    const result = requireValue(
      layoutMode.handleKey(key('h', { shift: true }), { state }),
      'Expected Shift+H result'
    )

    expect(result.actions).toContainEqual({
      type: 'resize-pane',
      tabId: 'tab-1',
      delta: -1,
      axis: 'vertical',
    })
    expect(result.transition).toBeUndefined()
  })

  test('Shift+L resizes and stays in layout mode', () => {
    const state = stateWithSplit()
    const result = requireValue(
      layoutMode.handleKey(key('l', { shift: true }), { state }),
      'Expected Shift+L result'
    )

    expect(result.actions).toContainEqual({
      type: 'resize-pane',
      tabId: 'tab-1',
      delta: 1,
      axis: 'vertical',
    })
    expect(result.transition).toBeUndefined()
  })

  test('Shift+J resizes vertical and stays in layout mode', () => {
    const state = stateWithSplit()
    const result = requireValue(
      layoutMode.handleKey(key('j', { shift: true }), { state }),
      'Expected Shift+J result'
    )

    expect(result.actions).toContainEqual({
      type: 'resize-pane',
      tabId: 'tab-1',
      delta: 1,
      axis: 'horizontal',
    })
    expect(result.transition).toBeUndefined()
  })

  test('Shift+K resizes vertical and stays in layout mode', () => {
    const state = stateWithSplit()
    const result = requireValue(
      layoutMode.handleKey(key('k', { shift: true }), { state }),
      'Expected Shift+K result'
    )

    expect(result.actions).toContainEqual({
      type: 'resize-pane',
      tabId: 'tab-1',
      delta: -1,
      axis: 'horizontal',
    })
    expect(result.transition).toBeUndefined()
  })

  test('| opens split picker for vertical split', () => {
    const state = stateWithSplit()
    const result = requireValue(
      layoutMode.handleKey(key('|', { shift: true, sequence: '|' }), { state }),
      'Expected vertical split result'
    )

    expect(result.actions).toContainEqual({ type: 'open-split-picker', direction: 'vertical' })
    expect(result.transition).toBe('modal.split-picker')
  })

  test('- opens split picker for horizontal split', () => {
    const state = stateWithSplit()
    const result = requireValue(
      layoutMode.handleKey(key('-', { sequence: '-' }), { state }),
      'Expected horizontal split result'
    )

    expect(result.actions).toContainEqual({
      type: 'open-split-picker',
      direction: 'horizontal',
    })
    expect(result.transition).toBe('modal.split-picker')
  })

  test('q closes pane and exits', () => {
    const state = stateWithSplit()
    const result = requireValue(
      layoutMode.handleKey(key('q'), { state }),
      'Expected close-pane result'
    )

    expect(result.actions).toContainEqual({ type: 'close-pane', tabId: 'tab-1' })
    expect(result.effects).toContainEqual({ type: 'close-tab', tabId: 'tab-1' })
    expect(result.transition).toBe('terminal-input')
  })
})

describe('layout mode reducer integration', () => {
  test('split-pane action adds tab and splits layout tree', () => {
    const tab1 = createTab('tab-1')
    const state: AppState = {
      ...createInitialState(),
      tabs: [tab1],
      activeTabId: 'tab-1',
      focusMode: 'layout',
    }

    const newTab = createTab('tab-2')
    const next = appReducer(state, {
      type: 'split-pane',
      direction: 'vertical',
      newTab,
    })

    expect(next.tabs).toHaveLength(2)
    expect(next.activeTabId).toBe('tab-2')
    expect(getFirstTree(next)).toEqual({
      type: 'split',
      direction: 'vertical',
      ratio: 0.5,
      first: { type: 'leaf', tabId: 'tab-1' },
      second: { type: 'leaf', tabId: 'tab-2' },
    })
  })

  test('close-pane removes tab from tree and collapses split', () => {
    const state = stateWithSplit()
    const next = appReducer(state, { type: 'close-pane', tabId: 'tab-1' })

    expect(next.tabs).toHaveLength(1)
    expect(next.tabs[0]?.id).toBe('tab-2')
    expect(next.activeTabId).toBe('tab-2')
    // Group collapsed to single leaf → group removed
    expect(Object.keys(next.layoutTrees)).toHaveLength(0)
  })

  test('focus-pane-direction changes activeTabId', () => {
    const state = stateWithSplit()
    const next = appReducer(state, { type: 'focus-pane-direction', direction: 'right' })

    expect(next.activeTabId).toBe('tab-2')
  })

  test('resize-pane changes ratio with axis', () => {
    const state = stateWithSplit()
    const next = appReducer(state, {
      type: 'resize-pane',
      tabId: 'tab-1',
      delta: 1,
      axis: 'vertical',
    })

    const tree = getActiveTree(next)
    expect(tree).not.toBeNull()
    if (tree?.type === 'split') {
      expect(tree.ratio).toBeCloseTo(0.55)
    }
  })

  test('resize-pane with wrong axis does not change tree', () => {
    // vertical split, trying to resize on horizontal axis → no change
    const state = stateWithSplit()
    const next = appReducer(state, {
      type: 'resize-pane',
      tabId: 'tab-1',
      delta: 1,
      axis: 'horizontal',
    })

    expect(next).toBe(state)
  })

  test('add-tab does not create layout group', () => {
    const state = createInitialState()
    const tab = createTab('tab-new')
    const next = appReducer(state, { type: 'add-tab', tab })

    // Standalone tabs have no layout group
    expect(Object.keys(next.layoutTrees)).toHaveLength(0)
  })

  test('add-tab preserves existing layout groups', () => {
    const state: AppState = {
      ...createInitialState(),
      tabs: [createTab('tab-1')],
      activeTabId: 'tab-1',
    }

    const tab = createTab('tab-extra')
    const next = appReducer(state, { type: 'add-tab', tab })

    // No layout groups should exist
    expect(Object.keys(next.layoutTrees)).toHaveLength(0)
    expect(next.tabs).toHaveLength(2)
  })

  test('split-pane creates new group for orphaned activeTab', () => {
    const tab1 = createTab('tab-1')
    const tab2 = createTab('tab-2')
    const state: AppState = {
      ...createInitialState(),
      tabs: [tab1, tab2],
      activeTabId: 'tab-2',
      focusMode: 'layout',
    }

    const newTab = createTab('tab-3')
    const next = appReducer(state, {
      type: 'split-pane',
      direction: 'vertical',
      newTab,
    })

    expect(next.tabs).toHaveLength(3)
    expect(next.activeTabId).toBe('tab-3')
    expect(getActiveTree(next)).toEqual({
      type: 'split',
      direction: 'vertical',
      ratio: 0.5,
      first: { type: 'leaf', tabId: 'tab-2' },
      second: { type: 'leaf', tabId: 'tab-3' },
    })
  })

  test('split-pane creates tree from scratch when no groups exist', () => {
    const tab1 = createTab('tab-1')
    const state: AppState = {
      ...createInitialState(),
      tabs: [tab1],
      activeTabId: 'tab-1',
      focusMode: 'layout',
    }

    const newTab = createTab('tab-2')
    const next = appReducer(state, {
      type: 'split-pane',
      direction: 'horizontal',
      newTab,
    })

    expect(next.tabs).toHaveLength(2)
    expect(next.activeTabId).toBe('tab-2')
    expect(getActiveTree(next)).toEqual({
      type: 'split',
      direction: 'horizontal',
      ratio: 0.5,
      first: { type: 'leaf', tabId: 'tab-1' },
      second: { type: 'leaf', tabId: 'tab-2' },
    })
  })

  test('split works after adding a second tab via add-tab', () => {
    let state = createInitialState()
    const tab1 = createTab('tab-1')
    state = appReducer(state, { type: 'add-tab', tab: tab1 })

    const tab2 = createTab('tab-2')
    state = appReducer(state, { type: 'add-tab', tab: tab2 })

    expect(state.activeTabId).toBe('tab-2')
    // No layout groups for standalone tabs
    expect(Object.keys(state.layoutTrees)).toHaveLength(0)

    const tab3 = createTab('tab-3')
    state = appReducer(state, { type: 'split-pane', direction: 'vertical', newTab: tab3 })

    expect(state.tabs).toHaveLength(3)
    expect(state.activeTabId).toBe('tab-3')
    expect(getActiveTree(state)).toEqual({
      type: 'split',
      direction: 'vertical',
      ratio: 0.5,
      first: { type: 'leaf', tabId: 'tab-2' },
      second: { type: 'leaf', tabId: 'tab-3' },
    })
  })
})

describe('hydrate-workspace layout restoration', () => {
  test('hydrate-workspace restores layout tree with ratios (legacy format)', () => {
    const tab1 = createTab('tab-1')
    const tab2 = createTab('tab-2')
    const savedTree = {
      type: 'split' as const,
      direction: 'vertical' as const,
      ratio: 0.35,
      first: { type: 'leaf' as const, tabId: 'tab-1' },
      second: { type: 'leaf' as const, tabId: 'tab-2' },
    }

    let state = createInitialState()
    state = appReducer(state, {
      type: 'hydrate-workspace',
      tabs: [tab1, tab2],
      activeTabId: 'tab-1',
      layoutTree: savedTree,
    })

    expect(getActiveTree(state)).toEqual(savedTree)
    expect(state.tabs).toHaveLength(2)
    expect(state.activeTabId).toBe('tab-1')
  })

  test('hydrate-workspace prunes missing tabs from layout tree', () => {
    const tab1 = createTab('tab-1')
    const savedTree = {
      type: 'split' as const,
      direction: 'vertical' as const,
      ratio: 0.5,
      first: { type: 'leaf' as const, tabId: 'tab-1' },
      second: { type: 'leaf' as const, tabId: 'tab-gone' },
    }

    let state = createInitialState()
    state = appReducer(state, {
      type: 'hydrate-workspace',
      tabs: [tab1],
      activeTabId: 'tab-1',
      layoutTree: savedTree,
    })

    // tab-gone pruned → split collapsed to leaf → group removed
    expect(Object.keys(state.layoutTrees)).toHaveLength(0)
  })

  test('hydrate-workspace falls back to empty when all tree tabs are gone', () => {
    const tab1 = createTab('tab-new')

    let state = createInitialState()
    state = appReducer(state, {
      type: 'hydrate-workspace',
      tabs: [tab1],
      activeTabId: 'tab-new',
      layoutTree: {
        type: 'split',
        direction: 'vertical',
        ratio: 0.5,
        first: { type: 'leaf', tabId: 'tab-gone-1' },
        second: { type: 'leaf', tabId: 'tab-gone-2' },
      },
    })

    // All tabs gone → no layout groups
    expect(Object.keys(state.layoutTrees)).toHaveLength(0)
  })
})

describe('full split flow simulation', () => {
  test('Ctrl+W enters layout mode, | opens split picker, confirm splits', () => {
    // Start: one tab in terminal-input mode
    const tab1 = createTab('tab-1')
    let state: AppState = {
      ...createInitialState(),
      tabs: [tab1],
      activeTabId: 'tab-1',
      focusMode: 'terminal-input',
    }

    // Step 1: Ctrl+W → enter layout mode
    state = appReducer(state, { type: 'set-focus-mode', focusMode: 'layout' })
    expect(state.focusMode).toBe('layout')
    expect(deriveModeId(state)).toBe('layout')

    // Step 2: Press | in layout mode → opens split picker
    const handler = requireValue(getHandler('layout'), 'Missing layout handler')
    const result = requireValue(
      handler.handleKey(key('|', { shift: true, sequence: '|' }), { state }),
      'Expected split-picker result'
    )
    expect(result.actions).toContainEqual({ type: 'open-split-picker', direction: 'vertical' })
    expect(result.transition).toBe('modal.split-picker')

    // Step 3: Apply actions from handler (opens modal)
    for (const action of result.actions) {
      state = appReducer(state, action)
    }
    expect(state.focusMode).toBe('modal')
    expect(state.modal.type).toBe('split-picker')

    // Step 4: User confirms selection → split-pane effect (simulated)
    state = appReducer(state, { type: 'close-modal' })
    const newTab = createTab('tab-2')
    state = appReducer(state, { type: 'split-pane', direction: 'vertical', newTab })

    // Verify final state
    expect(state.tabs).toHaveLength(2)
    expect(state.activeTabId).toBe('tab-2')
    expect(getActiveTree(state)).toEqual({
      type: 'split',
      direction: 'vertical',
      ratio: 0.5,
      first: { type: 'leaf', tabId: 'tab-1' },
      second: { type: 'leaf', tabId: 'tab-2' },
    })
  })

  test('Ctrl+W q closes pane, tree collapses correctly', () => {
    let state = stateWithSplit()

    // Step 1: Ctrl+W → layout mode
    state = appReducer(state, { type: 'set-focus-mode', focusMode: 'layout' })

    // Step 2: Press q
    const handler = requireValue(getHandler('layout'), 'Missing layout handler')
    const result = requireValue(
      handler.handleKey(key('q'), { state }),
      'Expected close-pane result'
    )
    expect(result.actions).toContainEqual({ type: 'close-pane', tabId: 'tab-1' })
    expect(result.effects).toContainEqual({ type: 'close-tab', tabId: 'tab-1' })

    // Step 3: Apply all actions
    for (const action of result.actions) {
      state = appReducer(state, action)
    }

    // Verify: tab-1 removed, tree collapsed → group removed
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0]?.id).toBe('tab-2')
    expect(state.activeTabId).toBe('tab-2')
    expect(Object.keys(state.layoutTrees)).toHaveLength(0)
  })

  test('repeated Shift+H resize stays in layout mode and changes ratio', () => {
    let state = stateWithSplit()
    state = appReducer(state, { type: 'set-focus-mode', focusMode: 'layout' })

    const handler = requireValue(getHandler('layout'), 'Missing layout handler')

    // First resize
    let result = requireValue(
      handler.handleKey(key('h', { shift: true }), { state }),
      'Expected first resize result'
    )
    expect(result.transition).toBeUndefined()
    for (const action of result.actions) {
      state = appReducer(state, action)
    }
    expect(state.focusMode).toBe('layout')

    // Second resize
    result = requireValue(
      handler.handleKey(key('h', { shift: true }), { state }),
      'Expected second resize result'
    )
    for (const action of result.actions) {
      state = appReducer(state, action)
    }
    expect(state.focusMode).toBe('layout')

    // Check ratio changed twice
    const tree = getActiveTree(state)
    if (tree?.type === 'split') {
      expect(tree.ratio).toBeCloseTo(0.4)
    }
  })

  test('h navigates to adjacent pane and exits layout', () => {
    let state = stateWithSplit()
    state = appReducer(state, { type: 'set-focus-mode', focusMode: 'layout' })
    expect(state.activeTabId).toBe('tab-1')

    const handler = requireValue(getHandler('layout'), 'Missing layout handler')
    const result = requireValue(
      handler.handleKey(key('l'), { state }),
      'Expected navigation result'
    )

    for (const action of result.actions) {
      state = appReducer(state, action)
    }

    expect(state.activeTabId).toBe('tab-2')
    expect(state.focusMode).toBe('terminal-input')
  })
})
