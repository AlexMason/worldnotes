import { StorageAdapter } from './types';
export type ConflictStrategy = 'overwrite' | 'skip' | 'merge';
export interface ImportResult {
    imported: string[];
    skipped: string[];
}
/**
 * Export all pages from storage into a zip Blob.
 *
 * Includes both individual .md files AND a _worldnotes.yjs binary
 * for lossless Y.Doc round-tripping (preserves undo history, CRDT metadata).
 *
 * Page name `a/b/c` maps to zip entry `a/b/c.md`.
 */
export declare function exportWorld(storage: StorageAdapter, _options?: {
    filename?: string;
}): Promise<Blob>;
/**
 * Import pages from a zip File or Blob into storage.
 *
 * If `_worldnotes.yjs` is present, it is saved as the Y.Doc persistence key.
 * Individual `.md` files are imported as pages (the `.md` suffix is stripped).
 * Both formats can coexist in the same zip — .yjs is loaded first for lossless
 * state, then .md overlays any additional pages.
 *
 * @param storage  StorageAdapter to write pages into
 * @param file     Zip file or blob to import
 * @param options  Optional conflict strategy (default: 'overwrite')
 * @returns        Report of which pages were imported vs skipped
 */
export declare function importWorld(storage: StorageAdapter, file: File | Blob, options?: {
    strategy?: ConflictStrategy;
}): Promise<ImportResult>;
