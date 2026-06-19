/**
 * pptx-export.ts
 *
 * Converts a PPTAutomation Presentation AST into a native .pptx file using
 * pptxgenjs (https://gitbrent.github.io/PptxGenJS/).
 *
 * Element support matrix:
 *   ✅ heading        → pptx text box (bold, sized by heading level)
 *   ✅ text           → pptx text box
 *   ✅ bullet-list    → pptx text box with bullet option
 *   ✅ image          → pptx image (base64 or URL)
 *   ✅ table          → pptx table
 *   ✅ code           → pptx text box (monospace, dark fill)
 *   ✅ callout        → pptx text box (coloured fill matching variant)
 *   ✅ divider        → pptx line shape
 *   ⚠️  diagram       → placeholder text box ("Mermaid diagram — view in HTML export")
 *   ⚠️  video/audio   → placeholder text box with URL note
 *   ⚠️  quiz/button   → placeholder text box
 *   ⚠️  whiteboard    → SVG snapshot if available, else placeholder
 *
 * Positioning:
 *   - Flow elements: stacked top-to-bottom with computed Y offsets.
 *   - Absolute elements: converted from % of slide to inches (pptxgenjs units).
 */

import pptxgen from 'pptxgenjs';
import type {
  Presentation,
  Slide,
  Element as PresentationElement,
  HeadingElement,
  TextElement,
  BulletListElement,
  ImageElement,
  TableElement,
  CodeElement,
  CalloutElement,
  DividerElement,
  DiagramElement,
  VideoElement,
  Theme,
  Asset,
} from '@/core/schema';
import { slugify } from './download.ts';

// ─── Slide canvas dimensions (inches, 16:9) ───────────────────────────────────
const SLIDE_W_IN = 13.33; // inches — pptxgenjs default for widescreen
const SLIDE_H_IN = 7.5;

// Slide padding in inches (mirrors theme default of ~60px on a 1920px canvas)
const PAD_X = 0.5;
const PAD_Y = 0.45;

// ─── Colour helpers ───────────────────────────────────────────────────────────

