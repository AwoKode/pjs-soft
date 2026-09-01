import { promises as fs } from 'fs'
import { BrowserWindow, dialog, shell } from 'electron'
import type { Offer, Template } from '@shared/types'
import { formatDate } from '@shared/format'
import { renderOfferPdf } from './render'

export type ExportResult = { canceled: true } | { canceled: false; path: string }

/** Strips the characters Windows will not accept in a file name. */
function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'Oferta'
}

export function suggestedFileName(offer: Offer): string {
  const parts = [offer.title || 'Oferta', offer.number, formatDate(offer.date)].filter(Boolean)
  return `${safeFileName(parts.join(' '))}.pdf`
}

export async function exportOfferPdf(
  offer: Offer,
  template: Template,
  parent: BrowserWindow | null
): Promise<ExportResult> {
  const options: Electron.SaveDialogOptions = {
    title: 'Zapisz ofertę jako PDF',
    defaultPath: suggestedFileName(offer),
    filters: [{ name: 'Dokument PDF', extensions: ['pdf'] }]
  }
  const result = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return { canceled: true }

  const pdf = await renderOfferPdf(offer, template)
  await fs.writeFile(result.filePath, pdf)
  return { canceled: false, path: result.filePath }
}

export async function openPath(path: string): Promise<void> {
  await shell.openPath(path)
}

export async function revealPath(path: string): Promise<void> {
  shell.showItemInFolder(path)
}
