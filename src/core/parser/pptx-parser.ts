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
  ShapeElement,
  TextStyle,
  ElementAnimation,
  EntranceAnimation,
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

// ─── PPTX preset geometry → ShapeElement.shape map ───────────────────────────

// rect/roundRect intentionally absent: they act as text-box containers too,
// so we only promote them to ShapeElement when they have an explicit fill.
const PRST_SHAPE_MAP: Partial<Record<string, ShapeElement['shape']>> = {
  ellipse:              'circle',
  oval:                 'circle',
  triangle:             'triangle',
  rtTriangle:           'triangle',
  line:                 'line',
  straightConnector1:   'line',
  bentConnector2:       'line',
  bentConnector3:       'line',
  rightArrow:           'arrow',
  leftArrow:            'arrow',
  upArrow:              'arrow',
  downArrow:            'arrow',
  leftRightArrow:       'arrow',
  bentArrow:            'arrow',
  circularArrow:        'arrow',
  star4:                'star',
  star5:                'star',
  star6:                'star',
  star8:                'star',
  star12:               'star',
  star16:               'star',
  hexagon:              'hexagon',
};

// rect/roundRect are only shapes when they carry visible fill
const RECT_PRST = new Set(['rect', 'roundRect']);

// ─── Colour helpers ───────────────────────────────────────────────────────────

function extractSolidColor(
  containerEl: Element | null,
  theme?: RawTheme,
): string | undefined {
  if (!containerEl) return undefined;
  const fill = containerEl.querySelector(':scope > solidFill, solidFill');
  if (!fill) return undefined;

  const srgb = fill.querySelector('srgbClr');
  if (srgb) {
    const v = srgb.getAttribute('val');
    if (v) return '#' + v;
  }
  const scheme = fill.querySelector('schemeClr');
  if (scheme && theme) {
    switch (scheme.getAttribute('val')) {
      case 'lt1': return theme.bg;      // Light 1 = background
      case 'dk1': return theme.fg;      // Dark 1  = foreground/text
      case 'lt2': return '#f1f5f9';     // Light 2 = near-white surface
      case 'dk2': return theme.accent1; // Dark 2  = secondary accent
      case 'accent1': case 'accent2': case 'accent3':
      case 'accent4': case 'accent5': case 'accent6': return theme.accent1;
    }
  }
  return undefined;
}

// ─── Slide-master default styles ─────────────────────────────────────────────

interface MasterStyles {
  titleSizePx?:  number;
  titleFont?:    string;
  titleColor?:   string;
  bodySizePx?:   number;
  bodyFont?:     string;
  bodyColor?:    string;
}

function emuSzToPx(sz: string | null): number | undefined {
  if (!sz) return undefined;
  const v = parseInt(sz, 10);
  return v > 0 ? Math.round((v / 100) * 1.333) : undefined;
}

function readDefRPr(
  container: Element | null,
  rawTheme: RawTheme,
): Pick<MasterStyles, 'titleSizePx' | 'titleFont' | 'titleColor'> {
  if (!container) return {};
  const defRPr = container.querySelector('defRPr');
  if (!defRPr) return {};
  const px = emuSzToPx(defRPr.getAttribute('sz'));
  const latin = defRPr.querySelector('latin');
  const tf = latin?.getAttribute('typeface') ?? '';
  const font = tf && !tf.startsWith('+') ? tf : undefined;
  const color = extractSolidColor(defRPr, rawTheme);
  return { titleSizePx: px, titleFont: font, titleColor: color };
}

async function extractMasterStyles(
  zip: JSZip,
  rawTheme: RawTheme,
): Promise<MasterStyles> {
  const result: MasterStyles = {};
  try {
    const masterFile = zip.file('ppt/slideMasters/slideMaster1.xml');
    if (!masterFile) return result;
    const xml = parseXml(await masterFile.async('string'));

    const titleSection = xml.querySelector('txStyles titleStyle lvl1pPr');
    const t = readDefRPr(titleSection, rawTheme);
    if (t.titleSizePx)  result.titleSizePx = t.titleSizePx;
    if (t.titleFont)    result.titleFont    = t.titleFont;
    if (t.titleColor)   result.titleColor   = t.titleColor;

    const bodySection = xml.querySelector('txStyles bodyStyle lvl1pPr');
    const b = readDefRPr(bodySection, rawTheme);
    if (b.titleSizePx)  result.bodySizePx  = b.titleSizePx;
    if (b.titleFont)    result.bodyFont     = b.titleFont;
    if (b.titleColor)   result.bodyColor    = b.titleColor;
  } catch {
    // ignore
  }
  return result;
}

