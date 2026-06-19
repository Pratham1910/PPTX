/**
 * pptx-parser.ts
 *
 * Parses a .pptx file (File object) into a PPTAutomation Presentation AST.
 *
 * A .pptx is a ZIP archive of XML files (OOXML format):
 *   ppt/presentation.xml          — slide ordering
 *   ppt/slides/slide{N}.xml       — per-slide content
 *   ppt/slides/_rels/slide{N}.xml.rels — slide relationships (images, etc.)
 *   ppt/slideLayouts/slideLayout{N}.xml — layout hints
 *   ppt/media/image{N}.*          — embedded images (binary)
 *   ppt/theme/theme1.xml          — theme colours / fonts
 *
 * Coverage (handles the 80% case):
 *   ✅ Text boxes (title + body placeholders, freeform text boxes)
 *   ✅ Bullet lists (single & multi-level)
 *   ✅ Images (extracted and embedded as base64 data URIs)
 *   ✅ Tables
 *   ✅ Slide background colour
 *   ✅ Speaker notes (ppt/notesSlides/notesSlide{N}.xml)
 *   ✅ Basic theme colours and fonts
 *   ⚠️  SmartArt, charts, WordArt, video → skipped (not added to AST)
 */

import JSZip from 'jszip';
import type {
  Presentation,
  Slide,
  Element as PresentationElement,
  HeadingElement,
  TextElement,
  BulletListElement,
  BulletItem,
  ImageElement,
  TableElement,
  Asset,
  Theme,
} from '@/core/schema';

// ─── XML helpers ──────────────────────────────────────────────────────────────

const parser = new DOMParser();

function parseXml(xmlStr: string): Document {
  return parser.parseFromString(xmlStr, 'application/xml');
}

function text(el: Element | null, ...tags: string[]): string {
  if (!el) return '';
  let node: Element | null = el;
  for (const tag of tags) {
    node = node.querySelector(tag) ?? null;
    if (!node) return '';
  }
  // Collect all <a:t> (text run) content
  return Array.from(node.querySelectorAll('t'))
    .map((t) => t.textContent ?? '')
    .join('');
}

function attr(el: Element | null, attribute: string): string {
  return el?.getAttribute(attribute) ?? '';
}

// ─── Theme extraction ─────────────────────────────────────────────────────────

interface RawTheme {
  fontHeading: string;
  fontBody:    string;
  bg:          string;
  fg:          string;
  accent1:     string;
}

async function extractTheme(zip: JSZip): Promise<RawTheme> {
  const defaults: RawTheme = {
    fontHeading: 'Calibri',
    fontBody:    'Calibri',
    bg:          '#0f1117',
    fg:          '#ffffff',
    accent1:     '#4f46e5',
  };
  try {
    const themeFile = zip.file(/ppt\/theme\/theme\d*\.xml/)[0];
    if (!themeFile) return defaults;
    const xml = parseXml(await themeFile.async('string'));

    const majorFont = xml.querySelector('majorFont')?.getAttribute('typeface') ?? '';
    const minorFont = xml.querySelector('minorFont')?.getAttribute('typeface') ?? '';
    // dk1/lt1 are the dark/light scheme colours
    const dk1 = xml.querySelector('dk1 srgbClr')?.getAttribute('val')
              ?? xml.querySelector('dk1 sysClr')?.getAttribute('lastClr')
              ?? '000000';
    const lt1 = xml.querySelector('lt1 srgbClr')?.getAttribute('val')
              ?? xml.querySelector('lt1 sysClr')?.getAttribute('lastClr')
              ?? 'ffffff';
    const acc1 = xml.querySelector('accent1 srgbClr')?.getAttribute('val') ?? '4f46e5';

    return {
      fontHeading: majorFont || defaults.fontHeading,
      fontBody:    minorFont || defaults.fontBody,
      bg:          '#' + dk1,
      fg:          '#' + lt1,
      accent1:     '#' + acc1,
    };
  } catch {
    return defaults;
  }
}

