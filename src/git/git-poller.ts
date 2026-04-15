import { useEffect } from 'react'

import { appStore } from '../state/app-store'
import { collectGitStatus } from './git-status'

const BASE_INTERVAL_MS = 1000
const MAX_INTERVAL_MS = 30_000

interface Options {
  enabled: boolean
  projectPath: string | undefined
}

export function useGitPanelPolling({ enabled, projectPath }: Options): void {
  useEffect(() => {
    if (!enabled || !projectPath) return undefined

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let delay = BASE_INTERVAL_MS

    const schedule = () => {
      if (cancelled) return
      timer = setTimeout(() => void tick(), delay)
    }

    const tick = async () => {
      const result = await collectGitStatus(projectPath)
      if (cancelled) return
      if (result.kind === 'ok') {
        appStore.getState().dispatch({ payload: result.payload, type: 'git-refresh-success' })
        delay = BASE_INTERVAL_MS
      } else {
        appStore.getState().dispatch({ kind: result.error, type: 'git-refresh-error' })
        delay = Math.min(delay * 2, MAX_INTERVAL_MS)
      }
      schedule()
    }

    void tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, projectPath])
}