/** Strip leading '#' from a CSS hex colour for pptxgenjs. */
function hex(color: string): string {
  return color.replace(/^#/, '').toUpperCase();
}

/** Callout variant → fill colour (hex, no #). */
const CALLOUT_FILLS: Record<string, string> = {
  info:    '1E3A5F',
  warning: '4A3700',
  danger:  '4A0D0D',
  success: '0D3320',
  tip:     '1A3A2A',
  note:    '2A2A40',
};

// ─── Theme application ────────────────────────────────────────────────────────

function applyMasterTheme(pptx: pptxgen, theme: Theme) {
  pptx.layout    = 'LAYOUT_WIDE'; // 13.33 x 7.5 in = 16:9
  pptx.author    = 'PPTAutomation';
  pptx.company   = 'PPTAutomation';
}

function slideBackgroundFill(slide: Slide, theme: Theme): string {
  const bg = slide.background;
  if (bg.type === 'color' && bg.color) return hex(bg.color);
  return hex(theme.colors.background);
}

// ─── Absolute position helpers ────────────────────────────────────────────────

/** Convert a percentage of slide width/height to inches. */
function pctToIn(pct: number, axis: 'x' | 'y'): number {
  return ((pct / 100) * (axis === 'x' ? SLIDE_W_IN : SLIDE_H_IN));
}

// ─── Element renderers ────────────────────────────────────────────────────────

interface FlowCursor {
  y: number; // current top in inches
}

function addFlowElement(
  slide: pptxgen.Slide,
  el: PresentationElement,
  cursor: FlowCursor,
  theme: Theme,
  assetMap: Map<string, Asset>,
) {
  const x = PAD_X;
  const w = SLIDE_W_IN - PAD_X * 2;

  switch (el.type) {
    case 'heading': {
      const h = el as HeadingElement;
      // level 1→48pt, 2→36pt, 3→28pt, 4→22pt, 5→18pt, 6→14pt
      const fontSize = [48, 36, 28, 22, 18, 14][Math.min(h.level - 1, 5)];
      const boxH = fontSize * 0.0138889 + 0.1; // approx inch height
      slide.addText(h.content, {
        x, y: cursor.y, w, h: boxH,
        fontSize, bold: true,
        color: hex(theme.colors.foreground),
        fontFace: theme.typography.headingFont,
      });
      cursor.y += boxH + 0.1;
      break;
    }

    case 'text': {
      const t = el as TextElement;
      const content = typeof t.content === 'string' ? t.content : '';
      if (!content.trim()) break;
      const boxH = Math.max(0.35, content.split('\n').length * 0.25);
      slide.addText(content, {
        x, y: cursor.y, w, h: boxH,
        fontSize: theme.typography.baseSizePx * 0.75,
        color: hex(theme.colors.foreground),
        fontFace: theme.typography.bodyFont,
        wrap: true,
      });
      cursor.y += boxH + 0.1;
      break;
    }

    case 'bullet-list': {
      const bl = el as BulletListElement;
      if (bl.items.length === 0) break;
      const textItems = bl.items.map((item) => ({
        text: item.content,
        options: {
          bullet: !bl.ordered ? true : { type: 'number' } as pptxgen.TextPropsOptions['bullet'],
          indentLevel: item.level,
          fontSize: theme.typography.baseSizePx * 0.75,
          color: hex(theme.colors.foreground),
          fontFace: theme.typography.bodyFont,
        },
      }));
      const boxH = Math.max(0.35, bl.items.length * 0.27 + 0.1);
      slide.addText(textItems, { x, y: cursor.y, w, h: boxH, wrap: true });
      cursor.y += boxH + 0.1;
      break;
    }

    case 'image': {
      const img = el as ImageElement;
      const asset = assetMap.get(img.assetId);
      const src = asset?.url ?? img.assetId;
      if (!src) break;
      const boxH = 2.5;
      try {
        if (src.startsWith('data:')) {
          // base64 data URI
          const [header, data] = src.split(',');
          const type = header.match(/data:image\/(\w+)/)?.[1] ?? 'png';
          slide.addImage({ data: src, x, y: cursor.y, w, h: boxH, sizing: { type: 'contain', w, h: boxH } });
        } else {
          slide.addImage({ path: src, x, y: cursor.y, w, h: boxH, sizing: { type: 'contain', w, h: boxH } });
        }
        if (img.caption) {
          cursor.y += boxH;
          slide.addText(img.caption, {
            x, y: cursor.y, w, h: 0.2,
            fontSize: 10, italic: true,
            color: hex(theme.colors.muted),
            fontFace: theme.typography.bodyFont,
          });
          cursor.y += 0.2 + 0.1;
        } else {
          cursor.y += boxH + 0.1;
        }
      } catch {
        // External URL images can fail in pptxgenjs — add placeholder
        addPlaceholder(slide, `[Image: ${img.alt || src.slice(0, 40)}]`, x, cursor.y, w, theme);
        cursor.y += 0.4 + 0.1;
      }
      break;
    }

    case 'table': {
      const tbl = el as TableElement;
      if (!tbl.headers.length && !tbl.rows.length) break;
      const headerRow = tbl.headers.map((h) => ({
        text: h,
        options: {
          bold: true,
          color: 'FFFFFF',
          fill: { color: hex(theme.colors.primary) },
          fontSize: Math.round(theme.typography.baseSizePx * 0.65),
          fontFace: theme.typography.headingFont,
        },
      }));
      const dataRows = tbl.rows.map((row) =>
        row.map((cell) => ({
          text: cell,
          options: {
            fontSize: Math.round(theme.typography.baseSizePx * 0.6),
            color: hex(theme.colors.foreground),
            fontFace: theme.typography.bodyFont,
          },
        })),
      );
      const rows = tbl.headers.length ? [headerRow, ...dataRows] : dataRows;
      const boxH = rows.length * 0.32 + 0.1;
      slide.addTable(rows as pptxgen.TableRow[], {
        x, y: cursor.y, w,
        border: { type: 'solid', color: hex(theme.colors.muted), pt: 0.5 },
      });
      cursor.y += boxH + 0.15;
      break;
    }

    case 'code': {
      const ce = el as CodeElement;
      const label = ce.filename ? `${ce.filename}\n` : '';
      const boxH = Math.max(0.5, (ce.code.split('\n').length + (ce.filename ? 1 : 0)) * 0.18 + 0.2);
      slide.addText(label + ce.code, {
        x, y: cursor.y, w, h: boxH,
        fontSize: 9,
        color: 'E2E8F0',
        fill: { color: '1E293B' },
        fontFace: 'Courier New',
        wrap: true,
        inset: 0.1,
      });
      cursor.y += boxH + 0.1;
      break;
    }

    case 'callout': {
      const ca = el as CalloutElement;
      const fill = CALLOUT_FILLS[ca.variant] ?? '2A2A40';
      const label = ca.title ? `${ca.title}\n` : '';
      const lines = (label + ca.content).split('\n').length;
      const boxH = Math.max(0.4, lines * 0.22 + 0.15);
      slide.addText(label + ca.content, {
        x, y: cursor.y, w, h: boxH,
        fontSize: Math.round(theme.typography.baseSizePx * 0.65),
        color: 'FFFFFF',
        fill: { color: fill },
        fontFace: theme.typography.bodyFont,
        wrap: true,
        inset: 0.12,
      });
      cursor.y += boxH + 0.1;
      break;
    }

    case 'divider': {
      const dv = el as DividerElement;
      slide.addShape('line', {
        x, y: cursor.y + 0.05,
        w, h: 0,
        line: {
          color: dv.color ? hex(dv.color) : hex(theme.colors.muted),
          width: dv.thickness ?? 1,
          dashType: dv.lineStyle === 'dashed' ? 'dash' : dv.lineStyle === 'dotted' ? 'sysDot' : 'solid',
        },
      });
      cursor.y += 0.2;
      break;
    }

    case 'diagram': {
      const dg = el as DiagramElement;
      addPlaceholder(
        slide,
        `📊 Mermaid ${dg.diagramType} diagram\n(Rendered in HTML export — view the exported .html file)`,
        x, cursor.y, w, theme,
      );
      cursor.y += 0.55 + 0.1;
      break;
    }

    case 'video': {
      const ve = el as VideoElement;
      const url = ve.url ?? (assetMap.get(ve.assetId ?? '')?.url ?? '');
      addPlaceholder(slide, `🎬 Video${url ? `: ${url.slice(0, 60)}` : ''}`, x, cursor.y, w, theme);
      cursor.y += 0.4 + 0.1;
      break;
    }

    default: {
      // quiz, button, icon, timeline, flowchart, chart, shape, whiteboard, audio, embed
      const label = `[${el.type.charAt(0).toUpperCase() + el.type.slice(1)} element — view in HTML export]`;
      addPlaceholder(slide, label, x, cursor.y, w, theme);
      cursor.y += 0.4 + 0.1;
      break;
    }
  }
}

function addAbsoluteElement(
  slide: pptxgen.Slide,
  el: PresentationElement,
  theme: Theme,
  assetMap: Map<string, Asset>,
) {
  const pos = el.position;
  if (pos.mode !== 'absolute') return;

  const x = pctToIn(pos.x ?? 0, 'x');
  const y = pctToIn(pos.y ?? 0, 'y');
  const w = pos.width  != null ? pctToIn(pos.width,  'x') : SLIDE_W_IN * 0.5;
  const h = pos.height != null ? pctToIn(pos.height, 'y') : SLIDE_H_IN * 0.2;

  switch (el.type) {
    case 'heading': {
      const he = el as HeadingElement;
      const fontSize = [48, 36, 28, 22, 18, 14][Math.min(he.level - 1, 5)];
      slide.addText(he.content, {
        x, y, w, h, fontSize, bold: true,
        color: hex(theme.colors.foreground),
        fontFace: theme.typography.headingFont,
      });
      break;
    }
    case 'text': {
      const te = el as TextElement;
      slide.addText(typeof te.content === 'string' ? te.content : '', {
        x, y, w, h,
        fontSize: theme.typography.baseSizePx * 0.75,
        color: hex(theme.colors.foreground),
        fontFace: theme.typography.bodyFont,
        wrap: true,
      });
      break;
    }
    case 'image': {
      const ie = el as ImageElement;
      const asset = assetMap.get(ie.assetId);
      const src = asset?.url ?? ie.assetId;
      try {
        slide.addImage({ path: src, x, y, w, h, sizing: { type: 'contain', w, h } });
      } catch {
        addPlaceholder(slide, `[Image: ${ie.alt}]`, x, y, w, theme);
      }
      break;
    }
    default: {
      addPlaceholder(slide, `[${el.type}]`, x, y, w, theme);
    }
  }
}

function addPlaceholder(
  slide: pptxgen.Slide,
  text: string,
  x: number,
  y: number,
  w: number,
  theme: Theme,
) {
  slide.addText(text, {
    x, y, w, h: 0.4,
    fontSize: 9,
    color: 'A0AEC0',
    fill: { color: '1A202C' },
    line: { color: '4A5568', width: 0.5, dashType: 'dash' },
    fontFace: 'Courier New',
    italic: true,
    wrap: true,
    inset: 0.08,
  });
}

// ─── Slide builder ────────────────────────────────────────────────────────────

function buildSlide(
  pSlide: pptxgen.Slide,
  slide: Slide,
  theme: Theme,
  assetMap: Map<string, Asset>,
) {
  // Background colour (gradients and image backgrounds are not supported natively
  // in pptxgenjs v3 — use solid fill from first gradient stop or theme bg)
  const bg = slide.background;
  let bgHex = hex(theme.colors.background);
  if (bg.type === 'color' && bg.color) bgHex = hex(bg.color);
  if (bg.type === 'gradient' && bg.gradient?.stops?.[0]?.color) {
    bgHex = hex(bg.gradient.stops[0].color);
  }
  pSlide.background = { color: bgHex };

  // Speaker notes
  if (slide.notes) pSlide.addNotes(slide.notes);

  // Flow elements — stacked in order, starting below padding
  const cursor: FlowCursor = { y: PAD_Y };
  const flowEls = slide.elements.filter((el) => el.position.mode !== 'absolute');
  const absEls  = slide.elements.filter((el) => el.position.mode === 'absolute');

  for (const el of flowEls) {
    if (cursor.y > SLIDE_H_IN - PAD_Y) break; // stop if we've run off the slide
    addFlowElement(pSlide, el, cursor, theme, assetMap);
  }

  // Absolute elements — positioned using their percentage coordinates
  for (const el of absEls) {
    addAbsoluteElement(pSlide, el, theme, assetMap);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate and download a .pptx file from a PPTAutomation Presentation.
 */
export async function exportPptx(presentation: Presentation): Promise<void> {
  const pptx = new pptxgen();

  applyMasterTheme(pptx, presentation.theme);

  const assetMap = new Map<string, Asset>(
    presentation.assets.map((a) => [a.id, a]),
  );

  for (const slide of presentation.slides) {
    const pSlide = pptx.addSlide();
    buildSlide(pSlide, slide, presentation.theme, assetMap);
  }

  const fileName = slugify(presentation.meta.title) + '.pptx';
  await pptx.writeFile({ fileName });
}
