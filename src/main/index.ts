import { join } from 'path'
import { pathToFileURL } from 'url'
import { app, BrowserWindow, net, protocol, shell } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import type { ImageKind } from '@shared/types'
import { initialiseData } from './db'
import { getImageDir } from './db/paths'
import { registerIpc } from './ipc'
import { initUpdater } from './updater'

// Must run before the app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-image',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

/**
 * Serves product photos and the logo to the renderer without having to weaken
 * webSecurity or hand the renderer a filesystem path.
 */
function registerImageProtocol(): void {
  protocol.handle('app-image', async (request) => {
    const url = new URL(request.url)
    const kind: ImageKind = url.hostname === 'logo' ? 'logo' : 'products'
    const file = decodeURIComponent(url.pathname.replace(/^\//, ''))
    // Only ever serve a plain file name from inside the image folder.
    if (!file || file.includes('..') || file.includes('/') || file.includes('\\')) {
      return new Response(null, { status: 400 })
    }
    return net.fetch(pathToFileURL(join(getImageDir(kind), file)).toString())
  })
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f4f5f7',
    title: 'PJS Soft',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Enables Chromium's built-in PDF viewer, which renders the live preview.
      plugins: true
    }
  })

  window.on('ready-to-show', () => window.show())

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('pl.pjssoft.offers')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  registerImageProtocol()
  registerIpc()
  await initialiseData()
  initUpdater(createWindow())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
