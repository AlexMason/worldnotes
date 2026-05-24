export { wikiLinkPlugin } from './wikiLink';
export { headingsPlugin } from './headings';
export { boldPlugin, italicPlugin, inlineCodePlugin, blockquotePlugin, hrPlugin } from './inline';
/**
 * The default plugin set — everything you need for a fully functional
 * markdown world-notes editor out of the box.
 *
 * Import and spread into createEditor().use() calls, or pick plugins individually.
 */
export { defaultPlugins } from './defaults';
