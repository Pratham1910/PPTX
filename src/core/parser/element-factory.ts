/**
 * element-factory.ts
 *
 * Converts individual mdast Content nodes into one or more Presentation
 * Element objects. Each `nodeToElements` call handles one top-level mdast
 * node and returns a (possibly empty) array of elements.
 *
 * Asset side-effects: when an image or video is encountered, an Asset entry
 * is registered in ParseContext and the assetId is referenced in the element.
 */

import type {
  Content,
  Heading,
  Paragraph,
  List,
  ListItem,
  Table,
  Code,
  Blockquote,
  Html,
  Image,
  PhrasingContent,
} from 'mdast';

import type {
  Element,
  TextElement,
  HeadingElement,
  BulletListElement,
  BulletItem,
  ImageElement,
  VideoElement,
  EmbedElement,
  CodeElement,
  DiagramElement,
  TableElement,
  CalloutElement,
  DividerElement,
  Asset,
  EntranceAnimation,
} from '../schema.ts';

import type { ParseContext } from './types.ts';
import {
  uuid,
  extractText,
  classifyVideoURL,
  detectCalloutVariant,
  stripCalloutPrefix,
} from './utils.ts';

// ─── PUBLIC ENTRY POINT ──────────────────────────────────────

/**
 * Convert a single top-level mdast node to 0-N Presentation elements.
 * Returns an empty array for nodes that should be ignored (thematicBreak
 * converted to DividerElement, html comments already stripped by splitter).
 *
 * If ctx.pendingAnimation is set (from a preceding :::animate block), it is
 * applied to the first element produced and then cleared.
 */
export function nodeToElements(
  node: Content,
  ctx: ParseContext,
): Element[] {
  const elements = nodeToElementsInner(node, ctx);

  // Apply pending animation from :::animate to first produced element
  if (ctx.pendingAnimation && elements.length > 0) {
    const anim = ctx.pendingAnimation;
    ctx.pendingAnimation = undefined;
    elements[0] = { ...elements[0], animation: { entrance: anim } };
  }

  return elements;
}

function nodeToElementsInner(node: Content, ctx: ParseContext): Element[] {
  switch (node.type) {
    case 'paragraph':
      return paragraphToElements(node, ctx);
    case 'heading':
      return [inlineHeadingToElement(node)];
    case 'list':
      return [listToElement(node, ctx)];
    case 'table':
      return [tableToElement(node)];
    case 'code':
      return [codeToElement(node)];
    case 'blockquote':
      return [blockquoteToElement(node)];
    case 'thematicBreak':
      return [dividerElement()];
    case 'html':
      return htmlToElements(node, ctx);
    default:
      return [];
  }
}

// ─── PARAGRAPH ───────────────────────────────────────────────

function paragraphToElements(node: Paragraph, ctx: ParseContext): Element[] {
  // A paragraph with a single image child → ImageElement
  const imageNodes = node.children.filter((c) => c.type === 'image') as Image[];
  if (imageNodes.length === 1 && node.children.length === 1) {
    return [imageNodeToElement(imageNodes[0], ctx)];
  }

  // A paragraph whose only non-image child is a link pointing to a video URL
  if (node.children.length === 1 && node.children[0].type === 'link') {
    const link = node.children[0];
    const videoInfo = classifyVideoURL(link.url);
    if (videoInfo) {
      return [linkVideoToElement(link.url, extractText(link.children), ctx)];
    }
  }

  // Paragraph containing only inline HTML nodes — handle <video> and <iframe>.
  // remark splits <video src="x">...</video> into two html phrasing children
  // (open tag + close tag) because <video> is not in CommonMark's block-level list.
  const nonHtmlCount = node.children.filter((c) => c.type !== 'html').length;
  if (nonHtmlCount === 0 && node.children.some((c) => c.type === 'html')) {
    const combinedHtml = node.children
      .filter((c) => c.type === 'html')
      .map((c) => (c as { type: 'html'; value: string }).value)
      .join('');
    const videoSrcMatch = combinedHtml.match(/<video[^>]*\ssrc=["']([^"']+)["']/i);
    if (videoSrcMatch) {
      const url = videoSrcMatch[1];
      const info = classifyVideoURL(url);
      const assetId = info?.kind === 'local' ? resolveAsset(url, 'video', ctx) : undefined;
      const videoEl: VideoElement = {
        id: uuid(),
        type: 'video',
        assetId,
        url: info?.kind !== 'local' ? url : undefined,
        autoplay: /autoplay/i.test(combinedHtml),
        loop: /\bloop\b/i.test(combinedHtml),
        muted: /\bmuted\b/i.test(combinedHtml),
        controls: !/controls="false"/i.test(combinedHtml),
        position: { mode: 'flow' },
      };
      return [videoEl];
    }
    const iframeSrcMatch = combinedHtml.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
    if (iframeSrcMatch) {
      const embedEl: EmbedElement = {
        id: uuid(),
        type: 'embed',
        embedType: 'iframe',
        url: iframeSrcMatch[1],
        allowInteraction: true,
        position: { mode: 'flow' },
      };
      return [embedEl];
    }
  }

  // Mixed or plain text paragraph → TextElement
  const text = extractText(node.children);
  if (!text.trim()) return [];

  const el: TextElement = {
    id: uuid(),
    type: 'text',
    content: text,
    contentFormat: 'plain',
    position: { mode: 'flow' },
  };
  return [el];
}

