/**
 * element-renderers.ts
 *
 * Pure functions: Element → HTML string.
 * No DOM, no React. Output is always a valid HTML fragment.
 *
 * Dispatch table at the bottom: renderElement(el, ctx) routes to the
 * correct renderer by el.type.
 */

import type {
  Element,
  TextElement,
  HeadingElement,
  BulletListElement,
  ImageElement,
  VideoElement,
  AudioElement,
  EmbedElement,
  CodeElement,
  DiagramElement,
  TableElement,
  CalloutElement,
  ButtonElement,
  DividerElement,
  IconElement,
  QuizElement,
  WhiteboardElement,
  ChartElement,
  ShapeElement,
  Asset,
  ElementStyle,
} from '../schema.ts';

import { escapeHtml, escapeHtmlPreserveBreaks, classes } from './utils.ts';
import { resolveAnimationAttrs, bulletFragmentAttrs } from './animation-attrs.ts';
import { CALLOUT_ICONS } from './theme-css.ts';

// ─── RENDER CONTEXT ──────────────────────────────────────────

export interface RenderContext {
  /** All assets from the presentation (for URL resolution). */
  assetMap: Map<string, Asset>;
  /** When true, assets are embedded as base64 data URIs. */
  embedAssets: boolean;
}

export function buildRenderContext(
  assets: Asset[],
  embedAssets = false,
): RenderContext {
  return {
    assetMap: new Map(assets.map((a) => [a.id, a])),
    embedAssets,
  };
}

// ─── DISPATCHER ──────────────────────────────────────────────

export function renderElement(el: Element, ctx: RenderContext): string {
  const { classNames, attrString } = resolveAnimationAttrs(el.animation);
  const html = renderElementInner(el, ctx);
  if (!html) return '';

  const inner = classNames
    ? `<div class="${classNames}"${attrString}>${html}</div>`
    : html;

  // Absolute-positioned elements: wrap in a positioned overlay div.
  // Coordinates are percentages of the slide canvas (same units as the editor).
  if (el.position.mode === 'absolute') {
    const { x = 0, y = 0, width, height, zIndex = 1 } = el.position;
    const style = [
      'position:absolute',
      `left:${x.toFixed(3)}%`,
      `top:${y.toFixed(3)}%`,
      width  != null ? `width:${width.toFixed(3)}%`   : 'width:auto',
      height != null ? `height:${height.toFixed(3)}%` : '',
      `z-index:${zIndex}`,
      'overflow:visible',
      'pointer-events:auto',
    ].filter(Boolean).join(';');
    return `<div class="ppt-abs-el" style="${style}">${inner}</div>`;
  }

  return inner;
}

function renderElementInner(el: Element, ctx: RenderContext): string {
  switch (el.type) {
    case 'text':        return renderText(el);
    case 'heading':     return renderHeading(el);
    case 'bullet-list': return renderBulletList(el);
    case 'image':       return renderImage(el, ctx);
    case 'video':       return renderVideo(el, ctx);
    case 'audio':       return renderAudio(el, ctx);
    case 'embed':       return renderEmbed(el);
    case 'code':        return renderCode(el);
    case 'diagram':     return renderDiagram(el);
    case 'table':       return renderTable(el);
    case 'callout':     return renderCallout(el);
    case 'button':      return renderButton(el);
    case 'divider':     return renderDivider(el);
    case 'icon':        return renderIcon(el);
    case 'quiz':        return renderQuiz(el);
    case 'whiteboard':  return renderWhiteboard(el as WhiteboardElement);
    case 'chart':       return renderChart(el as ChartElement);
    case 'shape':       return renderShape(el as ShapeElement);
    // Flowchart, timeline — placeholders for now
    case 'flowchart':   return `<div class="ppt-flowchart-placeholder" data-id="${el.id}">[Flowchart: rendered by React Flow]</div>`;
    case 'timeline':    return `<div class="ppt-timeline-placeholder" data-id="${el.id}">[Timeline]</div>`;
    default:            return '';
  }
}

// ─── TEXT STYLE HELPER ───────────────────────────────────────

