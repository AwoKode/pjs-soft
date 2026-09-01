import { app, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '@shared/types'

// electron-updater ships as CommonJS, so the named export has to come off the
// default import rather than being destructured at the import statement.
const { autoUpdater } = electronUpdater

/** The window that receives status pushes; null until initUpdater runs. */
let target: BrowserWindow | null = null
/** Last known status, so a renderer that mounts late can ask for it. */
let current: UpdateStatus = { state: 'idle' }

/**
 * The updater only works inside a packaged app — outside one, electron-updater
 * looks for a dev-app-update.yml that does not exist and throws. `npm run dev`
 * must not fail because of it, so every entry point checks this first.
 */
function enabled(): boolean {
  return app.isPackaged
}

function push(status: UpdateStatus): void {
  current = status
  if (target && !target.isDestroyed()) {
    target.webContents.send('updates:status', status)
  }
}

export function getStatus(): UpdateStatus {
  return current
}

/**
 * Wires the updater to a window and runs the first check shortly after start-up.
 * The delay keeps a slow or absent network off the critical path to a visible
 * window — the app is meant to work fully offline.
 */
export function initUpdater(window: BrowserWindow): void {
  target = window
  if (!enabled()) return

  autoUpdater.autoDownload = true
  // The install is never silent: the user presses the button in the app.
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => push({ state: 'checking' }))
  autoUpdater.on('update-not-available', () => push({ state: 'none' }))
  autoUpdater.on('update-available', (info) => push({ state: 'available', version: info.version }))
  autoUpdater.on('download-progress', (progress) =>
    push({ state: 'downloading', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => push({ state: 'ready', version: info.version }))
  // Being offline is a normal state for this app, not a crash — it is reported
  // to the renderer as a status and never rethrown.
  autoUpdater.on('error', (error) => push({ state: 'error', message: error.message }))

  setTimeout(() => void checkForUpdates(), 5000)
}

export async function checkForUpdates(): Promise<void> {
  if (!enabled()) return
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    push({ state: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}

export function installUpdate(): void {
  if (!enabled()) return
  // isSilent: false so the NSIS installer shows its progress; the app restarts itself.
  autoUpdater.quitAndInstall(false, true)
}
