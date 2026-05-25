import { StorageAdapter } from './types';
import * as Y from 'yjs';
export declare function saveYDoc(doc: Y.Doc, storage: StorageAdapter): Promise<void>;
export declare function loadYDoc(doc: Y.Doc, storage: StorageAdapter): Promise<void>;
export declare function savePageRaw(page: string, content: string, storage: StorageAdapter): Promise<void>;
export declare function loadPageRaw(page: string, storage: StorageAdapter): Promise<string | null>;
