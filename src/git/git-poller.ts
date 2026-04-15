import { useEffect } from 'react'

import { appStore } from '../state/app-store'
import { collectGitStatus } from './git-status'

const REFRESH_INTERVAL_MS = 1000

interface Options {
  enabled: boolean
  projectPath: string | undefined
}

export function useGitPanelPolling({ enabled, projectPath }: Options): void {
  useEffect(() => {
    if (!enabled || !projectPath) return undefined

    let cancelled = false

    const refresh = async () => {
      const result = await collectGitStatus(projectPath)
      if (cancelled) return
      if (result.kind === 'ok') {
        appStore.getState().dispatch({ payload: result.payload, type: 'git-refresh-success' })
      } else {
        appStore.getState().dispatch({ kind: result.error, type: 'git-refresh-error' })
      }
    }

    void refresh()
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [enabled, projectPath])
}
