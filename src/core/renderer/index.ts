/**
 * @pptautomation/renderer — public API
 *
 * Three exports for different use cases:
 *
 *   renderSlides(presentation)
 *     → '<section>...</section><section>...'
 *     Used by the React live preview component.
 *     Inject into a Reveal.js container; caller manages JS init.
 *
 *   renderPresentation(presentation, options?)
 *     → complete '<!DOCTYPE html>...' string
 *     Used by the HTML export engine.
 *     Self-contained; open directly in a browser.
 *
 *   generateThemeCss(theme)
 *     → CSS string
 *     Used by the React live preview to inject a <style> tag.
 */

export { renderAllSlides as renderSlides } from './slide-renderer.ts';
export { generateHtml as renderPresentation } from './html-template.ts';
export { generateThemeCss } from './theme-css.ts';
export type { HtmlTemplateOptions } from './html-template.ts';
export type { RenderContext } from './element-renderers.ts';
