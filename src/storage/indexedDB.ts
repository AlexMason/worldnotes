import type { StorageAdapter } from '../types'

const DEFAULT_DB_NAME = 'worldnotes'
const STORE_NAME = 'pages'

/**
 * Storage adapter backed by IndexedDB.
 * Better suited than localStorage for large worlds or binary content.
 * Call open() before use, or use LocalStorageAdapter for zero-setup cases.
 *
 * @param dbName - IDB database name (default: 'worldnotes')
 */
export class IndexedDBAdapter implements StorageAdapter {
  private readonly dbName: string
  private db: IDBDatabase | null = null

  constructor(dbName = DEFAULT_DB_NAME) {
    this.dbName = dbName
  }

  /**
   * Open (or create) the IndexedDB database.
   * Must be called before get/set/keys, or those methods will call it lazily.
   */
  async open(): Promise<void> {
    if (this.db) return
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  private async ensureOpen(): Promise<IDBDatabase> {
    await this.open()
    return this.db!
  }

  async get(page: string): Promise<string | null> {
    const db = await this.ensureOpen()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(page)
      req.onsuccess = () => resolve((req.result as string) ?? null)
      req.onerror = () => reject(req.error)
    })
  }

  async set(page: string, content: string): Promise<void> {
    const db = await this.ensureOpen()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).put(content, page)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async keys(): Promise<string[]> {
    const db = await this.ensureOpen()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).getAllKeys()
      req.onsuccess = () => resolve(req.result as string[])
      req.onerror = () => reject(req.error)
    })
  }
}