function buildTextStyleAttr(style?: ElementStyle): string {
  const ts = style?.text;
  if (!ts) return '';
  const parts: string[] = [];
  if (ts.fontFamily) parts.push(`font-family: '${ts.fontFamily}', system-ui, sans-serif`);
  if (ts.sizePx)     parts.push(`font-size: ${ts.sizePx}px`);
  if (ts.color)      parts.push(`color: ${ts.color}`);
  if (ts.highlight)  parts.push(`background-color: ${ts.highlight}; border-radius: 3px; padding: 0 4px`);
  if (ts.weight) {
    const wmap: Record<string, string> = { normal: '400', medium: '500', semibold: '600', bold: '700' };
    parts.push(`font-weight: ${wmap[ts.weight] ?? ts.weight}`);
  }
  if (ts.italic)       parts.push('font-style: italic');
  if (ts.decoration && ts.decoration !== 'none') parts.push(`text-decoration: ${ts.decoration}`);
  if (ts.align)        parts.push(`text-align: ${ts.align}`);
  if (ts.lineHeight)   parts.push(`line-height: ${ts.lineHeight}`);
  if (ts.letterSpacing) parts.push(`letter-spacing: ${ts.letterSpacing}px`);
  if (ts.transform && ts.transform !== 'none') parts.push(`text-transform: ${ts.transform}`);
  return parts.length ? ` style="${parts.join('; ')}"` : '';
}

// ─── TEXT ────────────────────────────────────────────────────

function renderText(el: TextElement): string {
  const text =
    typeof el.content === 'string'
      ? escapeHtmlPreserveBreaks(el.content)
      : JSON.stringify(el.content); // ProseMirror JSON — serialiser TBD
  const styleAttr = buildTextStyleAttr(el.style);
  return `<p${styleAttr}>${text}</p>`;
}

// ─── HEADING ─────────────────────────────────────────────────

function renderHeading(el: HeadingElement): string {
  const tag = `h${el.level}`;
  const styleAttr = buildTextStyleAttr(el.style);
  return `<${tag}${styleAttr}>${escapeHtml(el.content)}</${tag}>`;
}

// ─── BULLET LIST ─────────────────────────────────────────────

function renderBulletList(el: BulletListElement): string {
  const tag = el.ordered ? 'ol' : 'ul';
  const items = el.items
    .map((item, i) => {
      const fragmentAttr = item.animation?.entrance?.trigger === 'fragment'
        ? bulletFragmentAttrs(
            item.animation.entrance.fragmentIndex ?? i,
            item.animation.entrance.effect === 'none' ? 'fade-in' : `fade-${item.animation.entrance.effect.replace('slide-', '')}`,
          )
        : '';
      return `<li class="level-${item.level}"${fragmentAttr}>${escapeHtml(item.content)}</li>`;
    })
    .join('\n');
  return `<${tag}>\n${items}\n</${tag}>`;
}

// ─── IMAGE ───────────────────────────────────────────────────

function renderImage(el: ImageElement, ctx: RenderContext): string {
  const src = resolveAssetUrl(el.assetId, ctx);
  const isAbs = el.position.mode === 'absolute';
  // In absolute mode the ppt-abs-el wrapper provides the size; the img must
  // fill it completely.  In flow mode use natural/max sizing.
  const imgStyle = isAbs
    ? `width:100%;height:100%;object-fit:${el.fit ?? 'contain'};display:block;`
    : `object-fit:${el.fit ?? 'contain'};`;
  const img = `<img class="ppt-image" src="${escapeHtml(src)}" alt="${escapeHtml(el.alt)}" style="${imgStyle}">`;
  const caption = el.caption
    ? `<p class="ppt-image-caption">${escapeHtml(el.caption)}</p>`
    : '';
  return `<figure>${img}${caption}</figure>`;
}

// ─── VIDEO ───────────────────────────────────────────────────

