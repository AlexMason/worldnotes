import { ContentPlugin } from '../types';
/**
 * Helper: wrap inner text with dimmed punctuation markers on either side.
 *
 * @param cls    - CSS class for the outer wrapper span
 * @param marker - The punctuation character(s) to show on each side
 * @param inner  - The text content between the markers
 */
export declare function withPunct(cls: string, marker: string, inner: string): HTMLElement;
/**
 * Built-in plugin: **bold** text.
 * Renders the ** markers as dimmed punctuation flanking styled bold text.
 */
export declare const boldPlugin: ContentPlugin;
/**
 * Built-in plugin: *italic* text.
 * Renders the * markers as dimmed punctuation flanking styled italic text.
 */
export declare const italicPlugin: ContentPlugin;
/**
 * Built-in plugin: `inline code` spans.
 * Renders backticks as dimmed punctuation flanking a styled code span.
 */
export declare const inlineCodePlugin: ContentPlugin;
/**
 * Built-in plugin: > blockquote lines.
 * Line-level (anchored) — matches the whole line and renders it as a quote block.
 */
export declare const blockquotePlugin: ContentPlugin;
/**
 * Built-in plugin: --- horizontal rules.
 * Line-level — matches --- (or more dashes) on its own line.
 */
export declare const hrPlugin: ContentPlugin;