// ─── HEADING (H3+, inside a slide body) ──────────────────────

function inlineHeadingToElement(node: Heading): HeadingElement {
  return {
    id: uuid(),
    type: 'heading',
    level: node.depth as 1 | 2 | 3 | 4 | 5 | 6,
    content: extractText(node.children),
    position: { mode: 'flow' },
  };
}

// ─── LIST ────────────────────────────────────────────────────

function listToElement(
  node: List,
  ctx: ParseContext,
  depth = 0,
): BulletListElement {
  const items: BulletItem[] = flattenListItems(node.children, ctx, depth);
  return {
    id: uuid(),
    type: 'bullet-list',
    ordered: node.ordered ?? false,
    items,
    position: { mode: 'flow' },
  };
}

function flattenListItems(
  listItems: ListItem[],
  ctx: ParseContext,
  depth: number,
): BulletItem[] {
  const result: BulletItem[] = [];

  for (const item of listItems) {
    for (const child of item.children) {
      if (child.type === 'paragraph') {
        result.push({
          id: uuid(),
          content: extractText(child.children),
          contentFormat: 'plain',
          level: depth,
        });
      } else if (child.type === 'list') {
        // Nested list — recurse with incremented depth
        result.push(...flattenListItems(child.children, ctx, depth + 1));
      }
    }
  }

  return result;
}

// ─── TABLE ───────────────────────────────────────────────────

function tableToElement(node: Table): TableElement {
  const [headerRow, ...bodyRows] = node.children;

  const headers = (headerRow?.children ?? []).map((cell) =>
    extractText(cell.children as PhrasingContent[]),
  );

  const rows = bodyRows.map((row) =>
    row.children.map((cell) =>
      extractText(cell.children as PhrasingContent[]),
    ),
  );

  return {
    id: uuid(),
    type: 'table',
    headers,
    rows,
    striped: true,
    bordered: true,
    position: { mode: 'flow' },
  };
}

// ─── CODE ────────────────────────────────────────────────────

function codeToElement(node: Code): CodeElement | DiagramElement {
  const lang = (node.lang ?? '').toLowerCase().trim();

  // Mermaid → DiagramElement
  if (lang === 'mermaid') {
    return {
      id: uuid(),
      type: 'diagram',
      source: node.value,
      diagramType: detectMermaidType(node.value),
      theme: 'dark',
      position: { mode: 'flow' },
    };
  }

  // Everything else → CodeElement
  return {
    id: uuid(),
    type: 'code',
    code: node.value,
    language: lang || 'text',
    lineNumbers: true,
    showCopyButton: true,
    position: { mode: 'flow' },
  };
}

function detectMermaidType(source: string): DiagramElement['diagramType'] {
  const firstLine = source.trim().split('\n')[0].toLowerCase();
  if (firstLine.startsWith('sequencediagram')) return 'sequence';
  if (firstLine.startsWith('gantt')) return 'gantt';
  if (firstLine.startsWith('classDiagram') || firstLine.startsWith('classdiagram')) return 'class';
  if (firstLine.startsWith('stateDiagram')) return 'state';
  if (firstLine.startsWith('pie')) return 'pie';
  if (firstLine.startsWith('gitgraph')) return 'gitGraph';
  if (firstLine.startsWith('erDiagram') || firstLine.startsWith('erdiagram')) return 'er';
  if (firstLine.startsWith('mindmap')) return 'mindmap';
  return 'flowchart';
}

// ─── BLOCKQUOTE ──────────────────────────────────────────────

function blockquoteToElement(node: Blockquote): CalloutElement {
  // Extract all text from the blockquote
  const lines: string[] = [];
  for (const child of node.children) {
    if (child.type === 'paragraph') {
      lines.push(extractText(child.children));
    }
  }
  const fullText = lines.join('\n');
  const firstLine = lines[0] ?? '';

  const variant = detectCalloutVariant(firstLine);
  const content = stripCalloutPrefix(fullText);

  return {
    id: uuid(),
    type: 'callout',
    variant,
    content,
    contentFormat: 'plain',
    position: { mode: 'flow' },
  };
}

