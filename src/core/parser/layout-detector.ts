/**
 * layout-detector.ts
 *
 * Picks the best SlideLayout for a slide given its element composition.
 * These are heuristics — any layout can be overridden with a directive:
 *   <!-- layout: two-column -->
 */

import type { Element, SlideLayout } from '../schema.ts';

export function detectLayout(
  elements: Element[],
  isFirstSlide: boolean,
  firstSlideIsCover: boolean,
): SlideLayout {
  // ── Cover ─────────────────────────────────────────────────
  // First slide with only short text → cover
  if (isFirstSlide && firstSlideIsCover) {
    const nonTextCount = elements.filter(
      (e) => e.type !== 'text' && e.type !== 'heading',
    ).length;
    const textContent = elements
      .filter((e) => e.type === 'text')
      .map((e) => (e as { content: string }).content ?? '')
      .join(' ');

    if (nonTextCount === 0 && textContent.length < 200) return 'cover';
    if (nonTextCount === 0) return 'cover';
  }

  // ── Section divider ───────────────────────────────────────
  // Slide with no elements at all → section
  if (elements.length === 0) return 'section';

  // ── Full image ────────────────────────────────────────────
  // Single image, nothing else → full-image
  if (elements.length === 1 && elements[0].type === 'image') return 'full-image';

  // ── Full video ────────────────────────────────────────────
  if (elements.length === 1 && elements[0].type === 'video') return 'full-video';

  // ── Two-column ────────────────────────────────────────────
  // Image + (text | bullets | table) → image on left, content on right
  const hasImage = elements.some((e) => e.type === 'image');
  const hasContent = elements.some(
    (e) => e.type === 'text' || e.type === 'bullet-list' || e.type === 'table',
  );
  if (hasImage && hasContent) return 'image-left';

  // Two separate list/text blocks (e.g. pros and cons, before/after) → two-column
  const listCount = elements.filter((e) => e.type === 'bullet-list').length;
  if (listCount >= 2) return 'two-column';

  // ── Timeline ──────────────────────────────────────────────
  if (elements.some((e) => e.type === 'timeline')) return 'timeline';

  // ── Default: single content area ─────────────────────────
  return 'content';
}
