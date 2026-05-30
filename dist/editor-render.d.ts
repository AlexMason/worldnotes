import { ContentPlugin } from './types';
import { EditorStateAPI } from './editor-state';
import { EditorDOM } from './editor-dom';
export interface EditorRenderAPI {
    render(force?: boolean, cursorOffset?: number): void;
    renderBreadcrumb(): void;
    syncUrlToTrail(): void;
    checkSelectChange(): void;
}
export interface EditorRenderOptions {
    onBreadcrumbNavigate?: (page: string) => void;
    onTrailChange?: (trail: string[]) => void;
    navigateFn?: (page: string) => void;
    statusPages?: Record<number, string>;
    showCreateOverlay?: boolean;
}
export declare function createEditorRender(dom: EditorDOM, contentPlugins: ContentPlugin[], state: EditorStateAPI, options?: EditorRenderOptions): EditorRenderAPI;
