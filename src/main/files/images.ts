import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import { join, extname } from 'path'
import { BrowserWindow, dialog, nativeImage } from 'electron'
import type { ImageKind } from '@shared/types'
import { getImageDir } from '../db/paths'

const MAX_EDGE = 1200
const JPEG_QUALITY = 85

/**
 * Copies a picked image into the data folder, downscaling it first. Keeping the
 * long edge at 1200px is what stops exported offers from ballooning: the
 * reference document holds ~40 photos in about 1 MB.
 */
export async function importImage(kind: ImageKind, sourcePath: string): Promise<string> {
  const dir = getImageDir(kind)
  await fs.mkdir(dir, { recursive: true })

  const image = nativeImage.createFromPath(sourcePath)
  if (image.isEmpty()) throw new Error('Nie udało się odczytać pliku obrazu.')

  const { width, height } = image.getSize()
  const longEdge = Math.max(width, height)
  const resized =
    longEdge > MAX_EDGE
      ? image.resize(
          width >= height
            ? { width: MAX_EDGE, quality: 'good' }
            : { height: MAX_EDGE, quality: 'good' }
        )
      : image

  // Logos are kept as PNG so transparency survives; photos become JPEG.
  const keepPng = kind === 'logo' && extname(sourcePath).toLowerCase() === '.png'
  const fileName = `${randomUUID()}${keepPng ? '.png' : '.jpg'}`
  const buffer = keepPng ? resized.toPNG() : resized.toJPEG(JPEG_QUALITY)
  await fs.writeFile(join(dir, fileName), buffer)
  return fileName
}

/** Opens the picker and imports the chosen file. Returns null if cancelled. */
export async function pickImage(
  kind: ImageKind,
  parent: BrowserWindow | null
): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: kind === 'logo' ? 'Wybierz logo' : 'Wybierz zdjęcie produktu',
    properties: ['openFile'],
    filters: [{ name: 'Obrazy', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
  }
  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return null
  return importImage(kind, result.filePaths[0])
}

export async function deleteImage(kind: ImageKind, fileName: string): Promise<void> {
  if (!fileName) return
  await fs.unlink(join(getImageDir(kind), fileName)).catch(() => undefined)
}
