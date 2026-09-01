import { promises as fs } from 'fs'
import { join } from 'path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { Company, ImageKind, Offer, Product, Template } from '@shared/types'
import {
  company,
  deleteProductCascade,
  initialiseData,
  offers,
  offersUsingProduct,
  products,
  templates
} from './db'
import { getDataDir, getSettings, saveSettings } from './db/paths'
import { deleteImage, importImage, pickImage } from './files/images'
import { renderOfferPdf } from './pdf/render'
import { exportOfferPdf, openPath, revealPath } from './pdf/export'
import { checkForUpdates, getStatus, installUpdate } from './updater'

function windowFor(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerIpc(): void {
  // --- Products -----------------------------------------------------------
  ipcMain.handle('products:list', () => products.list())
  ipcMain.handle('products:get', (_e, id: string) => products.get(id))
  ipcMain.handle('products:create', (_e, input: Omit<Product, 'id'>) => products.create(input))
  ipcMain.handle('products:update', (_e, id: string, patch: Partial<Product>) =>
    products.update(id, patch)
  )
  ipcMain.handle('products:usage', (_e, id: string) => offersUsingProduct(id))
  ipcMain.handle('products:delete', async (_e, id: string) => {
    const product = await products.get(id)
    await deleteProductCascade(id)
    if (product?.image) await deleteImage('products', product.image)
  })

  // --- Offers -------------------------------------------------------------
  ipcMain.handle('offers:list', () => offers.list())
  ipcMain.handle('offers:get', (_e, id: string) => offers.get(id))
  ipcMain.handle('offers:create', (_e, input: Omit<Offer, 'id'>) => offers.create(input))
  ipcMain.handle('offers:update', (_e, id: string, patch: Partial<Offer>) =>
    offers.update(id, patch)
  )
  ipcMain.handle('offers:delete', (_e, id: string) => offers.remove(id))
  ipcMain.handle('offers:duplicate', async (_e, id: string) => {
    const source = await offers.get(id)
    if (!source) throw new Error('Nie znaleziono oferty.')
    const { id: _drop, createdAt: _c, updatedAt: _u, ...rest } = source
    return offers.create({ ...rest, title: `${source.title} (kopia)` })
  })

  // --- Templates ----------------------------------------------------------
  ipcMain.handle('templates:list', () => templates.list())
  ipcMain.handle('templates:get', (_e, id: string) => templates.get(id))
  ipcMain.handle('templates:create', (_e, input: Omit<Template, 'id'>) =>
    templates.create({ ...input, builtIn: false })
  )
  ipcMain.handle('templates:update', async (_e, id: string, patch: Partial<Template>) => {
    const existing = await templates.get(id)
    if (existing?.builtIn) throw new Error('Szablon wbudowany jest tylko do odczytu.')
    return templates.update(id, patch)
  })
  ipcMain.handle('templates:delete', async (_e, id: string) => {
    const existing = await templates.get(id)
    if (existing?.builtIn) throw new Error('Nie można usunąć szablonu wbudowanego.')
    await templates.remove(id)
  })
  ipcMain.handle('templates:duplicate', async (_e, id: string) => {
    const source = await templates.get(id)
    if (!source) throw new Error('Nie znaleziono szablonu.')
    const { id: _drop, ...rest } = source
    return templates.create({ ...rest, name: `${source.name} (kopia)`, builtIn: false })
  })

  // --- Company ------------------------------------------------------------
  ipcMain.handle('company:get', () => company.get())
  ipcMain.handle('company:save', (_e, value: Company) => company.save(value))

  // --- Images -------------------------------------------------------------
  ipcMain.handle('images:pick', (event, kind: ImageKind) => pickImage(kind, windowFor(event)))
  ipcMain.handle('images:import', (_e, kind: ImageKind, path: string) => importImage(kind, path))
  ipcMain.handle('images:delete', (_e, kind: ImageKind, file: string) => deleteImage(kind, file))

  // --- PDF ----------------------------------------------------------------
  ipcMain.handle('pdf:render', async (_e, offer: Offer, template: Template) => {
    const buffer = await renderOfferPdf(offer, template)
    // Uint8Array survives the structured clone that ipcRenderer.invoke performs.
    return new Uint8Array(buffer)
  })
  ipcMain.handle('pdf:export', (event, offer: Offer, template: Template) =>
    exportOfferPdf(offer, template, windowFor(event))
  )
  ipcMain.handle('pdf:open', (_e, path: string) => openPath(path))
  ipcMain.handle('pdf:reveal', (_e, path: string) => revealPath(path))

  // --- Settings -----------------------------------------------------------
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:openDataDir', () => shell.openPath(getDataDir()))
  ipcMain.handle('settings:chooseDataDir', async (event) => {
    const parent = windowFor(event)
    const options: Electron.OpenDialogOptions = {
      title: 'Wybierz folder danych',
      properties: ['openDirectory', 'createDirectory']
    }
    const picked = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    if (picked.canceled || picked.filePaths.length === 0) return { changed: false as const }

    const target = picked.filePaths[0]
    const current = getDataDir()
    if (target === current) return { changed: false as const }

    const answer = await dialog.showMessageBox(parent!, {
      type: 'question',
      buttons: ['Skopiuj dane', 'Użyj pustego folderu', 'Anuluj'],
      defaultId: 0,
      cancelId: 2,
      message: 'Zmiana folderu danych',
      detail: `Nowy folder:\n${target}\n\nCzy skopiować obecne dane do nowej lokalizacji?`
    })
    if (answer.response === 2) return { changed: false as const }
    if (answer.response === 0) await copyDataDir(current, target)

    saveSettings({ dataDir: target })
    await initialiseData()
    return { changed: true as const, dataDir: target }
  })

  // --- Updates ------------------------------------------------------------
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('updates:status', () => getStatus())
  ipcMain.handle('updates:check', () => checkForUpdates())
  ipcMain.handle('updates:install', () => installUpdate())
}

/** Copies the JSON files and image folders across to a new data directory. */
async function copyDataDir(from: string, to: string): Promise<void> {
  await fs.mkdir(to, { recursive: true })
  const entries = await fs.readdir(from, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.name === 'backups' || entry.name.startsWith('.')) continue
    const source = join(from, entry.name)
    const target = join(to, entry.name)
    await fs.cp(source, target, { recursive: true, force: true }).catch(() => undefined)
  }
}
