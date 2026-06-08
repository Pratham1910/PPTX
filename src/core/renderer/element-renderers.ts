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

  // Wrap with animation container only when needed
  if (classNames) {
    return `<div class="${classNames}"${attrString}>${html}</div>`;
  }
  return html;
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
    // Flowchart, chart, shape, timeline — placeholders for now
    case 'flowchart':   return `<div class="ppt-flowchart-placeholder" data-id="${el.id}">[Flowchart: rendered by React Flow]</div>`;
    case 'chart':       return `<div class="ppt-chart-placeholder" data-id="${el.id}">[Chart]</div>`;
    case 'shape':       return `<div class="ppt-shape-placeholder" data-id="${el.id}"></div>`;
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
  const img = `<img class="ppt-image" src="${escapeHtml(src)}" alt="${escapeHtml(el.alt)}" style="object-fit: ${el.fit ?? 'contain'}">`;
  const caption = el.caption
    ? `<p class="ppt-image-caption">${escapeHtml(el.caption)}</p>`
    : '';
  return `<figure>${img}${caption}</figure>`;
}

// ─── VIDEO ───────────────────────────────────────────────────

function renderVideo(el: VideoElement, ctx: RenderContext): string {
  // External embed (YouTube, Vimeo) → iframe
  if (el.url && (el.url.includes('youtube.com') || el.url.includes('vimeo.com'))) {
    const iframeSrc = escapeHtml(el.url);
    const caption = el.caption
      ? `<p class="ppt-image-caption">${escapeHtml(el.caption)}</p>`
      : '';
    return `<figure>
  <iframe class="ppt-video-embed" src="${iframeSrc}" allowfullscreen loading="lazy"></iframe>
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
  <video class="ppt-video"${autoplay}${loop}${muted}${controls}${poster} preload="metadata">
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

function renderEmbed(el: EmbedElement): string {
  if (el.embedType === 'iframe' && el.url) {
    return `<iframe class="ppt-video-embed" src="${escapeHtml(el.url)}" ${el.allowInteraction ? '' : 'sandbox=""'} loading="lazy"></iframe>`;
  }
  if (el.embedType === 'pdf' && el.url) {
    return `<iframe class="ppt-video-embed" src="${escapeHtml(el.url)}#view=FitH" loading="lazy"></iframe>`;
  }
  if (el.embedType === 'html' && el.htmlContent) {
    // Sanitise before use in production; here we trust the schema author
    return `<div class="ppt-embed-html">${el.htmlContent}</div>`;
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

// ─── ASSET RESOLUTION ────────────────────────────────────────

function resolveAssetUrl(assetId: string, ctx: RenderContext): string {
  const asset = ctx.assetMap.get(assetId);
  if (!asset) return '';
  // In a real export: if embedAssets, return base64 data URI from disk
  // Here: return the stored URL as-is
  return asset.url;
}
