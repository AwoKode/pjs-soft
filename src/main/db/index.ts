import type { Company, Offer, Product, Template } from '@shared/types'
import { builtInTemplates, emptyCompany, normalizeTemplate } from '@shared/defaults'
import { createCollection } from './collection'
import { createStore } from './store'
import { ensureDataDirs } from './paths'

export const products = createCollection<Product>('products.json')
export const offers = createCollection<Offer>('offers.json')
export const templates = createCollection<Template>('templates.json', false)

const companyStore = createStore<Company>('company.json', emptyCompany)
export const company = {
  get: companyStore.read,
  save: companyStore.write
}

/**
 * Prepares the data folder on startup and makes sure the built-in presets are
 * present — including after the user points the app at a fresh data folder.
 */
export async function initialiseData(): Promise<void> {
  ensureDataDirs()
  const stored = await templates.list()
  const presets = builtInTemplates()
  const presetIds = new Set(presets.map((preset) => preset.id))

  // Built-ins are read-only, so they are simply replaced with the current
  // definitions; anything the user made is brought up to the latest shape.
  const userTemplates = stored
    .filter((tpl) => !presetIds.has(tpl.id))
    .map((tpl) => ({ ...normalizeTemplate(tpl), id: tpl.id, builtIn: false }))

  await templates.replaceAll([...presets, ...userTemplates])
}

/** Offers that reference a given product — used to warn before deleting it. */
export async function offersUsingProduct(productId: string): Promise<Offer[]> {
  const all = await offers.list()
  return all.filter((offer) => offer.items.some((item) => item.productId === productId))
}

/** Removes a product and strips it from every offer that referenced it. */
export async function deleteProductCascade(productId: string): Promise<void> {
  const affected = await offersUsingProduct(productId)
  if (affected.length > 0) {
    const all = await offers.list()
    const affectedIds = new Set(affected.map((offer) => offer.id))
    await offers.replaceAll(
      all.map((offer) =>
        affectedIds.has(offer.id)
          ? { ...offer, items: offer.items.filter((item) => item.productId !== productId) }
          : offer
      )
    )
  }
  await products.remove(productId)
}