// ─── IMAGE ───────────────────────────────────────────────────

function imageNodeToElement(node: Image, ctx: ParseContext): ImageElement {
  const assetId = resolveAsset(node.url, 'image', ctx);
  return {
    id: uuid(),
    type: 'image',
    assetId,
    alt: node.alt ?? '',
    caption: node.title ?? undefined,
    fit: 'contain',
    position: { mode: 'flow' },
  };
}

// ─── VIDEO (from a bare link) ─────────────────────────────────

function linkVideoToElement(
  url: string,
  label: string,
  ctx: ParseContext,
): VideoElement {
  const info = classifyVideoURL(url)!;
  const assetId =
    info.kind === 'local' ? resolveAsset(url, 'video', ctx) : undefined;

  return {
    id: uuid(),
    type: 'video',
    assetId,
    url: info.kind !== 'local' ? info.embedUrl ?? url : undefined,
    autoplay: false,
    loop: false,
    muted: false,
    controls: true,
    caption: label || undefined,
    position: { mode: 'flow' },
  };
}

// ─── HTML NODES ──────────────────────────────────────────────

// Matches <!-- @animate effect --> (non-standard comment — bypasses parseDirective)
const ANIMATE_COMMENT_RE = /^<!--\s*@animate\s+(\S+)\s*-->$/;

function htmlToElements(node: Html, ctx: ParseContext): Element[] {
  const html = node.value.trim();

  // :::animate block marker → set pendingAnimation for next element
  const animMatch = html.match(ANIMATE_COMMENT_RE);
  if (animMatch) {
    const effect = animMatch[1] as EntranceAnimation['effect'];
    ctx.pendingAnimation = {
      effect: ['fade','slide-up','slide-down','slide-left','slide-right','zoom','zoom-out','bounce'].includes(effect)
        ? effect
        : 'fade',
      trigger: 'fragment',
      durationMs: 600,
      delayMs: 0,
      easing: 'ease',
    };
    return [];
  }

  // <video> tag
  const videoSrcMatch = html.match(/<video[^>]*\ssrc=["']([^"']+)["']/i);
  if (videoSrcMatch) {
    const url = videoSrcMatch[1];
    const info = classifyVideoURL(url);
    const assetId =
      info?.kind === 'local' ? resolveAsset(url, 'video', ctx) : undefined;
    const videoEl: VideoElement = {
      id: uuid(),
      type: 'video',
      assetId,
      url: info?.kind !== 'local' ? url : undefined,
      autoplay: /autoplay/i.test(html),
      loop: /\bloop\b/i.test(html),
      muted: /\bmuted\b/i.test(html),
      controls: !/controls="false"/i.test(html),
      position: { mode: 'flow' },
    };
    return [videoEl];
  }

  // <iframe> tag
  const iframeSrcMatch = html.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeSrcMatch) {
    const embedEl: EmbedElement = {
      id: uuid(),
      type: 'embed',
      embedType: 'iframe',
      url: iframeSrcMatch[1],
      allowInteraction: true,
      position: { mode: 'flow' },
    };
    return [embedEl];
  }

  // Unknown HTML — skip silently
  return [];
}

// ─── DIVIDER ─────────────────────────────────────────────────

function dividerElement(): DividerElement {
  return {
    id: uuid(),
    type: 'divider',
    orientation: 'horizontal',
    position: { mode: 'flow' },
  };
}

// ─── ASSET REGISTRY ──────────────────────────────────────────

/**
 * Register an asset URL in the context asset registry.
 * Returns the assetId (existing or newly created).
 */
function resolveAsset(
  url: string,
  type: Asset['type'],
  ctx: ParseContext,
): string {
  const existing = ctx.assetIndex.get(url);
  if (existing) return existing;

  const id = uuid();
  const filename = url.split('/').pop() ?? url;
  const mimeType = guessMimeType(filename, type);

  const asset: Asset = {
    id,
    type,
    filename,
    mimeType,
    sizeBytes: 0,
    url,
    uploadedAt: new Date().toISOString(),
    metadata: {},
  };

  ctx.assets.push(asset);
  ctx.assetIndex.set(url, id);
  return id;
}

function guessMimeType(filename: string, type: Asset['type']): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    pdf: 'application/pdf',
  };
  return map[ext] ?? (type === 'image' ? 'image/jpeg' : 'application/octet-stream');
}
