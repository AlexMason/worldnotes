import { UIPlugin } from '../types';
export declare const remoteCursorsPlugin: UIPlugin;
/**
 * Render remote cursors in an overlay element based on awareness state.
 *
 * @param overlayEl - The overlay container element
 * @param awareness - Yjs Awareness instance (or null)
 * @param editorDiv - The contentEditable editor (used for coordinate mapping)
 * @param localClientId - The local client's ID to skip rendering self
 */
export declare function renderRemoteCursors(overlayEl: HTMLElement, awareness: {
    getStates: () => Map<number, {
        cursor?: {
            offset: number;
            page: string;
        };
        user?: {
            name: string;
            color: string;
        };
    }>;
    clientID: number;
} | null, editorDiv: HTMLElement, localClientId: number): void;
