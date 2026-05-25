import { ContentPlugin, EditorContext } from './types';
export declare function renderLines(text: string, contentPlugins: ContentPlugin[], context: EditorContext, editorDiv: HTMLElement, activeLines?: Set<number>): {
    lineCount: number;
    lineLengths: number[];
};
