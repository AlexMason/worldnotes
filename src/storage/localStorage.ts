import type { StorageAdapter } from '../types'

const DEFAULT_NAMESPACE = 'worldnotes'

/**
 * Storage adapter backed by window.localStorage.
 * All keys are namespaced to avoid collisions with other localStorage users.
 *
 * @param namespace - Optional prefix for all stored keys (default: 'worldnotes')
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly namespace: string

  constructor(namespace = DEFAULT_NAMESPACE) {
    this.namespace = namespace
  }

  private key(page: string): string {
    return `${this.namespace}::${page}`
  }

  async get(page: string): Promise<string | null> {
    return localStorage.getItem(this.key(page))
  }

  async set(page: string, content: string): Promise<void> {
    localStorage.setItem(this.key(page), content)
  }

  async keys(): Promise<string[]> {
    const prefix = `${this.namespace}::`
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
  }
}
