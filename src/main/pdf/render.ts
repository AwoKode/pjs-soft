import { promises as fs } from 'fs'
import { join } from 'path'
import { BrowserWindow } from 'electron'
import type { Offer, Template } from '@shared/types'
import { renderOfferHtml, pageSizeMm } from '@shared/render/document'
import { company, products } from '../db'
import { getDataDir } from '../db/paths'

const MM_PER_INCH = 25.4
/** Room reserved in the bottom margin when page numbers are switched on. */
const FOOTER_MIN_MM = 12

/**
 * Renders an offer to PDF bytes.
 *
 * The offer and template are passed in as values rather than ids so the live
 * preview can show unsaved edits; products and company details come from disk.
 *
 * The HTML is written inside the data folder so that relative image paths
 * (`products/x.jpg`) resolve under file:// — which avoids both base64 inlining
 * and having to disable webSecurity.
 */
export async function renderOfferPdf(offer: Offer, template: Template): Promise<Buffer> {
  const [allProducts, companyData] = await Promise.all([products.list(), company.get()])

  const html = renderOfferHtml({
    offer,
    products: allProducts,
    template,
    company: companyData,
    imageUrl: (kind, file) => `${kind}/${encodeURIComponent(file)}`
  })

  const dataDir = getDataDir()
  await fs.mkdir(dataDir, { recursive: true })
  const tmpPath = join(dataDir, `.preview-${process.pid}-${Date.now()}.html`)
  await fs.writeFile(tmpPath, html, 'utf8')

  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, javascript: true, sandbox: false }
  })

  try {
    await win.loadFile(tmpPath)
    await waitForAssets(win)
    return await win.webContents.printToPDF(printOptions(template))
  } finally {
    if (!win.isDestroyed()) win.destroy()
    await fs.unlink(tmpPath).catch(() => undefined)
  }
}

/**
 * Chromium reports did-finish-load before webfonts and images have decoded;
 * printing early is the usual cause of blank photos in the output.
 */
async function waitForAssets(win: BrowserWindow): Promise<void> {
  await win.webContents.executeJavaScript(`
    (async () => {
      if (document.fonts && document.fonts.ready) { await document.fonts.ready }
      const images = Array.from(document.images)
      await Promise.all(images.map(img =>
        img.complete ? Promise.resolve() : new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
        })
      ))
      return true
    })()
  `)
}

function printOptions(template: Template): Electron.PrintToPDFOptions {
  const margin = template.page.margin
  const showNumbers = template.footer.showPageNumbers
  const bottomMm = Math.max(margin.bottom, showNumbers ? FOOTER_MIN_MM : 0)

  return {
    pageSize: 'A4',
    landscape: template.page.orientation === 'landscape',
    printBackground: true,
    preferCSSPageSize: false,
    margins: {
      top: margin.top / MM_PER_INCH,
      bottom: bottomMm / MM_PER_INCH,
      left: margin.left / MM_PER_INCH,
      right: margin.right / MM_PER_INCH
    },
    displayHeaderFooter: showNumbers,
    headerTemplate: '<span></span>',
    footerTemplate: showNumbers
      ? `<div style="width:100%;font-size:8px;color:#777;text-align:center;
           font-family:'Segoe UI',Arial,sans-serif;">
           <span class="pageNumber"></span> / <span class="totalPages"></span>
         </div>`
      : '<span></span>'
  }
}

/** Exposed for tests and diagnostics. */
export { pageSizeMm }
