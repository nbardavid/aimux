import { getDaemonSocketPath } from './daemon/runtime-paths'
import { findDaemonPid } from './platform/daemon-control'
import { runRestartDaemon } from './restart-daemon'

export async function runUpdate(): Promise<number> {
  process.stdout.write('Updating aimux...\n')

  const proc = Bun.spawn(['bun', 'install', '-g', 'github:BrimVeyn/aimux'], {
    stdout: 'inherit',
    stderr: 'inherit',
  })

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    process.stderr.write('Update failed.\n')
    return 1
  }

  process.stdout.write('Updated successfully.\n')

  const pid = await findDaemonPid(getDaemonSocketPath())
  if (pid !== null) {
    process.stdout.write('Restarting daemon...\n')
    await runRestartDaemon()
  }

  return 0
}
