import { StorageAdapter, EditorOptions } from './types';
import { EditorStateAPI } from './editor-state';
import { EditorDOM } from './editor-dom';
import { EditorRenderAPI } from './editor-render';
export interface EditorNavigationAPI {
    navigateToPage(page: string): Promise<void>;
    loadPage(page: string): Promise<void>;
    setRenderAPI(render: EditorRenderAPI): void;
}
export declare function createEditorNavigation(state: EditorStateAPI, storage: StorageAdapter, dom: EditorDOM, options: EditorOptions): EditorNavigationAPI;
