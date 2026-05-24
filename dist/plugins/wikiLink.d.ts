import { Plugin } from '../types';

/**
 * Built-in plugin: wiki-style page links.
 *
 * Matches [[page name]] or [[page name|display text]] and renders a styled,
 * clickable span.
 * Clicking navigates to the named page, auto-creating it if it doesn't exist.
 *
 * Renders:
 *   [[projects/acme]] → <span class="wn-wiki-link">acme</span>
 *   [[projects/acme|Client Portal]] → <span class="wn-wiki-link">Client Portal</span>
 */
export declare const wikiLinkPlugin: Plugin;
