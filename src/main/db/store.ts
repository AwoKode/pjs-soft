import { promises as fs } from 'fs'
import { join } from 'path'
import { getDataDir } from './paths'

const FILE_VERSION = 1
const MAX_BACKUPS = 10

type Envelope<T> = { version: number; data: T }

/**
 * A tiny persistence helper shared by every collection.
 *
 * Reads tolerate a missing or corrupt file (the bad file is moved aside rather
 * than thrown away), and writes are atomic: the payload lands in a temp file
 * that is renamed over the target, so an interrupted write can never leave a
 * half-written database behind.
 */
export function createStore<T>(fileName: string, makeDefault: () => T) {
  const filePath = (): string => join(getDataDir(), fileName)

  async function read(): Promise<T> {
    const path = filePath()
    let raw: string
    try {
      raw = await fs.readFile(path, 'utf8')
    } catch {
      return makeDefault()
    }
    try {
      const parsed = JSON.parse(raw) as Envelope<T>
      if (parsed && typeof parsed === 'object' && 'data' in parsed) return parsed.data
      throw new Error('unexpected shape')
    } catch {
      // Keep the unreadable file for forensics instead of silently discarding it.
      await fs.rename(path, `${path}.corrupt-${Date.now()}`).catch(() => undefined)
      return makeDefault()
    }
  }

  async function write(value: T): Promise<void> {
    const dir = getDataDir()
    await fs.mkdir(dir, { recursive: true })
    const path = filePath()
    await backup(dir, fileName, path)

    const tmp = `${path}.tmp`
    const payload: Envelope<T> = { version: FILE_VERSION, data: value }
    await fs.writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8')
    await fs.rename(tmp, path)
  }

  return { read, write, filePath }
}

async function backup(dir: string, fileName: string, path: string): Promise<void> {
  try {
    await fs.access(path)
  } catch {
    return // nothing to back up yet
  }
  const backupsDir = join(dir, 'backups')
  await fs.mkdir(backupsDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const base = fileName.replace(/\.json$/, '')
  await fs.copyFile(path, join(backupsDir, `${base}-${stamp}.json`)).catch(() => undefined)
  await pruneBackups(backupsDir, base)
}

async function pruneBackups(backupsDir: string, base: string): Promise<void> {
  try {
    const entries = (await fs.readdir(backupsDir))
      .filter((name) => name.startsWith(`${base}-`) && name.endsWith('.json'))
      .sort()
    const stale = entries.slice(0, Math.max(0, entries.length - MAX_BACKUPS))
    await Promise.all(stale.map((name) => fs.unlink(join(backupsDir, name)).catch(() => undefined)))
  } catch {
    // Pruning is best-effort; never let it break a save.
  }
}
