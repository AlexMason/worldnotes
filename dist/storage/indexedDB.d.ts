import { StorageAdapter } from '../types';
/**
 * Storage adapter backed by IndexedDB.
 * Better suited than localStorage for large worlds or binary content.
 * Call open() before use, or use LocalStorageAdapter for zero-setup cases.
 *
 * @param dbName - IDB database name (default: 'worldnotes')
 */
export declare class IndexedDBAdapter implements StorageAdapter {
    private readonly dbName;
    private db;
    constructor(dbName?: string);
    /**
     * Open (or create) the IndexedDB database.
     * Must be called before get/set/keys, or those methods will call it lazily.
     */
    open(): Promise<void>;
    private ensureOpen;
    get(page: string): Promise<string | null>;
    set(page: string, content: string): Promise<void>;
    keys(): Promise<string[]>;
}
