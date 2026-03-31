import { $ } from 'bun'
import { stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import type { DirectoryResult } from '../state/types'

import { logDebug } from '../debug/input-log'

export async function searchProjectDirectories(query: string): Promise<DirectoryResult[]> {
  if (!query.trim()) {
    return []
  }

  const home = homedir()

  try {
    const result =
      await $`find ${home} -maxdepth 4 -name .git -not -path '*/node_modules/*' -not -path '*/target/*' -not -path '*/dist/*' | sed 's|/\.git$||' | fzf --filter=${query} --no-sort | head -10`.quiet()
    const paths = result
      .text()
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)

    return Promise.all(
      paths.map(async (path) => {
        const gitPath = join(path, '.git')
        const st = await stat(gitPath).catch(() => null)
        return { path, isWorktree: st !== null && st.isFile() }
      })
    )
  } catch (error) {
    logDebug('platform.projectSearch.error', {
      query,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}