// ─── Text style extraction ────────────────────────────────────────────────────

function extractTextStyle(
  txBody: Element,
  theme?: RawTheme,
  masterStyles?: MasterStyles,
  phType?: string,
): TextStyle | undefined {
  const style: TextStyle = {};

  // Alignment from first paragraph's <a:pPr algn="...">
  const pPr = txBody.querySelector('p > pPr');
  const algn = pPr?.getAttribute('algn');
  if (algn === 'ctr')       style.align = 'center';
  else if (algn === 'r')    style.align = 'right';
  else if (algn === 'just') style.align = 'justify';

  // Look for sz in multiple places (run → paragraph default → lstStyle → master)
  // 1. First explicit run: <a:r><a:rPr sz="...">
  const rPr = txBody.querySelector('r > rPr') ?? txBody.querySelector('rPr');
  // 2. Paragraph default: <a:pPr><a:defRPr sz="...">
  const defRPr = txBody.querySelector('p > pPr > defRPr');
  // 3. List style level 1: <a:lstStyle><a:lvl1pPr><a:defRPr sz="...">
  const lstRPr = txBody.querySelector('lstStyle lvl1pPr defRPr');

  const szRaw = rPr?.getAttribute('sz')
    ?? defRPr?.getAttribute('sz')
    ?? lstRPr?.getAttribute('sz');

  if (szRaw) {
    const px = emuSzToPx(szRaw);
    if (px) style.sizePx = px;
  } else if (masterStyles) {
    // Fall back to master title or body size based on placeholder type
    const isTitle = phType === 'title' || phType === 'ctrTitle' || phType === 'subTitle';
    const fallbackPx = isTitle ? masterStyles.titleSizePx : masterStyles.bodySizePx;
    if (fallbackPx) style.sizePx = fallbackPx;
  }

  // Bold / italic from first rPr found
  const anyRPr = rPr ?? defRPr ?? lstRPr;
  if (anyRPr) {
    if (anyRPr.getAttribute('b') === '1' || anyRPr.getAttribute('b') === 'true')
      style.weight = 'bold';
    if (anyRPr.getAttribute('i') === '1' || anyRPr.getAttribute('i') === 'true')
      style.italic = true;
  }

  // Font family: run → defRPr → lstRPr → master fallback
  const latinEl = rPr?.querySelector('latin')
    ?? defRPr?.querySelector('latin')
    ?? lstRPr?.querySelector('latin');
  const typeface = latinEl?.getAttribute('typeface') ?? '';
  if (typeface && !typeface.startsWith('+')) {
    style.fontFamily = typeface;
  } else if (masterStyles) {
    const isTitle = phType === 'title' || phType === 'ctrTitle' || phType === 'subTitle';
    const fallbackFont = isTitle ? masterStyles.titleFont : masterStyles.bodyFont;
    if (fallbackFont) style.fontFamily = fallbackFont;
  }

  // Text color: run → master fallback
  const runColor = extractSolidColor(rPr, theme)
    ?? extractSolidColor(defRPr, theme)
    ?? extractSolidColor(lstRPr, theme);
  if (runColor) {
    style.color = runColor;
  } else if (masterStyles) {
    const isTitle = phType === 'title' || phType === 'ctrTitle' || phType === 'subTitle';
    const fallbackColor = isTitle ? masterStyles.titleColor : masterStyles.bodyColor;
    if (fallbackColor) style.color = fallbackColor;
  }

  return Object.keys(style).length > 0 ? style : undefined;
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
    bg:          '#ffffff',  // lt1 default = white
    fg:          '#000000',  // dk1 default = black
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
      // lt1 = Light 1 = background (typically white/light)
      // dk1 = Dark 1  = foreground/text (typically dark)
      bg:      '#' + lt1,
      fg:      '#' + dk1,
      accent1: '#' + acc1,
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
      background: raw.bg,   // lt1 = the light background color
      foreground: raw.fg,   // dk1 = the dark text color
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

// ─── Rich text HTML from PPTX runs ───────────────────────────────────────────

function escT(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildRunHtml(runEl: Element): string {
  const txt = runEl.querySelector('t')?.textContent ?? '';
  if (!txt) return '';

  const rPr = runEl.querySelector('rPr');
  if (!rPr) return escT(txt);

  const styles: string[] = [];
  const sz = rPr.getAttribute('sz');
  if (sz) {
    const px = Math.round(parseInt(sz, 10) / 100 * 1.333);
    if (px > 0) styles.push(`font-size:${px}px`);
  }
  if (rPr.getAttribute('b') === '1' || rPr.getAttribute('b') === 'true')
    styles.push('font-weight:bold');
  if (rPr.getAttribute('i') === '1' || rPr.getAttribute('i') === 'true')
    styles.push('font-style:italic');
  const u = rPr.getAttribute('u');
  if (u && u !== 'none' && u !== 'sng') styles.push('text-decoration:underline');
  if (u === 'sng') styles.push('text-decoration:underline');
  if (rPr.getAttribute('strike') === 'sngStrike' || rPr.getAttribute('strike') === 'dblStrike')
    styles.push('text-decoration:line-through');

  const latin = rPr.querySelector('latin');
  const tf = latin?.getAttribute('typeface') ?? '';
  if (tf && !tf.startsWith('+')) styles.push(`font-family:'${tf}',system-ui,sans-serif`);

  const srgb = rPr.querySelector('solidFill srgbClr');
  const color = srgb?.getAttribute('val');
  if (color) styles.push(`color:#${color}`);

  if (styles.length === 0) return escT(txt);
  return `<span style="${styles.join(';')}">${escT(txt)}</span>`;
}

function buildParaHtml(paraEl: Element): string {
  return Array.from(paraEl.querySelectorAll('r')).map(buildRunHtml).join('');
}

/** Returns the paragraph content as HTML. Returns null if completely empty. */
function buildRichContent(
  txBody: Element,
): { content: string; contentFormat: 'plain' | 'html' } {
  const paras = Array.from(txBody.querySelectorAll('p'));
  const richParas = paras.map(buildParaHtml).filter(Boolean);
  if (richParas.length === 0) return { content: '', contentFormat: 'plain' };

  // Check if any run carries inline styling
  const hasRich = richParas.some((p) => p.includes('<span'));

  if (!hasRich && richParas.length === 1)
    return { content: richParas[0], contentFormat: 'plain' };

  const html = richParas.length === 1
    ? richParas[0]
    : richParas.map((p) => `<p style="margin:0">${p}</p>`).join('');
  return { content: html, contentFormat: 'html' };
}

// ─── Flatten grouped shapes ───────────────────────────────────────────────────

/**
 * Returns all concrete shapes (sp, pic, graphicFrame) inside a group,
 * with their group-offset applied so positions are slide-relative.
 *
 * A group (<p:grpSp>) has its own <p:grpSpPr><a:xfrm> that maps the group's
 * child coordinate space onto the slide. We apply that offset to each child.
 */
function flattenGroup(grpSp: Element, dims: SlideDims): Element[] {
  // Read the group transform — maps child coords to slide coords
  const grpXfrm = grpSp.querySelector(':scope > grpSpPr > xfrm');
  const grpOff  = grpXfrm?.querySelector('off');
  const grpExt  = grpXfrm?.querySelector('ext');
  const chOff   = grpXfrm?.querySelector('chOff');
  const chExt   = grpXfrm?.querySelector('chExt');

  // Group origin and size on the slide
  const gx = parseInt(grpOff?.getAttribute('x')  ?? '0', 10);
  const gy = parseInt(grpOff?.getAttribute('y')  ?? '0', 10);
  const gw = parseInt(grpExt?.getAttribute('cx') ?? '0', 10);
  const gh = parseInt(grpExt?.getAttribute('cy') ?? '0', 10);
  // Child coordinate origin and scale
  const cx0 = parseInt(chOff?.getAttribute('x')  ?? '0', 10);
  const cy0 = parseInt(chOff?.getAttribute('y')  ?? '0', 10);
  const cw  = parseInt(chExt?.getAttribute('cx') ?? '1', 10) || 1;
  const ch  = parseInt(chExt?.getAttribute('cy') ?? '1', 10) || 1;

  const scaleX = gw / cw;
  const scaleY = gh / ch;

  // Proxy: wrap each child shape in a fake element that has its xfrm adjusted
  const results: Element[] = [];

  const directChildren = Array.from(grpSp.children);
  for (const child of directChildren) {
    const tag = child.localName;
    if (tag === 'grpSp') {
      // Nested group — recurse
      results.push(...flattenGroup(child, dims));
      continue;
    }
    if (tag !== 'sp' && tag !== 'pic' && tag !== 'graphicFrame') continue;

    // Read child's own xfrm
    const childXfrm = child.querySelector('spPr > xfrm') ?? child.querySelector('xfrm');
    if (!childXfrm) {
      results.push(child);
      continue;
    }
    const cOff = childXfrm.querySelector('off');
    const cExt = childXfrm.querySelector('ext');
    if (!cOff || !cExt) { results.push(child); continue; }

    const childX = parseInt(cOff.getAttribute('x') ?? '0', 10);
    const childY = parseInt(cOff.getAttribute('y') ?? '0', 10);
    const childW = parseInt(cExt.getAttribute('cx') ?? '0', 10);
    const childH = parseInt(cExt.getAttribute('cy') ?? '0', 10);

    // Transform to slide coordinates
    const slideX = gx + (childX - cx0) * scaleX;
    const slideY = gy + (childY - cy0) * scaleY;
    const slideW = childW * scaleX;
    const slideH = childH * scaleY;

    // Clone the child and patch its xfrm values
    const clone = child.cloneNode(true) as Element;
    const cloneXfrm = clone.querySelector('spPr > xfrm') ?? clone.querySelector('xfrm');
    if (cloneXfrm) {
      cloneXfrm.querySelector('off')?.setAttribute('x', String(Math.round(slideX)));
      cloneXfrm.querySelector('off')?.setAttribute('y', String(Math.round(slideY)));
      cloneXfrm.querySelector('ext')?.setAttribute('cx', String(Math.round(slideW)));
      cloneXfrm.querySelector('ext')?.setAttribute('cy', String(Math.round(slideH)));
    }
    results.push(clone);
  }
  return results;
}

// ─── Shape → AST elements ─────────────────────────────────────────────────────

function shapeToElements(
  shapeEl: Element,
  rels: SlideRels,
  imageAssets: Map<string, Asset>,
  allAssets: Asset[],
  dims: SlideDims,
  zIndex: number,
  rawTheme?: RawTheme,
  masterStyles?: MasterStyles,
): PresentationElement[] {
  const elements: PresentationElement[] = [];
  const position = extractPosition(shapeEl, dims, zIndex);

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
        position,
      } as ImageElement);
    }
    return elements;
  }

  // ── Geometric shape (circle, arrow, star, …) — skip placeholders ─────────
  // Placeholder shapes (<p:ph>) are content containers (title, body, etc.),
  // not decorative shapes, so we skip shape detection for them.
  const isPlaceholder = !!shapeEl.querySelector('ph');
  const spPr    = shapeEl.querySelector('spPr');
  const prstGeom = spPr?.querySelector('prstGeom');

  if (prstGeom && !isPlaceholder) {
    const prst   = prstGeom.getAttribute('prst') ?? '';
    const mapped = PRST_SHAPE_MAP[prst];

    // For rect/roundRect: only create a ShapeElement when there's a visible fill.
    // Otherwise treat as a text-box container and fall through to text handling.
    const spFill   = extractSolidColor(spPr, rawTheme);
    const isRectLike = RECT_PRST.has(prst);
    const hasNoFill  = !!spPr?.querySelector(':scope > noFill') || !!spPr?.querySelector('noFill');
    const isVisualFill = !hasNoFill && !!spFill;

    const shouldBeShape = mapped && (!isRectLike || isVisualFill);

    if (shouldBeShape) {
      const lnEl   = spPr?.querySelector('ln') ?? null;
      const stroke  = extractSolidColor(lnEl, rawTheme);
      const lnW     = parseInt(lnEl?.getAttribute('w') ?? '0', 10);
      const strokeWidth = lnW > 0 ? Math.max(1, Math.round(lnW / 9525)) : undefined;

      const txBody = shapeEl.querySelector('txBody');
      const label  = txBody
        ? Array.from(txBody.querySelectorAll('t')).map((t) => t.textContent ?? '').join('').trim() || undefined
        : undefined;

      // For rect/roundRect without a dedicated map entry, use 'rectangle'
      const shapeType = mapped ?? (RECT_PRST.has(prst) ? 'rectangle' : undefined);
      if (shapeType) {
        elements.push({
          id:          crypto.randomUUID(),
          type:        'shape',
          shape:       shapeType,
          fill:        spFill ?? 'transparent',
          stroke,
          strokeWidth,
          label,
          position,
        } as ShapeElement);
        return elements;
      }
    }
    // rect/roundRect without fill → fall through to text handling below
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
        position,
      } as TableElement);
    }
    return elements;
  }

  // ── Text box / placeholder ───────────────────────────────────────────────
  const txBody = shapeEl.querySelector('txBody');
  if (!txBody) return elements;

  const paras = Array.from(txBody.querySelectorAll('p')).map(parseParagraph);
  if (paras.length === 0 || paras.every((p) => !p.text.trim())) return elements;

  // Placeholder type drives heading detection and master-style fallback
  const phType = shapeEl.querySelector('ph')?.getAttribute('type') ?? '';
  const isTitle = phType === 'title' || phType === 'ctrTitle';

  const textStyleResult = extractTextStyle(txBody, rawTheme, masterStyles, phType);
  const elStyle = textStyleResult ? { text: textStyleResult } : undefined;

  // Rich HTML content (preserves per-run bold/italic/color/size)
  const rich = buildRichContent(txBody);

  if (isTitle) {
    const headingText = paras.map((p) => p.text).join(' ').trim();
    if (headingText) {
      elements.push({
        id:       crypto.randomUUID(),
        type:     'heading',
        level:    1,
        content:  rich.content || headingText,
        position,
        style:    elStyle,
      } as HeadingElement);
    }
    return elements;
  }

  const hasBullets = paras.some((p) => p.isBullet);

  if (hasBullets || paras.length > 1) {
    // Build per-paragraph rich items
    const paraEls = Array.from(txBody.querySelectorAll('p'));
    const items: BulletItem[] = paras
      .map((p, i) => {
        if (!p.text.trim()) return null;
        const paraHtml = buildParaHtml(paraEls[i]);
        const hasRich  = paraHtml.includes('<span');
        return {
          id:            crypto.randomUUID(),
          content:       hasRich ? paraHtml : p.text,
          contentFormat: (hasRich ? 'html' : 'plain') as 'html' | 'plain',
          level:         p.level,
        };
      })
      .filter(Boolean) as BulletItem[];

    if (items.length > 0) {
      elements.push({
        id:       crypto.randomUUID(),
        type:     'bullet-list',
        ordered:  false,
        items,
        position,
        style:    elStyle,
      } as BulletListElement);
    }
  } else {
    const singleText = paras[0].text.trim();
    if (singleText) {
      elements.push({
        id:            crypto.randomUUID(),
        type:          'text',
        content:       rich.content || singleText,
        contentFormat: rich.contentFormat,
        position,
        style:         elStyle,
      } as TextElement);
    }
  }

  return elements;
}

