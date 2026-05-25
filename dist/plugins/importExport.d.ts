import { UIPlugin, StorageAdapter } from '../types';
import { ConflictStrategy } from '../export-import';
export interface ImportExportPluginOptions {
    storage: StorageAdapter;
    onImportComplete: () => void | Promise<void>;
    exportFilename?: string;
    importStrategy?: ConflictStrategy;
}
/**
 * Create a UIPlugin that adds Export and Import buttons to the editor toolbar.
 *
 * Export: downloads all pages as a .zip of nested .md files.
 * Import: reads a .zip, imports .md files as pages, then calls onImportComplete.
 *
 * @example
 * const editor = await createEditor(el, { storage: adapter })
 *   .use(createImportExportPlugin({
 *     storage: adapter,
 *     onImportComplete: () => editor.navigate(editor.getCurrentPage()),
 *   }))
 *   .mount()
 */
export declare function createImportExportPlugin(options: ImportExportPluginOptions): UIPlugin;
