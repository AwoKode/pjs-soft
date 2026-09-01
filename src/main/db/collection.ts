import { randomUUID } from 'crypto'
import { createStore } from './store'

type Entity = { id: string }

/**
 * CRUD over a JSON array, shared by products, offers and templates so the same
 * logic is not written three times. When `timestamps` is on, createdAt and
 * updatedAt are maintained automatically.
 */
export function createCollection<T extends Entity>(fileName: string, timestamps = true) {
  const store = createStore<T[]>(fileName, () => [])

  async function list(): Promise<T[]> {
    return store.read()
  }

  async function get(id: string): Promise<T | null> {
    const items = await store.read()
    return items.find((item) => item.id === id) ?? null
  }

  async function create(input: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const items = await store.read()
    const now = new Date().toISOString()
    const entity = {
      ...(input as object),
      id: randomUUID(),
      ...(timestamps ? { createdAt: now, updatedAt: now } : {})
    } as T
    items.push(entity)
    await store.write(items)
    return entity
  }

  async function update(id: string, patch: Partial<T>): Promise<T> {
    const items = await store.read()
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) throw new Error(`Nie znaleziono rekordu o id ${id}`)
    const next = {
      ...items[index],
      ...patch,
      id,
      ...(timestamps ? { updatedAt: new Date().toISOString() } : {})
    } as T
    items[index] = next
    await store.write(items)
    return next
  }

  async function remove(id: string): Promise<void> {
    const items = await store.read()
    await store.write(items.filter((item) => item.id !== id))
  }

  /** Overwrites the whole collection — used by bulk operations such as cascade deletes. */
  async function replaceAll(items: T[]): Promise<void> {
    await store.write(items)
  }

  return { list, get, create, update, remove, replaceAll, filePath: store.filePath }
}
