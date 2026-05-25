import { ContentPlugin, EditorContext } from './types';
export declare function renderLines(text: string, contentPlugins: ContentPlugin[], context: EditorContext, cache: Map<number, string>, editorDiv: HTMLElement): {
    lineCount: number;
    lineLengths: number[];
};
