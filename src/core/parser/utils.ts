import type { PhrasingContent } from 'mdast';

// ─── UUID ────────────────────────────────────────────────────

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── TEXT EXTRACTION ─────────────────────────────────────────

/**
 * Recursively extract plain text from mdast phrasing content nodes.
 * Used to get the string value of headings, list items, table cells, etc.
 */
export function extractText(nodes: PhrasingContent[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.value;
        case 'inlineCode':
          return node.value;
        case 'strong':
        case 'emphasis':
        case 'delete':
          return extractText(node.children);
        case 'link':
          return extractText(node.children);
        case 'image':
          return node.alt ?? '';
        case 'break':
          return '\n';
        case 'html':
          return '';
        default:
          return '';
      }
    })
    .join('');
}

// ─── SLUG ────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── ISO TIMESTAMP ───────────────────────────────────────────

export function isoNow(): string {
  return new Date().toISOString();
}

// ─── URL DETECTION ───────────────────────────────────────────

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const VIMEO_RE = /vimeo\.com\/(\d+)/;

export type VideoURLKind = 'local' | 'youtube' | 'vimeo' | 'direct';

export interface VideoURLInfo {
  kind: VideoURLKind;
  url: string;
  embedUrl?: string;
}

export function classifyVideoURL(url: string): VideoURLInfo | null {
  const youtubeMatch = url.match(YOUTUBE_RE);
  if (youtubeMatch) {
    return {
      kind: 'youtube',
      url,
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
    };
  }
  const vimeoMatch = url.match(VIMEO_RE);
  if (vimeoMatch) {
    return {
      kind: 'vimeo',
      url,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }
  if (VIDEO_EXT_RE.test(url)) {
    const isLocal = !url.startsWith('http://') && !url.startsWith('https://');
    return { kind: isLocal ? 'local' : 'direct', url };
  }
  return null;
}

export function isExternalURL(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

// ─── HTML COMMENT DIRECTIVE PARSER ───────────────────────────

/**
 * Parses an HTML comment like:
 *   <!-- layout: two-column -->
 *   <!-- tags: safety, warning -->
 * Returns null if the string is not a valid single directive comment.
 */
const DIRECTIVE_RE = /^<!--\s*([\w-]+)\s*:\s*(.+?)\s*-->$/s;

export function parseDirective(
  html: string,
): { key: string; value: string } | null {
  const m = html.trim().match(DIRECTIVE_RE);
  if (!m) return null;
  return { key: m[1].toLowerCase(), value: m[2].trim() };
}

// ─── CALLOUT VARIANT DETECTION ───────────────────────────────

type CalloutVariant = 'info' | 'warning' | 'danger' | 'success' | 'tip' | 'note';

const CALLOUT_PREFIXES: Array<[RegExp, CalloutVariant]> = [
  [/^\[!WARNING\]|^Warning:/i, 'warning'],
  [/^\[!CAUTION\]|^Caution:/i, 'danger'],
  [/^\[!DANGER\]|^Danger:/i, 'danger'],
  [/^\[!TIP\]|^Tip:/i, 'tip'],
  [/^\[!NOTE\]|^Note:/i, 'note'],
  [/^\[!SUCCESS\]|^Success:/i, 'success'],
];

export function detectCalloutVariant(firstLine: string): CalloutVariant {
  for (const [re, variant] of CALLOUT_PREFIXES) {
    if (re.test(firstLine.trim())) return variant;
  }
  return 'info';
}

/**
 * Strips the callout prefix marker from the first line.
 * e.g. "[!WARNING] Be careful" → "Be careful"
 */
export function stripCalloutPrefix(text: string): string {
  return text
    .replace(/^\[!(?:WARNING|CAUTION|DANGER|TIP|NOTE|SUCCESS)\]\s*/i, '')
    .replace(/^\*\*(?:Warning|Caution|Danger|Tip|Note|Success)[:\s*]*\*\*/i, '')
    .trim();
}
