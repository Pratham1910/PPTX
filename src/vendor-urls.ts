// Static paths to vendor files copied to public/vendor/ by scripts/copy-vendor.mjs.
// These resolve against the page origin, so they work in srcdoc iframes
// (which inherit the parent page's base URL) without any CDN dependency.
import type { VendorUrls } from './core/renderer/html-template.ts';

export const LOCAL_VENDOR_URLS: VendorUrls = {
  revealResetCss:        '/vendor/reveal/reset.css',
  revealCss:             '/vendor/reveal/reveal.css',
  revealJs:              '/vendor/reveal/reveal.js',
  revealHighlightPlugin: '/vendor/reveal/plugin/highlight.js',
  revealNotesPlugin:     '/vendor/reveal/plugin/notes.js',
  revealZoomPlugin:      '/vendor/reveal/plugin/zoom.js',
  revealSearchPlugin:    '/vendor/reveal/plugin/search.js',
  revealMathPlugin:      '/vendor/reveal/plugin/math.js',
  highlightCss:          '/vendor/highlight/github-dark.min.css',
  mermaidJs:             '/vendor/mermaid/mermaid.min.js',
};