function renderVideo(el: VideoElement, ctx: RenderContext): string {
  const isAbs = el.position.mode === 'absolute';
  const fillStyle = isAbs ? 'width:100%;height:100%;' : '';

  // External embed (YouTube, Vimeo) → iframe
  if (el.url && (el.url.includes('youtube.com') || el.url.includes('vimeo.com'))) {
    const iframeSrc = escapeHtml(el.url);
    const caption = el.caption
      ? `<p class="ppt-image-caption">${escapeHtml(el.caption)}</p>`
      : '';
    return `<figure>
  <iframe class="ppt-video-embed" src="${iframeSrc}" allowfullscreen loading="lazy" style="${fillStyle}"></iframe>
  ${caption}
</figure>`;
  }

  // Local/direct video → <video>
  const src = el.assetId
    ? resolveAssetUrl(el.assetId, ctx)
    : (el.url ?? '');

  const autoplay = el.autoplay ? ' autoplay' : '';
  const loop     = el.loop     ? ' loop'     : '';
  const muted    = el.muted    ? ' muted'    : '';
  const controls = el.controls ? ' controls' : '';
  const poster   = el.posterAssetId
    ? ` poster="${escapeHtml(resolveAssetUrl(el.posterAssetId, ctx))}"`
    : '';

  const caption = el.caption
    ? `<p class="ppt-image-caption">${escapeHtml(el.caption)}</p>`
    : '';

  return `<figure>
  <video class="ppt-video"${autoplay}${loop}${muted}${controls}${poster} preload="metadata" style="${fillStyle}">
    <source src="${escapeHtml(src)}">
  </video>
  ${caption}
</figure>`;
}

// ─── AUDIO ───────────────────────────────────────────────────

function renderAudio(el: AudioElement, ctx: RenderContext): string {
  const src = el.assetId
    ? resolveAssetUrl(el.assetId, ctx)
    : (el.url ?? '');

  const autoplay = el.autoplay ? ' autoplay' : '';
  const loop     = el.loop     ? ' loop'     : '';
  const controls = el.controls ? ' controls' : '';

  return `<audio${autoplay}${loop}${controls} style="width:100%">
  <source src="${escapeHtml(src)}">
</audio>`;
}

// ─── EMBED ───────────────────────────────────────────────────

