/**
 * layout-templates.ts
 *
 * Wraps rendered element HTML into the correct column structure
 * based on the slide's layout type.
 *
 * Single responsibility: given a layout name + array of element HTML strings,
 * return the final inner HTML of the <section>.
 */

import type { Element, SlideLayout } from '../schema.ts';
import type { RenderContext } from './element-renderers.ts';
import { renderElement } from './element-renderers.ts';

// ─── PUBLIC ──────────────────────────────────────────────────

/**
 * Render a slide's elements using the correct layout wrapper.
 * Returns the inner HTML to place inside the <section>.
 */
export function applyLayout(
  layout: SlideLayout,
  elements: Element[],
  title: string | undefined,
  ctx: RenderContext,
): string {
  switch (layout) {
    case 'cover':
      return coverLayout(elements, title, ctx);
    case 'section':
      return sectionLayout(title);
    case 'two-column':
      return twoColumnLayout(elements, ctx);
    case 'three-column':
      return threeColumnLayout(elements, ctx);
    case 'image-left':
      return imageColumnLayout(elements, ctx, 'left');
    case 'image-right':
      return imageColumnLayout(elements, ctx, 'right');
    case 'full-image':
      return fullImageLayout(elements, ctx);
    case 'full-video':
      return fullVideoLayout(elements, ctx);
    case 'quote':
      return quoteLayout(elements, ctx);
    case 'content':
    case 'blank':
    case 'comparison':
    case 'timeline':
    case 'custom':
    default:
      return contentLayout(elements, title, ctx);
  }
}

// ─── LAYOUT IMPLEMENTATIONS ──────────────────────────────────

function coverLayout(elements: Element[], title: string | undefined, ctx: RenderContext): string {
  const heading = title
    ? `<h1>${title}</h1>`
    : '';
  const body = renderAll(elements, ctx);
  return `<div class="ppt-layout-cover">\n  ${heading}\n  ${body}\n</div>`;
}

function sectionLayout(title: string | undefined): string {
  const heading = title ? `<h2>${title}</h2>` : '';
  return `<div class="ppt-layout-section">\n  ${heading}\n</div>`;
}

function contentLayout(elements: Element[], title: string | undefined, ctx: RenderContext): string {
  const heading = title ? `<h2>${title}</h2>` : '';
  const body = renderAll(elements, ctx);
  return `${heading}\n${body}`;
}

function twoColumnLayout(elements: Element[], ctx: RenderContext): string {
  const mid = Math.ceil(elements.length / 2);
  const left  = elements.slice(0, mid);
  const right = elements.slice(mid);
  return columnGrid('ppt-columns--2', [left, right], ctx);
}

function threeColumnLayout(elements: Element[], ctx: RenderContext): string {
  const third = Math.ceil(elements.length / 3);
  const cols = [
    elements.slice(0, third),
    elements.slice(third, third * 2),
    elements.slice(third * 2),
  ];
  return columnGrid('ppt-columns--3', cols, ctx);
}

function imageColumnLayout(
  elements: Element[],
  ctx: RenderContext,
  imagePosition: 'left' | 'right',
): string {
  const imageEls  = elements.filter((e) => e.type === 'image');
  const otherEls  = elements.filter((e) => e.type !== 'image');

  const cols =
    imagePosition === 'left'
      ? [imageEls, otherEls]
      : [otherEls, imageEls];

  const gridClass =
    imagePosition === 'left' ? 'ppt-columns--image-left' : 'ppt-columns--image-right';

  return columnGrid(gridClass, cols, ctx);
}

function fullImageLayout(elements: Element[], ctx: RenderContext): string {
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:0;">${renderAll(elements, ctx)}</div>`;
}

function fullVideoLayout(elements: Element[], ctx: RenderContext): string {
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:0;">${renderAll(elements, ctx)}</div>`;
}

function quoteLayout(elements: Element[], ctx: RenderContext): string {
  return `<div class="ppt-layout-cover" style="text-align:center;align-items:center;">${renderAll(elements, ctx)}</div>`;
}

// ─── HELPERS ─────────────────────────────────────────────────

function renderAll(elements: Element[], ctx: RenderContext): string {
  return elements.map((el) => renderElement(el, ctx)).join('\n');
}

function columnGrid(
  gridClass: string,
  columns: Element[][],
  ctx: RenderContext,
): string {
  const cols = columns
    .map(
      (colEls) =>
        `<div class="ppt-col">\n${renderAll(colEls, ctx)}\n</div>`,
    )
    .join('\n');
  return `<div class="ppt-columns ${gridClass}">\n${cols}\n</div>`;
}
