/**
 * Public handle for the editor DOM elements returned by {@link createEditorDOM}.
 *
 * @property container      - The root wn-root element (the original container)
 * @property topbar         - Top bar wrapper containing breadcrumbs
 * @property breadcrumb      - Breadcrumb navigation element
 * @property toolbar        - Toolbar slot container between topbar and editor area
 * @property editorWrap     - Wrapper around editor and placeholder
 * @property editorDiv      - The contentEditable editor div
 * @property placeholder    - Initial placeholder text element
 * @property overlay        - Remote cursor overlay layer (absolute positioned)
 * @property header         - Header slot above topbar
 * @property body           - Flex-row wrapper containing leftSidepanel + editorWrap + rightSidepanel
 * @property footer         - Footer slot below body
 * @property leftSidepanel  - Left sidebar slot (hidden via :not(:empty) CSS)
 * @property rightSidepanel - Right sidebar slot (hidden via :not(:empty) CSS)
 */
export interface EditorDOM {
    container: HTMLElement;
    topbar: HTMLElement;
    breadcrumb: HTMLElement;
    toolbar: HTMLElement;
    editorWrap: HTMLElement;
    editorDiv: HTMLDivElement;
    placeholder: HTMLElement;
    overlay: HTMLElement;
    header: HTMLElement;
    body: HTMLElement;
    footer: HTMLElement;
    leftSidepanel: HTMLElement;
    rightSidepanel: HTMLElement;
}
/**
 * Build the complete editor DOM inside `container`, inject default CSS
 * into the document head, and return typed references to each element.
 *
 * This is a pure DOM-construction factory — it has no dependency on
 * editor state, storage, or rendering.  Callers receive the element
 * references they need to wire up event handlers, the render loop, and
 * keyboard navigation.
 *
 * @param container - The host element that will receive the editor DOM
 * @param theme     - Optional CSS string that replaces the default stylesheet.
 *                    When omitted, the token-driven DEFAULT_CSS is injected.
 * @returns Typed references to every major editor element
 */
export declare function createEditorDOM(container: HTMLElement, theme?: string): EditorDOM;
