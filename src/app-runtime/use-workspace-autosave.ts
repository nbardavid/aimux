import { useEffect, useRef } from 'react'

import type { AppState } from '../state/types'

import { saveCurrentWorkspace } from '../state/workspace-save'

export function useWorkspaceAutosave(state: AppState, debounceMs: number): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      saveCurrentWorkspace(state)
      timeoutRef.current = null
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
        saveCurrentWorkspace(state)
      }
    }
  }, [debounceMs, state])
}