function buildTheme(raw: RawTheme): Theme {
  return {
    id:   crypto.randomUUID(),
    name: 'Imported',
    colors: {
      background: raw.bg,
      foreground: raw.fg,
      primary:    raw.accent1,
      secondary:  '#818cf8',
      accent:     '#c084fc',
      muted:      '#475569',
      danger:     '#ef4444',
      success:    '#22c55e',
      warning:    '#f59e0b',
      info:       '#38bdf8',
    },
    typography: {
      headingFont:  raw.fontHeading,
      bodyFont:     raw.fontBody,
      monoFont:     'JetBrains Mono',
      baseSizePx:   20,
      scaleRatio:   1.25,
    },
    spacing: { slidePaddingX: 60, slidePaddingY: 48, elementGap: 16 },
    borderRadius: 6,
    aspectRatio: '16:9',
  };
}

// ─── Image extraction ─────────────────────────────────────────────────────────

/** Extension → MIME type map for common image formats. */
const IMG_MIME: Record<string, string> = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  webp: 'image/webp',
  svg:  'image/svg+xml',
  bmp:  'image/bmp',
};

async function extractImages(zip: JSZip): Promise<Map<string, Asset>> {
  const map = new Map<string, Asset>();
  const mediaFiles = zip.file(/ppt\/media\//);

  for (const file of mediaFiles) {
    const name = file.name.split('/').pop() ?? '';
    const ext  = name.split('.').pop()?.toLowerCase() ?? '';
    const mime = IMG_MIME[ext];
    if (!mime) continue; // skip non-image media (videos, audio)

    const bytes  = await file.async('uint8array');
    const base64 = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
    const dataUrl = `data:${mime};base64,${base64}`;

    const asset: Asset = {
      id:         crypto.randomUUID(),
      type:       'image' as const,
      filename:   name,
      mimeType:   mime,
      sizeBytes:  bytes.length,
      url:        dataUrl,
      uploadedAt: new Date().toISOString(),
    };
    // Key by the ZIP entry name so rels can look it up
    map.set(file.name, asset);
    // Also key by just the filename for simpler lookup
    map.set(name, asset);
  }
  return map;
}

// ─── Relationship resolver ────────────────────────────────────────────────────

interface SlideRels {
  /** rId → absolute ZIP path */
  images: Map<string, string>;
}

async function parseSlideRels(zip: JSZip, slideIndex: number): Promise<SlideRels> {
  const relsPath = `ppt/slides/_rels/slide${slideIndex}.xml.rels`;
  const relsFile = zip.file(relsPath);
  const rels: SlideRels = { images: new Map() };
  if (!relsFile) return rels;

  const xml = parseXml(await relsFile.async('string'));
  for (const rel of Array.from(xml.querySelectorAll('Relationship'))) {
    const type   = attr(rel, 'Type');
    const rId    = attr(rel, 'Id');
    const target = attr(rel, 'Target');
    if (type.includes('/image') && rId) {
      // Target is relative to ppt/slides/ → resolve to ppt/media/
      const absPath = target.startsWith('../')
        ? `ppt/${target.replace('../', '')}`
        : `ppt/slides/${target}`;
      rels.images.set(rId, absPath);
    }
  }
  return rels;
}

// ─── Paragraph helpers ────────────────────────────────────────────────────────

interface ParsedPara {
  text:    string;
  level:   number;   // indentation level (0-based)
  isBullet: boolean;
}

function parseParagraph(paraEl: Element): ParsedPara {
  // Collect text from all <a:r><a:t> runs
  const runs = Array.from(paraEl.querySelectorAll('r > t'));
  const rawText = runs.map((r) => r.textContent ?? '').join('');

  // Indentation level from <a:pPr indent="N"> or <a:pPr lvl="N">
  const pPr = paraEl.querySelector('pPr');
  const lvl = parseInt(pPr?.getAttribute('lvl') ?? '0', 10) || 0;

  // Bullet presence: <a:buChar> or <a:buAutoNum> without <a:buNone>
  const hasBuNone = !!paraEl.querySelector('buNone');
  const hasBullet = !hasBuNone && (!!paraEl.querySelector('buChar') || !!paraEl.querySelector('buAutoNum'));

  return { text: rawText, level: lvl, isBullet: hasBullet };
}

// ─── Shape → AST elements ─────────────────────────────────────────────────────

function shapeToElements(
  shapeEl: Element,
  rels: SlideRels,
  imageAssets: Map<string, Asset>,
  allAssets: Asset[],
): PresentationElement[] {
  const elements: PresentationElement[] = [];

  // ── Picture (image) ──────────────────────────────────────────────────────
  const blipFill = shapeEl.querySelector('blipFill');
  if (blipFill) {
    const rId = blipFill.querySelector('blip')?.getAttribute('r:embed')
             ?? blipFill.querySelector('blip')?.getAttribute('embed') ?? '';
    const imgPath = rels.images.get(rId);
    const asset   = imgPath ? imageAssets.get(imgPath) : undefined;
    if (asset) {
      allAssets.push(asset);
      elements.push({
        id:       crypto.randomUUID(),
        type:     'image',
        assetId:  asset.id,
        alt:      '',
        fit:      'contain',
        position: { mode: 'flow' },
      } as ImageElement);
    }
    return elements;
  }

  // ── Table ────────────────────────────────────────────────────────────────
  const tblEl = shapeEl.querySelector('tbl');
  if (tblEl) {
    const headerCells = Array.from(
      tblEl.querySelectorAll('tr:first-child > tc'),
    ).map((tc) => text(tc, 'txBody'));
    const dataRows = Array.from(tblEl.querySelectorAll('tr'))
      .slice(1)
      .map((tr) =>
        Array.from(tr.querySelectorAll('tc')).map((tc) => text(tc, 'txBody')),
      );

    if (headerCells.length || dataRows.length) {
      elements.push({
        id:       crypto.randomUUID(),
        type:     'table',
        headers:  headerCells,
        rows:     dataRows,
        position: { mode: 'flow' },
      } as TableElement);
    }
    return elements;
  }

  // ── Text box / placeholder ───────────────────────────────────────────────
  const txBody = shapeEl.querySelector('txBody');
  if (!txBody) return elements;

  const paras = Array.from(txBody.querySelectorAll('p')).map(parseParagraph);
  if (paras.length === 0 || paras.every((p) => !p.text.trim())) return elements;

  // Detect placeholder type: title / ctrTitle → HeadingElement
  const phType = shapeEl.querySelector('ph')?.getAttribute('type') ?? '';
  const isTitle = phType === 'title' || phType === 'ctrTitle';

  if (isTitle) {
    const headingText = paras.map((p) => p.text).join(' ').trim();
    if (headingText) {
      elements.push({
        id:       crypto.randomUUID(),
        type:     'heading',
        level:    1,
        content:  headingText,
        position: { mode: 'flow' },
      } as HeadingElement);
    }
    return elements;
  }

  // Check if any paragraph has a bullet marker → BulletListElement
  const hasBullets = paras.some((p) => p.isBullet);

  if (hasBullets || paras.length > 1) {
    // Multi-paragraph or bulleted content → BulletList
    const items: BulletItem[] = paras
      .filter((p) => p.text.trim())
      .map((p) => ({
        id:            crypto.randomUUID(),
        content:       p.text,
        contentFormat: 'plain' as const,
        level:         p.level,
      }));

    if (items.length > 0) {
      elements.push({
        id:       crypto.randomUUID(),
        type:     'bullet-list',
        ordered:  false,
        items,
        position: { mode: 'flow' },
      } as BulletListElement);
    }
  } else {
    // Single paragraph non-bullet → TextElement or Heading
    const singleText = paras[0].text.trim();
    if (singleText) {
      elements.push({
        id:            crypto.randomUUID(),
        type:          'text',
        content:       singleText,
        contentFormat: 'plain' as const,
        position:      { mode: 'flow' },
      } as TextElement);
    }
  }

  return elements;
}

// ─── Slide background colour ──────────────────────────────────────────────────

function parseBackground(slideXml: Document, theme: RawTheme): Slide['background'] {
  // Try <p:bg><p:bgPr><a:solidFill><a:srgbClr val="XXXXXX">
  const srgb = slideXml.querySelector('bg solidFill srgbClr');
  if (srgb) {
    const val = srgb.getAttribute('val');
    if (val) return { type: 'color', color: '#' + val };
  }
  // Try scheme colour dk1/lt1 references
  const schemeClr = slideXml.querySelector('bg solidFill schemeClr');
  if (schemeClr) {
    const name = schemeClr.getAttribute('val') ?? '';
    if (name === 'dk1') return { type: 'color', color: theme.bg };
    if (name === 'lt1') return { type: 'color', color: theme.fg };
  }
  return { type: 'none' };
}

// ─── Notes extraction ─────────────────────────────────────────────────────────

async function extractNotes(zip: JSZip, slideIndex: number): Promise<string> {
  // Notes slide path: ppt/notesSlides/notesSlide{N}.xml
  const path = `ppt/notesSlides/notesSlide${slideIndex}.xml`;
  const file = zip.file(path);
  if (!file) return '';
  try {
    const xml = parseXml(await file.async('string'));
    // Get all text runs from the notes body (skip the slide number placeholder)
    const paragraphs = Array.from(xml.querySelectorAll('sp'));
    const notesSp = paragraphs.find((sp) => {
      const phType = sp.querySelector('ph')?.getAttribute('type') ?? '';
      return phType === 'body' || (!phType && sp.querySelector('txBody'));
    });
    if (!notesSp) return '';
    return Array.from(notesSp.querySelectorAll('p'))
      .map((p) =>
        Array.from(p.querySelectorAll('t'))
          .map((t) => t.textContent ?? '')
          .join(''),
      )
      .filter(Boolean)
      .join('\n');
  } catch {
    return '';
  }
}

// ─── Slide ordering ───────────────────────────────────────────────────────────

async function getSlideOrder(zip: JSZip): Promise<number[]> {
  const presFile = zip.file('ppt/presentation.xml');
  if (!presFile) return [];

  const xml = parseXml(await presFile.async('string'));
  // <p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
  // Cross-reference with the rels file to get the slide file index
  const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (!relsFile) return [];

  const relsXml = parseXml(await relsFile.async('string'));
  const relMap = new Map<string, number>(); // rId → slide index

  for (const rel of Array.from(relsXml.querySelectorAll('Relationship'))) {
    const type   = attr(rel, 'Type');
    const rId    = attr(rel, 'Id');
    const target = attr(rel, 'Target'); // e.g. "slides/slide2.xml"
    if (type.includes('/slide') && !type.includes('Layout') && !type.includes('Master')) {
      const match = target.match(/slide(\d+)\.xml$/);
      if (match) relMap.set(rId, parseInt(match[1], 10));
    }
  }

  const sldIds = Array.from(xml.querySelectorAll('sldIdLst > sldId'));
  const order: number[] = [];
  for (const sld of sldIds) {
    const rId = sld.getAttribute('r:id') ?? sld.getAttribute('id') ?? '';
    const idx = relMap.get(rId);
    if (idx !== undefined) order.push(idx);
  }
  // Fallback: just return indices of all slide files
  if (order.length === 0) {
    const slideFiles = zip.file(/ppt\/slides\/slide\d+\.xml$/);
    for (const f of slideFiles) {
      const m = f.name.match(/slide(\d+)\.xml$/);
      if (m) order.push(parseInt(m[1], 10));
    }
  }
  return order;
}

// ─── Single slide parser ──────────────────────────────────────────────────────

async function parseSlide(
  zip: JSZip,
  slideIndex: number,
  imageAssets: Map<string, Asset>,
  rawTheme: RawTheme,
  allAssets: Asset[],
  order: number,
): Promise<Slide | null> {
  const slidePath = `ppt/slides/slide${slideIndex}.xml`;
  const slideFile = zip.file(slidePath);
  if (!slideFile) return null;

  const xml  = parseXml(await slideFile.async('string'));
  const rels = await parseSlideRels(zip, slideIndex);

  // Collect elements from all shapes
  const shapes = Array.from(xml.querySelectorAll('sp, pic, graphicFrame'));
  const elements: PresentationElement[] = [];
  for (const shape of shapes) {
    const els = shapeToElements(shape, rels, imageAssets, allAssets);
    elements.push(...els);
  }

  // Slide title (from the first heading element, or empty)
  const titleEl = elements.find((e) => e.type === 'heading') as HeadingElement | undefined;

  // Background
  const background = parseBackground(xml, rawTheme);

  // Speaker notes
  const notes = await extractNotes(zip, slideIndex);

  return {
    id:         crypto.randomUUID(),
    order,
    title:      titleEl?.content,
    notes:      notes || undefined,
    layout:     'content',
    background,
    elements,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface PptxParseProgress {
  current: number;
  total:   number;
  label:   string;
}

/**
 * Parse a .pptx File into a PPTAutomation Presentation AST.
 * @param file      The .pptx File (from <input type="file"> or drag-and-drop)
 * @param onProgress Optional callback for progress reporting
 */
export async function pptxToPresentation(
  file: File,
  onProgress?: (p: PptxParseProgress) => void,
): Promise<Presentation> {
  onProgress?.({ current: 0, total: 1, label: 'Reading file…' });

  const zip = await JSZip.loadAsync(file);

  onProgress?.({ current: 1, total: 4, label: 'Extracting theme…' });
  const rawTheme = await extractTheme(zip);
  const theme    = buildTheme(rawTheme);

  onProgress?.({ current: 2, total: 4, label: 'Extracting images…' });
  const imageAssets = await extractImages(zip);

  onProgress?.({ current: 3, total: 4, label: 'Parsing slides…' });
  const slideOrder = await getSlideOrder(zip);

  const allAssets: Asset[] = [];
  const slides: Slide[] = [];

  for (let i = 0; i < slideOrder.length; i++) {
    const slideIndex = slideOrder[i];
    onProgress?.({ current: i, total: slideOrder.length, label: `Parsing slide ${i + 1} of ${slideOrder.length}…` });
    const slide = await parseSlide(zip, slideIndex, imageAssets, rawTheme, allAssets, i);
    if (slide) slides.push(slide);
  }

  // If no slides were found (unlikely), add a blank one
  if (slides.length === 0) {
    slides.push({
      id:         crypto.randomUUID(),
      order:      0,
      title:      'Slide 1',
      layout:     'content',
      background: { type: 'none' },
      elements:   [],
    });
  }

  const now = new Date().toISOString();
  return {
    presentationId: crypto.randomUUID(),
    schemaVersion:  '1.0',
    meta: {
      title:       file.name.replace(/\.pptx$/i, '') || 'Imported Presentation',
      createdAt:   now,
      updatedAt:   now,
    },
    theme,
    settings: {
      revealjs: {
        transition:         'slide',
        transitionSpeed:    'default',
        controls:           true,
        controlsTutorial:   false,
        progress:           true,
        slideNumber:        false,
        history:            true,
        keyboard:           true,
        autoAnimate:        true,
        autoAnimateDuration: 1.0,
        autoAnimateEasing:  'ease',
        loop:               false,
        rtl:                false,
        fragments:          true,
        fragmentInURL:      false,
        autoSlide:          0,
        mouseWheel:         false,
        previewLinks:       false,
      },
      navigation: {
        mode:               'linear',
        showTableOfContents: false,
        showSlideTitle:     false,
        showBackButton:     false,
        persistState:       false,
      },
      export: {
        defaultFormat:  'html',
        embedAssets:    false,
        includeNotes:   true,
        slideWidthPx:   1920,
        slideHeightPx:  1080,
      },
    },
    slides,
    assets:    allAssets,
    variables: {},
  };
}
