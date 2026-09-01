import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { ImageKind, Settings } from '@shared/types'

/**
 * settings.json deliberately lives in userData rather than in the data folder —
 * it is what tells the app where the data folder actually is.
 */
function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

/**
 * A subfolder of userData rather than userData itself: Electron fills that
 * directory with Chromium caches, and the data folder is meant to be something
 * the user can copy wholesale as a backup.
 */
function defaultDataDir(): string {
  return join(app.getPath('userData'), 'dane')
}

let cached: Settings | null = null

export function getSettings(): Settings {
  if (cached) return cached
  try {
    const parsed = JSON.parse(readFileSync(settingsPath(), 'utf8')) as Partial<Settings>
    cached = { dataDir: parsed.dataDir || defaultDataDir() }
  } catch {
    cached = { dataDir: defaultDataDir() }
  }
  return cached
}

export function saveSettings(next: Settings): void {
  cached = next
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8')
}

export function getDataDir(): string {
  return getSettings().dataDir
}

export function getImageDir(kind: ImageKind): string {
  return join(getDataDir(), kind)
}

/** Creates the data folder and its subdirectories if they are not there yet. */
export function ensureDataDirs(): void {
  for (const dir of [getDataDir(), getImageDir('products'), getImageDir('logo')]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}
