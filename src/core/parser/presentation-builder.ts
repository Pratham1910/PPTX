/**
 * presentation-builder.ts
 *
 * Orchestrates the full mdast → Presentation pipeline:
 *   1. Split mdast into SlideRaw blocks (slide-splitter)
 *   2. For each SlideRaw: convert body nodes → Element[] (element-factory)
 *   3. Detect or apply directive-overridden layout (layout-detector)
 *   4. Assemble Slide objects
 *   5. Build top-level Presentation with defaults
 */

import type { Root } from 'mdast';
import type {
  Presentation,
  Slide,
  SlideLayout,
  SlideBackground,
  Theme,
  PresentationSettings,
  VariableStore,
  EntranceAnimation,
} from '../schema.ts';

import type { ParseOptions, ParseContext } from './types.ts';
import { splitIntoSlides } from './slide-splitter.ts';
import { nodeToElements } from './element-factory.ts';
import { detectLayout } from './layout-detector.ts';
import { uuid, extractText, isoNow, slugify } from './utils.ts';

// ─── ENTRY POINT ─────────────────────────────────────────────

export function buildPresentation(
  mdast: Root,
  options: ParseOptions,
): Presentation {
  const ctx: ParseContext = {
    options,
    assets: [],
    assetIndex: new Map(),
  };

  const rawSlides = splitIntoSlides(mdast, options);
  const firstSlideIsCover = options.firstSlideIsCover ?? true;

  const slides: Slide[] = rawSlides.map((raw, index) => {
    // ── Convert body nodes → elements ──
    const elements = raw.bodyNodes.flatMap((node) =>
      nodeToElements(node, ctx),
    );

    // ── animation directive → apply to first element (<!-- animation: fade -->) ──
    if (raw.directives.animation && elements.length > 0) {
      const effect = raw.directives.animation as EntranceAnimation['effect'];
      elements[0] = {
        ...elements[0],
        animation: {
          entrance: {
            effect: ['fade','slide-up','slide-down','slide-left','slide-right','zoom','zoom-out','bounce'].includes(effect)
              ? effect
              : 'fade',
            trigger: 'fragment',
            durationMs: 600,
            delayMs: 0,
            easing: 'ease',
          },
        },
      };
    }

    // ── Heading element → slide title string ──
    const titleText = raw.headingNode
      ? extractText(raw.headingNode.children)
      : undefined;

    // ── Layout ──
    const directiveLayout = raw.directives.layout as SlideLayout | undefined;
    const layout: SlideLayout =
      directiveLayout ??
      detectLayout(elements, index === 0, firstSlideIsCover);

    // ── Background ──
    const background: SlideBackground = raw.directives.background
      ? { type: 'color', color: raw.directives.background }
      : { type: 'none' };

    // ── Transition override ──
    const transitionRaw = raw.directives.transition;
    const transitionOverride = transitionRaw
      ? {
          in: {
            type: transitionRaw as Slide['transition'] extends
              | { in?: { type: infer T } }
              | undefined
              ? T
              : never,
          },
        }
      : undefined;

    // ── Tags ──
    const tags = raw.directives.tags
      ? raw.directives.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined;

    // ── Auto-advance ──
    const autoAdvanceMs = raw.directives['auto-advance']
      ? parseInt(raw.directives['auto-advance'], 10)
      : undefined;

    // ── Vertical sub-slides (from <!-- vertical --> breaks) ──
    const verticalSlides: Slide[] | undefined = raw.verticalBodyGroups?.length
      ? raw.verticalBodyGroups.map((group, vIdx) => {
          const vElements = group.flatMap((node) => nodeToElements(node, ctx));
          return {
            id: `${titleText ? `slide-${slugify(titleText)}-${index}` : `slide-${index}`}-v${vIdx + 1}`,
            order: vIdx + 1,
            title: undefined,
            layout: detectLayout(vElements, false, false),
            background,
            elements: vElements,
            navigation: { type: 'auto' as const, allowBack: true },
          };
        })
      : undefined;

    // ── Assemble slide ──
    const slide: Slide = {
      id: titleText ? `slide-${slugify(titleText)}-${index}` : `slide-${index}`,
      order: index,
      title: titleText,
      notes: raw.directives.notes,
      layout,
      background,
      elements,
      navigation: { type: 'auto', allowBack: index > 0 },
      tags,
      autoAdvanceMs,
      ...(verticalSlides ? { verticalSlides } : {}),
    };

    if (transitionOverride) {
      (slide as Slide).transition = transitionOverride as Slide['transition'];
    }

    return slide;
  });

  // ── Derive presentation title ──
  const title =
    options.title ??
    (slides[0]?.title ?? 'Untitled Presentation');

  const now = isoNow();

  return {
    presentationId: uuid(),
    schemaVersion: '1.0',
    meta: {
      title,
      author: options.author,
      sourceRef: options.sourceRef,
      language: 'en',
      createdAt: now,
      updatedAt: now,
    },
    theme: defaultTheme(options.themeId),
    settings: defaultSettings(options),
    slides,
    assets: ctx.assets,
    variables: defaultVariables(),
  };
}

// ─── DEFAULTS ────────────────────────────────────────────────

function defaultTheme(themeId?: string): Theme {
  return {
    id: themeId ?? 'default',
    name: 'Default',
    colors: {
      background: '#0d1117',
      foreground: '#e6edf3',
      primary: '#1f6feb',
      secondary: '#388bfd',
      accent: '#f78166',
      muted:  '#8b949e',
      danger: '#da3633',
      success: '#3fb950',
      warning: '#d29922',
      info: '#58a6ff',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      baseSizePx: 18,
      scaleRatio: 1.25,
    },
    spacing: {
      slidePaddingX: 60,
      slidePaddingY: 48,
      elementGap: 16,
    },
    borderRadius: 6,
    aspectRatio: '16:9',
  };
}

function defaultSettings(options: ParseOptions): PresentationSettings {
  return {
    revealjs: {
      transition: options.transition ?? 'fade',
      transitionSpeed: 'default',
      controls: true,
      controlsTutorial: false,
      progress: true,
      slideNumber: 'c/t',
      history: true,
      keyboard: true,
      autoAnimate: true,
      autoAnimateDuration: 0.4,
      autoAnimateEasing: 'ease-in-out',
      loop: false,
      rtl: false,
      fragments: true,
      fragmentInURL: false,
      autoSlide: 0,
      mouseWheel: false,
      previewLinks: false,
    },
    navigation: {
      mode: 'linear',
      showTableOfContents: false,
      showSlideTitle: true,
      showBackButton: false,
      persistState: false,
    },
    export: {
      defaultFormat: 'html',
      embedAssets: true,
      includeNotes: true,
      slideWidthPx: 1920,
      slideHeightPx: 1080,
    },
  };
}

function defaultVariables(): VariableStore {
  return {};
}
