/**
 * slide-renderer.ts
 *
 * Converts a single Slide → <section> HTML string.
 * Converts the entire Presentation → all <section> strings joined.
 *
 * Reveal.js attributes applied here:
 *   data-transition       — per-slide transition override
 *   data-auto-animate     — when autoAnimateId is set
 *   data-auto-animate-id  — the shared id for morphing elements
 *   data-background-color — solid colour background
 *   data-background-image — image background
 *   data-background-video — video background
 *   data-notes            — speaker notes (read by notes plugin)
 */

import type { Slide, Presentation, SlideBackground } from '../schema.ts';
import type { RenderContext } from './element-renderers.ts';
import { buildRenderContext } from './element-renderers.ts';
import { applyLayout } from './layout-templates.ts';
import { escapeHtml } from './utils.ts';

// ─── SINGLE SLIDE ────────────────────────────────────────────

export function renderSlide(slide: Slide, ctx: RenderContext): string {
  const sectionAttrs = buildSectionAttrs(slide, ctx);
  const inner = applyLayout(slide.layout, slide.elements, slide.title, ctx);
  const notes = slide.notes
    ? `\n<aside class="notes">${escapeHtml(slide.notes)}</aside>`
    : '';

  return `<section${sectionAttrs}>\n${inner}${notes}\n</section>`;
}

// ─── ALL SLIDES ───────────────────────────────────────────────

export function renderAllSlides(
  presentation: Presentation,
  embedAssets = false,
): string {
  const ctx = buildRenderContext(presentation.assets, embedAssets);
  return presentation.slides
    .map((slide) => renderSlide(slide, ctx))
    .join('\n\n');
}

// ─── SECTION ATTRIBUTE BUILDER ────────────────────────────────

function buildSectionAttrs(slide: Slide, ctx: RenderContext): string {
  const parts: string[] = [];

  // ── Stable id for __pptAction navigate targeting ──
  parts.push(`id="${escapeHtml(slide.id)}"`);

  // ── Auto-animate ──
  if (slide.autoAnimateId) {
    parts.push(`data-auto-animate`);
    parts.push(`data-auto-animate-id="${escapeHtml(slide.autoAnimateId)}"`);
  }

  // ── Transition override ──
  if (slide.transition?.in) {
    const t = slide.transition.in;
    parts.push(`data-transition="${escapeHtml(t.type ?? 'fade')}"`);
    if (t.durationMs) {
      parts.push(`data-transition-speed="${t.durationMs < 300 ? 'fast' : t.durationMs > 700 ? 'slow' : 'default'}"`);
    }
  }

  // ── Background ──
  const bgAttrs = buildBackgroundAttrs(slide.background, ctx);
  if (bgAttrs) parts.push(bgAttrs);

  // ── Accessibility ──
  if (slide.title) {
    parts.push(`aria-label="${escapeHtml(slide.title)}"`);
  }

  // ── Auto-advance ──
  if (slide.autoAdvanceMs && slide.autoAdvanceMs > 0) {
    parts.push(`data-autoslide="${slide.autoAdvanceMs}"`);
  }

  return parts.length ? ' ' + parts.join(' ') : '';
}

function buildBackgroundAttrs(bg: SlideBackground, ctx: RenderContext): string {
  switch (bg.type) {
    case 'color':
      return bg.color ? `data-background-color="${escapeHtml(bg.color)}"` : '';

    case 'gradient': {
      if (!bg.gradient) return '';
      const stops = bg.gradient.stops
        .map((s) => `${s.color} ${s.position}%`)
        .join(', ');
      const angle = bg.gradient.angle ?? 135;
      const gradientCss =
        bg.gradient.type === 'radial'
          ? `radial-gradient(${stops})`
          : `linear-gradient(${angle}deg, ${stops})`;
      return `data-background="${escapeHtml(gradientCss)}"`;
    }

    case 'image': {
      if (!bg.image?.assetId) return '';
      const asset = ctx.assetMap.get(bg.image.assetId);
      if (!asset) return '';
      const parts = [`data-background-image="${escapeHtml(asset.url)}"`];
      if (bg.image.size) parts.push(`data-background-size="${bg.image.size}"`);
      if (bg.image.position) parts.push(`data-background-position="${escapeHtml(bg.image.position)}"`);
      if (bg.image.opacity !== undefined) parts.push(`data-background-opacity="${bg.image.opacity}"`);
      return parts.join(' ');
    }

    case 'video': {
      if (!bg.video?.assetId) return '';
      const asset = ctx.assetMap.get(bg.video.assetId);
      if (!asset) return '';
      const parts = [`data-background-video="${escapeHtml(asset.url)}"`];
      if (bg.video.loop)  parts.push(`data-background-video-loop`);
      if (bg.video.muted) parts.push(`data-background-video-muted`);
      if (bg.video.opacity !== undefined) parts.push(`data-background-opacity="${bg.video.opacity}"`);
      return parts.join(' ');
    }

    default:
      return '';
  }
}
