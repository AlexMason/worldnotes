import { StorageAdapter } from '../types';
/**
 * Storage adapter backed by window.localStorage.
 * All keys are namespaced to avoid collisions with other localStorage users.
 *
 * @param namespace - Optional prefix for all stored keys (default: 'worldnotes')
 */
export declare class LocalStorageAdapter implements StorageAdapter {
    private readonly namespace;
    constructor(namespace?: string);
    private key;
    get(page: string): Promise<string | null>;
    set(page: string, content: string): Promise<void>;
    keys(): Promise<string[]>;
}
