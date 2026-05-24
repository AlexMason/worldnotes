import { Plugin } from '../types';

/**
 * Built-in plugin: **bold** text.
 * Renders the ** markers as dimmed punctuation flanking styled bold text.
 */
export declare const boldPlugin: Plugin;
/**
 * Built-in plugin: *italic* text.
 * Renders the * markers as dimmed punctuation flanking styled italic text.
 */
export declare const italicPlugin: Plugin;
/**
 * Built-in plugin: `inline code` spans.
 * Renders backticks as dimmed punctuation flanking a styled code span.
 */
export declare const inlineCodePlugin: Plugin;
/**
 * Built-in plugin: > blockquote lines.
 * Line-level (anchored) — matches the whole line and renders it as a quote block.
 */
export declare const blockquotePlugin: Plugin;
/**
 * Built-in plugin: --- horizontal rules.
 * Line-level — matches --- (or more dashes) on its own line.
 */
export declare const hrPlugin: Plugin;
