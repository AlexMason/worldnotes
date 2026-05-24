import { StorageAdapter } from './types';
export type ConflictStrategy = 'overwrite' | 'skip' | 'merge';
export interface ImportResult {
    imported: string[];
    skipped: string[];
}
/**
 * Export all pages from storage into a zip Blob of nested markdown files.
 *
 * Page name `a/b/c` maps to zip entry `a/b/c.md`.
 * Returns a Blob suitable for download via URL.createObjectURL().
 */
export declare function exportWorld(storage: StorageAdapter, _options?: {
    filename?: string;
}): Promise<Blob>;
/**
 * Import pages from a zip File or Blob into storage.
 *
 * Zip entries ending in `.md` are treated as pages — the `.md` suffix is
 * stripped to derive the page name. Non-.md files are silently skipped.
 * Empty page names (from a root `.md` file) are also skipped.
 *
 * @param storage  StorageAdapter to write pages into
 * @param file     Zip file or blob to import
 * @param options  Optional conflict strategy (default: 'overwrite')
 * @returns        Report of which pages were imported vs skipped
 */
export declare function importWorld(storage: StorageAdapter, file: File | Blob, options?: {
    strategy?: ConflictStrategy;
}): Promise<ImportResult>;
