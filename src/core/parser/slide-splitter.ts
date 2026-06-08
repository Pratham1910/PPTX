import type { Root, Content, Heading } from 'mdast';
import type { SlideRaw, DirectiveMap, ParseOptions } from './types.ts';
import { parseDirective } from './utils.ts';

/**
 * Split the root mdast tree into SlideRaw blocks.
 *
 * Algorithm:
 *   Walk mdast children top to bottom.
 *   When a Heading node at a split depth is encountered, flush the current
 *   block and start a new one with that heading.
 *   HTML comment nodes are parsed as directives and attached to the
 *   current block rather than stored as body nodes.
 *
 * Any content before the first heading is discarded (preamble metadata
 * like a title line, INBR number, etc. that should not become slide body).
 */
export function splitIntoSlides(
  root: Root,
  options: ParseOptions,
): SlideRaw[] {
  const splitAt = new Set<number>(options.slideSplitAt ?? [1, 2]);
  const slides: SlideRaw[] = [];

  let currentHeading: Heading | null = null;
  let currentBody: Content[] = [];
  let currentDirectives: DirectiveMap = {};
  let started = false;

  function flush() {
    if (!started) return;
    slides.push({
      headingNode: currentHeading,
      bodyNodes: currentBody,
      directives: currentDirectives,
    });
  }

  for (const node of root.children) {
    // ── HTML comments → directives ───────────────────────────
    if (node.type === 'html') {
      const directive = parseDirective(node.value);
      if (directive) {
        currentDirectives[directive.key as keyof DirectiveMap] =
          directive.value as string;
        continue; // directives are metadata, not body content
      }
      // Non-directive HTML (e.g. <video>) goes into body
      currentBody.push(node);
      continue;
    }

    // ── Heading at a split depth → new slide ─────────────────
    if (node.type === 'heading' && splitAt.has(node.depth)) {
      flush();
      currentHeading = node;
      currentBody = [];
      currentDirectives = {};
      started = true;
      continue;
    }

    // ── Everything else → body of current slide ──────────────
    if (started) {
      currentBody.push(node);
    }
    // (content before the first heading is silently dropped)
  }

  flush(); // flush the last slide
  return slides;
}
