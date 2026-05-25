import { ContentPlugin, UIPlugin, StorageAdapter, EditorOptions, EditorInstance } from './types';
import { EditorStateAPI } from './editor-state';
import { EditorDOM } from './editor-dom';
import { EditorRenderAPI } from './editor-render';
import { EditorNavigationAPI } from './editor-navigation';
export interface EditorLifecycleAPI {
    mount(): Promise<EditorInstance>;
}
export declare function createEditorLifecycle(dom: EditorDOM, contentPlugins: ContentPlugin[], uiPlugins: UIPlugin[], state: EditorStateAPI, render: EditorRenderAPI, navigation: EditorNavigationAPI, storage: StorageAdapter, options: EditorOptions): EditorLifecycleAPI;
