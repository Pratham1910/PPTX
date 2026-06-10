/**
 * @pptautomation/parser — public API
 *
 * Single function: markdownToPresentation()
 *
 * Usage:
 *   import { markdownToPresentation } from '@pptautomation/parser';
 *   const presentation = markdownToPresentation(markdownString, {
 *     author: 'BrahMos Aerospace',
 *     sourceRef: 'INBR:3498',
 *     transition: 'fade',
 *   });
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root } from 'mdast';

import type { Presentation } from '../schema.ts';
import type { ParseOptions } from './types.ts';
import { buildPresentation } from './presentation-builder.ts';

export type { ParseOptions } from './types.ts';
export type { Presentation } from '../schema.ts';

/**
 * Parse a Markdown string and return a Presentation AST.
 *
 * Supported Markdown features:
 *   - Headings (H1/H2 → new slides; H3–H6 → inline heading elements)
 *   - Paragraphs → TextElement
 *   - Unordered and ordered lists → BulletListElement (nested lists supported)
 *   - GFM tables → TableElement
 *   - Fenced code blocks → CodeElement or DiagramElement (lang: mermaid)
 *   - Blockquotes → CalloutElement (with [!WARNING]/[!NOTE]/[!TIP] variants)
 *   - Images → ImageElement (assets registered automatically)
 *   - Video links (.mp4/.webm) → VideoElement
 *   - YouTube / Vimeo links → VideoElement (embed URL)
 *   - <video> HTML tags → VideoElement
 *   - <iframe> HTML tags → EmbedElement
 *   - Thematic breaks (---) → DividerElement
 *   - HTML comments as slide directives:
 *       <!-- layout: two-column -->
 *       <!-- transition: zoom -->
 *       <!-- background: #1a1a2e -->
 *       <!-- tags: safety, training -->
 *       <!-- notes: Speaker notes here -->
 *       <!-- auto-advance: 5000 -->
 */
/**
 * Convert :::animate effect\n...\n::: blocks to
 * <!-- @animate effect -->\n... so element-factory can apply the animation.
 * The @-prefixed comment is intentionally non-standard to bypass parseDirective.
 */
function preprocessAnimateBlocks(md: string): string {
  return md.replace(
    /^:::animate\s+(\S+)\s*\n([\s\S]*?)^:::\s*$/gm,
    (_match, effect, content) =>
      `<!-- @animate ${effect.trim()} -->\n${content.trimEnd()}`,
  );
}

export { adocToMarkdown } from './adoc-to-md.ts';

export function markdownToPresentation(
  markdown: string,
  options: ParseOptions = {},
): Presentation {
  const processor = unified().use(remarkParse).use(remarkGfm);
  const mdast = processor.parse(preprocessAnimateBlocks(markdown)) as Root;
  return buildPresentation(mdast, options);
}
