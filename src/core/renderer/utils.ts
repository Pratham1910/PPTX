// ─── HTML ESCAPING ───────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c] ?? c);
}

/** Escape HTML but preserve intentional line breaks as <br>. */
export function escapeHtmlPreserveBreaks(str: string): string {
  return escapeHtml(str).replace(/\n/g, '<br>');
}

// ─── ATTRIBUTE BUILDER ───────────────────────────────────────

/**
 * Build an HTML attribute string from a plain object.
 * Entries with undefined/null values are omitted.
 * Boolean true → attribute present with no value (e.g. "controls").
 *
 * attrs({ id: 'x', class: 'foo', controls: true, hidden: false })
 * → ' id="x" class="foo" controls'
 */
export function attrs(
  obj: Record<string, string | number | boolean | undefined | null>,
): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(String(v))}"`) )
    .join('');
}

// ─── CLASS LIST BUILDER ──────────────────────────────────────

/**
 * Build a class string from an array of names, filtering out falsy values.
 * classes(['foo', null, 'bar', undefined, 'baz']) → 'foo bar baz'
 */
export function classes(
  ...names: Array<string | null | undefined | false>
): string {
  return names.filter(Boolean).join(' ');
}

// ─── CSS UNIT HELPERS ────────────────────────────────────────

export function px(n: number | undefined): string | undefined {
  return n !== undefined ? `${n}px` : undefined;
}

export function pct(n: number | undefined): string | undefined {
  return n !== undefined ? `${n}%` : undefined;
}

// ─── INLINE STYLE BUILDER ────────────────────────────────────

/**
 * Build a CSS inline style string from a partial style object.
 * Undefined values are omitted.
 */
export function inlineStyle(
  obj: Record<string, string | number | undefined | null>,
): string {
  const parts = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${v}`);
  return parts.length ? parts.join('; ') : '';
}

// ─── INDENT ──────────────────────────────────────────────────

export function indent(html: string, spaces = 2): string {
  const pad = ' '.repeat(spaces);
  return html
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}
