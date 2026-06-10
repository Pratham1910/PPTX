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
  let currentVerticalGroups: Content[][] = [];
  let started = false;

  function flush() {
    if (!started) return;
    // Commit the last body group
    const allGroups = [...currentVerticalGroups, currentBody];
    slides.push({
      headingNode: currentHeading,
      bodyNodes: allGroups[0],
      directives: currentDirectives,
      verticalBodyGroups: allGroups.length > 1 ? allGroups.slice(1) : undefined,
    });
  }

  function startNewSlide(heading: Heading) {
    flush();
    currentHeading = heading;
    currentBody = [];
    currentDirectives = {};
    currentVerticalGroups = [];
    started = true;
  }

  for (const node of root.children) {
    // ── HTML comments ────────────────────────────────────────
    if (node.type === 'html') {
      // Vertical break: <!-- vertical -->
      if (/<!--\s*vertical\s*-->/i.test(node.value)) {
        if (started) {
          currentVerticalGroups.push(currentBody);
          currentBody = [];
        }
        continue;
      }

      // Named directive: <!-- key: value -->
      const directive = parseDirective(node.value);
      if (directive) {
        currentDirectives[directive.key as keyof DirectiveMap] =
          directive.value as string;
        continue;
      }

      // Non-directive HTML (e.g. <video>) → body
      if (started) currentBody.push(node);
      continue;
    }

    // ── Heading at a split depth → new slide ─────────────────
    if (node.type === 'heading' && splitAt.has(node.depth)) {
      startNewSlide(node);
      continue;
    }

    // ── Everything else → body of current slide ──────────────
    if (started) {
      currentBody.push(node);
    }
  }

  flush();
  return slides;
}