// ─── Slide background colour ──────────────────────────────────────────────────

function resolveSchemeColor(name: string, theme: RawTheme): string | undefined {
  switch (name) {
    case 'lt1': return theme.bg;      // Light 1 = background
    case 'dk1': return theme.fg;      // Dark 1  = foreground
    case 'lt2': return '#f1f5f9';
    case 'dk2': return theme.accent1;
    case 'accent1': case 'accent2': case 'accent3':
    case 'accent4': case 'accent5': case 'accent6': return theme.accent1;
  }
  return undefined;
}

function parseBackground(
  slideXml: Document,
  theme: RawTheme,
  imageAssets?: Map<string, Asset>,
  rels?: SlideRels,
  allAssets?: Asset[],
): Slide['background'] {
  const bg = slideXml.querySelector('bg');
  if (!bg) return { type: 'color', color: theme.bg }; // no explicit bg → use theme background

  // Background image: <p:bgPr><a:blipFill>
  const blipFill = bg.querySelector('bgPr blipFill');
  if (blipFill && imageAssets && rels) {
    const rId = blipFill.querySelector('blip')?.getAttribute('r:embed')
             ?? blipFill.querySelector('blip')?.getAttribute('embed') ?? '';
    const imgPath = rels.images.get(rId);
    const asset   = imgPath ? imageAssets.get(imgPath) : undefined;
    if (asset) {
      allAssets?.push(asset);
      return {
        type:  'image',
        image: {
          assetId:  asset.id,
          size:     'cover',
          position: 'center center',
        },
      };
    }
  }

  // Explicit solid fill with a direct hex color
  const srgb = bg.querySelector('solidFill srgbClr');
  if (srgb) {
    const val = srgb.getAttribute('val');
    if (val) return { type: 'color', color: '#' + val };
  }

  // Solid fill with a scheme color reference
  const schemeClr = bg.querySelector('solidFill schemeClr');
  if (schemeClr) {
    const resolved = resolveSchemeColor(schemeClr.getAttribute('val') ?? '', theme);
    if (resolved) return { type: 'color', color: resolved };
  }

  // <p:bgRef> — theme background preset reference with optional color override
  // idx 1001+ = subtle, 1013+ = moderate, 1025+ = intense backgrounds
  // The child schemeClr overrides the tint/shade of that preset
  const bgRef = bg.querySelector('bgRef');
  if (bgRef) {
    const refScheme = bgRef.querySelector('schemeClr');
    if (refScheme) {
      const resolved = resolveSchemeColor(refScheme.getAttribute('val') ?? '', theme);
      if (resolved) return { type: 'color', color: resolved };
    }
    const refSrgb = bgRef.querySelector('srgbClr');
    if (refSrgb) {
      const v = refSrgb.getAttribute('val');
      if (v) return { type: 'color', color: '#' + v };
    }
    // idx 1000 = no background fill (transparent/default)
    const idx = parseInt(bgRef.getAttribute('idx') ?? '1001', 10);
    if (idx <= 1000) return { type: 'none' };
    // Any other bgRef → use theme background
    return { type: 'color', color: theme.bg };
  }

  // <p:bgPr><a:noFill> — explicitly no fill
  if (bg.querySelector('noFill')) return { type: 'none' };

  // Fallback: use theme background color
  return { type: 'color', color: theme.bg };
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

// ─── Animation parsing ───────────────────────────────────────────────────────
// Maps PPTX <p:timing> to Map<spId, ElementAnimation>
//
// PPTX timing structure:
//   timing > tnLst > par > cTn > childTnLst
//     > seq[nodeType="mainSeq"] > childTnLst
//       > par  (one per click / auto group)
//         > … > cTn[presetClass, presetID, nodeType]
//                 > … > spTgt[spId]

// presetID → entrance effect (OOXML preset values)
const PRESET_ENTRANCE: Partial<Record<number, EntranceAnimation['effect']>> = {
  1:  'none',        // Appear
  2:  'slide-up',    // Fly In (direction overridden by subtype below)
  3:  'slide-up',    // Float In
  4:  'fade',        // Split
  5:  'fade',        // Wipe
  10: 'fade',        // Fade
  11: 'zoom',        // Swivel → zoom
  12: 'bounce',      // Bounce
  13: 'zoom',        // Zoom
  22: 'zoom',        // Grow and Turn
  24: 'flip-x',      // Flip
  27: 'slide-up',    // Rise Up
};

// Fly In presetSubtype → direction
const FLY_SUBTYPE: Partial<Record<number, EntranceAnimation['effect']>> = {
  0:  'slide-up',    // from bottom
  4:  'slide-right', // from left
  8:  'slide-left',  // from right
  16: 'slide-down',  // from top
  6:  'slide-left',  // from bottom-right
  10: 'slide-left',  // from top-right
  12: 'slide-right', // from bottom-left
  20: 'slide-right', // from top-left
};

// animEffect filter attribute → effect
const FILTER_MAP: Record<string, EntranceAnimation['effect']> = {
  fade:   'fade',
  box:    'zoom',
  zoom:   'zoom',
  fly:    'slide-up',
  wipe:   'fade',
};

function parseAnimations(slideXml: Document): Map<number, ElementAnimation> {
  const result = new Map<number, ElementAnimation>();
  const timing = slideXml.querySelector('timing');
  if (!timing) return result;

  // Find the mainSeq node which holds the ordered click groups
  const mainSeq = timing.querySelector('seq > cTn[nodeType="mainSeq"], tnLst > par > cTn > childTnLst > seq > cTn');
  const clickGroups = mainSeq
    ? Array.from(mainSeq.querySelectorAll('childTnLst > par'))
    : Array.from(timing.querySelectorAll('par'));

  let fragIdx = 0;

  for (const group of clickGroups) {
    // Each group is one "click trigger" that may animate several shapes
    const effectNodes = Array.from(group.querySelectorAll('cTn[presetClass]'));
    let groupUsedFragment = false;

    for (const cTn of effectNodes) {
      const presetClass = cTn.getAttribute('presetClass') ?? '';
      const presetID    = parseInt(cTn.getAttribute('presetID') ?? '0', 10);
      const subtype     = parseInt(cTn.getAttribute('presetSubtype') ?? '0', 10);
      const nodeType    = cTn.getAttribute('nodeType') ?? '';

      // Target shape
      const spTgt = cTn.querySelector('spTgt');
      if (!spTgt) continue;
      const spId = parseInt(spTgt.getAttribute('spId') ?? '0', 10);
      if (!spId) continue;

      // Duration: look inside immediate childTnLst for a cTn with dur
      const innerCTn  = cTn.querySelector('childTnLst > par > cTn, childTnLst > set > cBhvr > cTn');
      const animEffect = cTn.querySelector('animEffect');
      const rawDur    = innerCTn?.getAttribute('dur') ?? cTn.getAttribute('dur') ?? '500';
      const durationMs = rawDur === 'indefinite' ? 500 : Math.max(100, parseInt(rawDur, 10));

      // click-effect → fragment; withEffect/afterEffect/auto → auto
      const isClick = nodeType === 'clickEffect';
      const trigger: EntranceAnimation['trigger'] = isClick ? 'fragment' : 'auto';

      if (presetClass === 'entr') {
        let effect: EntranceAnimation['effect'];

        if (presetID === 1) {
          effect = 'none'; // Appear — instant visibility, no visual motion
        } else if (presetID === 2) {
          effect = FLY_SUBTYPE[subtype] ?? 'slide-up'; // Fly In
        } else {
          // Try animEffect filter first (most reliable)
          const filter = (animEffect?.getAttribute('filter') ?? '').toLowerCase().split('(')[0];
          effect = FILTER_MAP[filter] ?? PRESET_ENTRANCE[presetID] ?? 'fade';
        }

        if (isClick) groupUsedFragment = true;

        const entrance: EntranceAnimation = {
          effect,
          durationMs,
          delayMs: 0,
          easing: 'ease',
          trigger,
          ...(isClick ? { fragmentIndex: fragIdx } : {}),
        };

        const existing = result.get(spId);
        result.set(spId, { ...existing, entrance });
      }
      // exit and emphasis could be added here in the future
    }

    if (groupUsedFragment) fragIdx++;
  }

  return result;
}

// ─── Slide dimensions ─────────────────────────────────────────────────────────

interface SlideDims {
  w: number; // EMUs
  h: number;
}

async function getSlideDimensions(zip: JSZip): Promise<SlideDims> {
  const defaults: SlideDims = { w: 9144000, h: 5143500 }; // 16:9 widescreen
  try {
    const presFile = zip.file('ppt/presentation.xml');
    if (!presFile) return defaults;
    const xml   = parseXml(await presFile.async('string'));
    const sldSz = xml.querySelector('sldSz');
    if (!sldSz) return defaults;
    return {
      w: parseInt(sldSz.getAttribute('cx') ?? '9144000', 10) || defaults.w,
      h: parseInt(sldSz.getAttribute('cy') ?? '5143500', 10) || defaults.h,
    };
  } catch {
    return defaults;
  }
}

// ─── Absolute position from <a:xfrm> ─────────────────────────────────────────

function extractPosition(
  shapeEl: Element,
  dims: SlideDims,
  zIndex: number,
): PresentationElement['position'] {
  // <p:spPr><a:xfrm><a:off x="…" y="…"/><a:ext cx="…" cy="…"/></a:xfrm>
  const xfrm = shapeEl.querySelector('spPr > xfrm')
            ?? shapeEl.querySelector('xfrm');
  if (!xfrm) return { mode: 'flow' };

  const off = xfrm.querySelector('off');
  const ext = xfrm.querySelector('ext');
  if (!off || !ext) return { mode: 'flow' };

  const x  = parseInt(off.getAttribute('x')  ?? '0', 10);
  const y  = parseInt(off.getAttribute('y')  ?? '0', 10);
  const cx = parseInt(ext.getAttribute('cx') ?? '0', 10);
  const cy = parseInt(ext.getAttribute('cy') ?? '0', 10);

  if (cx <= 0 || cy <= 0) return { mode: 'flow' };

  // OOXML rotation is in 100,000ths of a degree, clockwise
  const rotRaw = parseInt(xfrm.getAttribute('rot') ?? '0', 10);
  const rotate = rotRaw !== 0 ? rotRaw / 100000 : undefined;

  return {
    mode:   'absolute',
    x:      Math.max(0, (x  / dims.w) * 100),
    y:      Math.max(0, (y  / dims.h) * 100),
    width:  Math.min(100, (cx / dims.w) * 100),
    height: Math.min(100, (cy / dims.h) * 100),
    zIndex,
    ...(rotate != null ? { rotate } : {}),
  };
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
  dims: SlideDims,
  masterStyles: MasterStyles,
): Promise<Slide | null> {
  const slidePath = `ppt/slides/slide${slideIndex}.xml`;
  const slideFile = zip.file(slidePath);
  if (!slideFile) return null;

  const xml  = parseXml(await slideFile.async('string'));
  const rels = await parseSlideRels(zip, slideIndex);

  // Parse animations before processing shapes so we can attach them
  const animMap = parseAnimations(xml);

  // Collect shapes: direct sp/pic/graphicFrame + shapes inside <p:grpSp> groups
  const directShapes = Array.from(xml.querySelectorAll(
    'spTree > sp, spTree > pic, spTree > graphicFrame',
  ));
  const groupShapes: Element[] = [];
  for (const grp of Array.from(xml.querySelectorAll('spTree > grpSp'))) {
    groupShapes.push(...flattenGroup(grp, dims));
  }
  const allShapes = [...directShapes, ...groupShapes];

  const elements: PresentationElement[] = [];
  for (let zi = 0; zi < allShapes.length; zi++) {
    const shape = allShapes[zi];
    const spId = parseInt(shape.querySelector('cNvPr')?.getAttribute('id') ?? '0', 10);
    const els  = shapeToElements(shape, rels, imageAssets, allAssets, dims, zi, rawTheme, masterStyles);

    const anim = spId ? animMap.get(spId) : undefined;
    if (anim) {
      for (const el of els) el.animation = anim;
    }

    elements.push(...els);
  }

  // Slide title (from the first heading element, or empty)
  const titleEl = elements.find((e) => e.type === 'heading') as HeadingElement | undefined;

  // Background — pass rels + imageAssets so image backgrounds can be extracted
  const background = parseBackground(xml, rawTheme, imageAssets, rels, allAssets);

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
  const [slideOrder, dims, masterStyles] = await Promise.all([
    getSlideOrder(zip),
    getSlideDimensions(zip),
    extractMasterStyles(zip, rawTheme),
  ]);

  const allAssets: Asset[] = [];
  const slides: Slide[] = [];

  for (let i = 0; i < slideOrder.length; i++) {
    const slideIndex = slideOrder[i];
    onProgress?.({ current: i, total: slideOrder.length, label: `Parsing slide ${i + 1} of ${slideOrder.length}…` });
    const slide = await parseSlide(zip, slideIndex, imageAssets, rawTheme, allAssets, i, dims, masterStyles);
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