// Encode HTML content for use in the srcdoc attribute.
// The browser HTML-decodes attribute values, so we must encode & and " only.
function encodeSrcdoc(html: string): string {
  return html.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const HTML_EMBED_ALLOW =
  'accelerometer; camera; encrypted-media; fullscreen; gyroscope; ' +
  'magnetometer; microphone; midi; payment; usb; vr; web-share; ' +
  'xr-spatial-tracking; autoplay';

function renderEmbed(el: EmbedElement): string {
  if (el.embedType === 'iframe' && el.url) {
    return `<iframe class="ppt-embed-frame" src="${escapeHtml(el.url)}" allow="${HTML_EMBED_ALLOW}" allowfullscreen ${el.allowInteraction ? '' : 'sandbox="allow-scripts"'} loading="lazy"></iframe>`;
  }
  if (el.embedType === 'pdf' && el.url) {
    return `<iframe class="ppt-embed-frame" src="${escapeHtml(el.url)}#view=FitH" loading="lazy"></iframe>`;
  }
  if (el.embedType === 'html' && el.htmlContent) {
    // Run HTML file content inside a sandboxed srcdoc iframe.
    // allow-scripts enables JavaScript (Three.js, Babylon.js, WebGL, etc.)
    // allow-same-origin lets the frame access its own storage / resources.
    const srcdoc = encodeSrcdoc(el.htmlContent);
    return `<iframe class="ppt-embed-frame" srcdoc="${srcdoc}" sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups" allow="${HTML_EMBED_ALLOW}" allowfullscreen></iframe>`;
  }
  return '';
}

// ─── CODE ────────────────────────────────────────────────────

function renderCode(el: CodeElement): string {
  const lang = el.language ? ` class="language-${escapeHtml(el.language)}"` : '';
  const filename = el.filename
    ? `<div class="ppt-code-filename">${escapeHtml(el.filename)}</div>`
    : '';
  const copy = el.showCopyButton
    ? `<button class="ppt-code-copy" onclick="navigator.clipboard.writeText(this.closest('figure').querySelector('code').innerText)">Copy</button>`
    : '';
  return `<figure class="ppt-code-block">
  ${filename}
  <pre><code${lang}>${escapeHtml(el.code)}</code></pre>
  ${copy}
</figure>`;
}

// ─── DIAGRAM (Mermaid) ────────────────────────────────────────

function renderDiagram(el: DiagramElement): string {
  const animAttr  = el.animated  ? ' data-diagram-animated="true"' : '';
  const typeAttr  = ` data-diagram-type="${escapeHtml(el.diagramType)}"`;
  const themeAttr = el.theme ? ` data-diagram-theme="${escapeHtml(el.theme)}"` : '';
  const maxH      = el.maxHeightPct ?? 60;
  const styleAttr = ` style="--ppt-diagram-max-h: ${maxH}vh"`;
  const source = el.theme
    ? `%%{init: {'theme': '${el.theme}'}}%%\n${el.source}`
    : el.source;
  return `<div class="ppt-diagram"${animAttr}${typeAttr}${themeAttr}${styleAttr}>
  <pre class="mermaid">${escapeHtml(source)}</pre>
</div>`;
}

// ─── TABLE ───────────────────────────────────────────────────

function renderTable(el: TableElement): string {
  const thead = el.headers.length
    ? `<thead><tr>${el.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
    : '';

  const tbody = el.rows.length
    ? `<tbody>${el.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
        .join('\n')}</tbody>`
    : '';

  const caption = el.caption
    ? `<caption>${escapeHtml(el.caption)}</caption>`
    : '';

  return `<table>${caption}${thead}${tbody}</table>`;
}

// ─── CALLOUT ─────────────────────────────────────────────────

function renderCallout(el: CalloutElement): string {
  const icon = el.icon ?? CALLOUT_ICONS[el.variant] ?? 'ℹ️';
  const title = el.title
    ? `<div class="ppt-callout-title">${escapeHtml(el.title)}</div>`
    : '';
  return `<div class="ppt-callout ppt-callout--${el.variant}">
  <span class="ppt-callout-icon" aria-hidden="true">${icon}</span>
  <div class="ppt-callout-body">
    ${title}
    <div>${escapeHtmlPreserveBreaks(el.content)}</div>
  </div>
</div>`;
}

// ─── BUTTON ──────────────────────────────────────────────────

function renderButton(el: ButtonElement): string {
  const icon = el.icon ? `<span class="ppt-btn-icon">${escapeHtml(el.icon)}</span> ` : '';
  const actionData = JSON.stringify(el.action);
  return `<button
  class="ppt-btn ppt-btn--${el.variant} ppt-btn--${el.size}"
  data-action='${escapeHtml(actionData)}'
  onclick="window.__pptAction && window.__pptAction(JSON.parse(this.dataset.action))"
>${icon}${escapeHtml(el.label)}</button>`;
}

// ─── DIVIDER ─────────────────────────────────────────────────

function renderDivider(el: DividerElement): string {
  return `<hr class="ppt-divider">`;
}

// ─── ICON ────────────────────────────────────────────────────

function renderIcon(el: IconElement): string {
  const style = el.color ? ` style="color:${escapeHtml(el.color)};font-size:${el.sizePx}px"` : `style="font-size:${el.sizePx}px"`;
  return `<span class="ppt-icon" aria-label="${escapeHtml(el.label ?? el.name)}"${style}>${escapeHtml(el.name)}</span>`;
}

// ─── QUIZ ─────────────────────────────────────────────────────

function renderQuiz(el: QuizElement): string {
  const options = (el.options ?? [])
    .map(
      (opt) => `
    <div class="ppt-quiz-option" data-id="${opt.id}" data-correct="${opt.correct}" onclick="window.__pptQuizSelect && window.__pptQuizSelect('${el.id}', '${opt.id}')">
      <span class="ppt-quiz-option-text">${escapeHtml(opt.text)}</span>
    </div>`,
    )
    .join('');

  const feedback = `
  <div class="ppt-quiz-feedback ppt-quiz-feedback--correct" id="${el.id}-feedback-correct">
    ${escapeHtml(el.feedbackCorrect ?? '✓ Correct!')}
  </div>
  <div class="ppt-quiz-feedback ppt-quiz-feedback--incorrect" id="${el.id}-feedback-incorrect">
    ${escapeHtml(el.feedbackIncorrect ?? '✗ Incorrect. Try again.')}
  </div>`;

  return `<div class="ppt-quiz" data-quiz-id="${el.id}" data-points="${el.points ?? 0}" data-store="${el.storeResultIn ?? ''}">
  <div class="ppt-quiz-question">${escapeHtml(el.question)}</div>
  <div class="ppt-quiz-options">${options}
  </div>
  ${feedback}
</div>`;
}

// ─── WHITEBOARD ───────────────────────────────────────────────

function renderWhiteboard(el: WhiteboardElement): string {
  if (el.svgDataUrl) {
    return `<img class="ppt-whiteboard" src="${escapeHtml(el.svgDataUrl)}" alt="Whiteboard" style="width:100%;height:100%;object-fit:contain;display:block;">`;
  }
  return `<div class="ppt-whiteboard ppt-whiteboard--empty" style="width:100%;height:100%;min-height:120px;display:flex;align-items:center;justify-content:center;border:2px dashed rgba(99,102,241,0.3);border-radius:8px;color:rgba(165,180,252,0.5);font-size:13px;">Whiteboard</div>`;
}

// ─── CHART ───────────────────────────────────────────────────

function renderChart(el: ChartElement): string {
  // Chart.js requires a canvas. We render a placeholder container that the
  // presentation viewer will mount Chart.js into during initialization.
  const config = JSON.stringify({
    type: el.chartType,
    data: el.data,
    options: el.options,
  });
  return `<div class="ppt-chart-container" style="width:100%;height:100%;min-height:200px;">
  <canvas class="ppt-chart-canvas" data-chart-config='${escapeHtml(config)}'></canvas>
</div>`;
}

// ─── SHAPE ───────────────────────────────────────────────────

function renderShape(el: ShapeElement): string {
  const fill = el.fill ?? 'transparent';
  const stroke = el.stroke ?? 'transparent';
  const strokeW = el.strokeWidth ?? 0;
  const opacity = el.opacity ?? 1;

  // We render shapes using basic SVG for scaling
  // To keep it simple, we use a single viewBox and scale it via CSS.
  let path = '';
  switch (el.shape) {
    case 'rectangle':
      path = `<rect x="0" y="0" width="100" height="100" />`;
      break;
    case 'rounded-rectangle':
      path = `<rect x="0" y="0" width="100" height="100" rx="10" ry="10" />`;
      break;
    case 'circle':
    case 'ellipse':
      path = `<ellipse cx="50" cy="50" rx="50" ry="50" />`;
      break;
    case 'triangle':
      path = `<polygon points="50,0 100,100 0,100" />`;
      break;
    case 'line':
      path = `<line x1="0" y1="50" x2="100" y2="50" />`;
      break;
    case 'arrow':
      path = `<polygon points="0,35 75,35 75,15 100,50 75,85 75,65 0,65" />`;
      break;
    case 'star':
      path = `<polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" />`;
      break;
    case 'hexagon':
      path = `<polygon points="25,0 75,0 100,50 75,100 25,100 0,50" />`;
      break;
    default:
      path = `<rect x="0" y="0" width="100" height="100" />`;
  }

  const svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;opacity:${opacity};">
  <g fill="${escapeHtml(fill)}" stroke="${escapeHtml(stroke)}" stroke-width="${strokeW}">
    ${path}
  </g>
</svg>`;

  const labelColor = el.style?.text?.color ?? (fill === 'transparent' ? '#000' : '#fff');
  const labelHtml = el.label
    ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${escapeHtml(labelColor)};text-align:center;font-size:1em;padding:4px;">${escapeHtml(el.label)}</div>`
    : '';

  return `<div class="ppt-shape" style="position:relative;width:100%;height:100%;min-width:40px;min-height:40px;">
  ${svg}
  ${labelHtml}
</div>`;
}

// ─── ASSET RESOLUTION ────────────────────────────────────────

function resolveAssetUrl(assetId: string, ctx: RenderContext): string {
  const asset = ctx.assetMap.get(assetId);
  if (asset) return asset.url;
  // Fall-through: treat assetId as a direct URL or data: URI
  return assetId;
}
