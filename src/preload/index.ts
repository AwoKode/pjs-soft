import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  Company,
  ImageKind,
  Offer,
  Product,
  Settings,
  Template,
  UpdateStatus
} from '@shared/types'

export type ExportResult = { canceled: true } | { canceled: false; path: string }
export type DataDirResult = { changed: false } | { changed: true; dataDir: string }

const api = {
  products: {
    list: (): Promise<Product[]> => ipcRenderer.invoke('products:list'),
    get: (id: string): Promise<Product | null> => ipcRenderer.invoke('products:get', id),
    create: (input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> =>
      ipcRenderer.invoke('products:create', input),
    update: (id: string, patch: Partial<Product>): Promise<Product> =>
      ipcRenderer.invoke('products:update', id, patch),
    usage: (id: string): Promise<Offer[]> => ipcRenderer.invoke('products:usage', id),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('products:delete', id)
  },
  offers: {
    list: (): Promise<Offer[]> => ipcRenderer.invoke('offers:list'),
    get: (id: string): Promise<Offer | null> => ipcRenderer.invoke('offers:get', id),
    create: (input: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Offer> =>
      ipcRenderer.invoke('offers:create', input),
    update: (id: string, patch: Partial<Offer>): Promise<Offer> =>
      ipcRenderer.invoke('offers:update', id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('offers:delete', id),
    duplicate: (id: string): Promise<Offer> => ipcRenderer.invoke('offers:duplicate', id)
  },
  templates: {
    list: (): Promise<Template[]> => ipcRenderer.invoke('templates:list'),
    get: (id: string): Promise<Template | null> => ipcRenderer.invoke('templates:get', id),
    create: (input: Omit<Template, 'id'>): Promise<Template> =>
      ipcRenderer.invoke('templates:create', input),
    update: (id: string, patch: Partial<Template>): Promise<Template> =>
      ipcRenderer.invoke('templates:update', id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('templates:delete', id),
    duplicate: (id: string): Promise<Template> => ipcRenderer.invoke('templates:duplicate', id)
  },
  company: {
    get: (): Promise<Company> => ipcRenderer.invoke('company:get'),
    save: (value: Company): Promise<void> => ipcRenderer.invoke('company:save', value)
  },
  images: {
    pick: (kind: ImageKind): Promise<string | null> => ipcRenderer.invoke('images:pick', kind),
    /** Imports an already-known path — used by drag & drop. */
    import: (kind: ImageKind, path: string): Promise<string> =>
      ipcRenderer.invoke('images:import', kind, path),
    delete: (kind: ImageKind, file: string): Promise<void> =>
      ipcRenderer.invoke('images:delete', kind, file),
    /** Electron 32+ no longer exposes File.path, so dropped files resolve here. */
    pathForFile: (file: File): string => webUtils.getPathForFile(file),
    url: (kind: ImageKind, file: string): string =>
      `app-image://${kind}/${encodeURIComponent(file)}`
  },
  pdf: {
    render: (offer: Offer, template: Template): Promise<Uint8Array> =>
      ipcRenderer.invoke('pdf:render', offer, template),
    export: (offer: Offer, template: Template): Promise<ExportResult> =>
      ipcRenderer.invoke('pdf:export', offer, template),
    open: (path: string): Promise<void> => ipcRenderer.invoke('pdf:open', path),
    reveal: (path: string): Promise<void> => ipcRenderer.invoke('pdf:reveal', path)
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    openDataDir: (): Promise<void> => ipcRenderer.invoke('settings:openDataDir'),
    chooseDataDir: (): Promise<DataDirResult> => ipcRenderer.invoke('settings:chooseDataDir')
  },
  updates: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    status: (): Promise<UpdateStatus> => ipcRenderer.invoke('updates:status'),
    check: (): Promise<void> => ipcRenderer.invoke('updates:check'),
    install: (): Promise<void> => ipcRenderer.invoke('updates:install'),
    /**
     * The only push channel from the main process. Returns an unsubscribe
     * function so a React effect can clean up; the raw IpcRendererEvent is
     * deliberately kept on this side of the bridge.
     */
    onStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
      const handler = (_event: unknown, status: UpdateStatus): void => callback(status)
      ipcRenderer.on('updates:status', handler)
      return () => ipcRenderer.off('updates:status', handler)
    }
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
