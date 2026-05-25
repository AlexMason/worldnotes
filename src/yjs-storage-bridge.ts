import * as Y from 'yjs'
import type { StorageAdapter } from './types'

const UPDATE_KEY = '__ync_update__'

export async function saveYDoc(
  doc: Y.Doc,
  storage: StorageAdapter,
): Promise<void> {
  const update = Y.encodeStateAsUpdate(doc)
  const base64 = uint8ArrayToBase64(update)
  await storage.set(UPDATE_KEY, base64)
}

export async function loadYDoc(
  doc: Y.Doc,
  storage: StorageAdapter,
): Promise<void> {
  const base64 = await storage.get(UPDATE_KEY)
  if (base64) {
    const update = base64ToUint8Array(base64)
    Y.applyUpdate(doc, update)
  }
}

export async function savePageRaw(
  page: string,
  content: string,
  storage: StorageAdapter,
): Promise<void> {
  await storage.set(page, content)
}

export async function loadPageRaw(
  page: string,
  storage: StorageAdapter,
): Promise<string | null> {
  return storage.get(page)
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes)
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}
