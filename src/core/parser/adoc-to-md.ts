/**
 * adoc-to-md.ts
 *
 * AsciiDoc → Markdown converter for the PPTAutomation parser pipeline.
 * Converts enough AsciiDoc syntax so markdownToPresentation can handle .adoc files.
 *
 * Supported:
 *   Headings            = / == / === / ====
 *   Doc header          strips author / revision lines after level-1 title
 *   Bold / Italic / Mono  *text*, _text_, +text+, `text`
 *   Unordered lists     * / ** / ***
 *   Ordered lists       . / .. / ...
 *   List continuation   + on its own line
 *   Images              image::path[alt], image:path[alt] (inline)
 *   Links               link:url[text], https://... bare URLs
 *   Cross-refs          <<target,text>>
 *   Attribute refs      {attr} → stripped
 *   Source blocks       [source,lang] + ---- delimiters
 *   Literal blocks      ---- or .... without source annotation
 *   Example blocks      ==== ... ==== (content kept, delimiters stripped)
 *   Sidebar blocks      **** ... **** (content kept)
 *   Quote blocks        ____ ... ____ (wrapped in >)
 *   Open blocks         -- ... -- (content kept)
 *   Admonitions inline  NOTE: / TIP: / WARNING: / IMPORTANT: / CAUTION:
 *   Admonition blocks   [NOTE]\n====\n...\n====
 *   Tables              |=== ... |===
 *   Pass-through        ++++ ... ++++ (raw HTML kept)
 *   Comment blocks      //// ... ////  (stripped)
 *   Single-line //      stripped
 *   Doc attributes      :key: value  (stripped)
 *   ifdef/endif         stripped (content kept)
 *   Horizontal rule     ''' → ---
 *   Block roles         [.role], [%opt], [#id] lines → stripped
 */

// ─── types ────────────────────────────────────────────────────

type BlockKind =
  | 'source' | 'literal' | 'pass' | 'table'
  | 'admonition' | 'example' | 'sidebar' | 'quote' | 'open';

interface Block {
  kind: BlockKind;
  lang?: string;
  admonitionType?: string;
  lines: string[];
}

type Segment = string | Block;

// ─── inline transforms ────────────────────────────────────────

function inlineTransform(text: string): string {
  // Strip {attribute-references}
  text = text.replace(/\{[a-zA-Z][\w-]*\}/g, '');

  // image::path[alt,...] (block image used inline)
  text = text.replace(/image::([^\s[]+)\[([^\]]*)\]/g, (_, path, attrs) => {
    const alt = attrs.split(',')[0]?.trim() ?? '';
    return `![${alt}](${path.trim()})`;
  });

  // image:path[alt] (inline image)
  text = text.replace(/image:([^\s[]+)\[([^\]]*)\]/g, (_, path, attrs) => {
    const alt = attrs.split(',')[0]?.trim() ?? '';
    return `![${alt}](${path.trim()})`;
  });

  // link:url[text]
  text = text.replace(/link:([^\s[]+)\[([^\]]*)\]/g, (_, url, label) => {
    return `[${label.trim() || url.trim()}](${url.trim()})`;
  });

  // <<target,text>> or <<target>>
  text = text.replace(/<<([^,>]+)(?:,([^>]+))?>>/, (_, _t, label) =>
    label ? label.trim() : ''
  );

  // pass:[content] — strip the macro wrapper, keep content
  text = text.replace(/pass:\[([^\]]*)\]/g, '$1');

  // *bold* — not ** (already MD)
  text = text.replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, '**$1**');

  // _italic_ — not inside words
  text = text.replace(/(?<![a-zA-Z0-9])_([^_\n]+)_(?![a-zA-Z0-9])/g, '_$1_');

  // +mono+ (not inside words)
  text = text.replace(/(?<!\+)\+(?!\+)([^+\n]+)\+(?!\+)/g, '`$1`');

  // `backtick` already MD — leave alone

  // Hard line break (space+)
  text = text.replace(/ \+$/, '  ');

  return text;
}

// ─── list helpers ─────────────────────────────────────────────

function parseListLine(line: string): { depth: number; ordered: boolean; content: string } | null {
  const u = line.match(/^(\*{1,5})\s+(.+)/);
  if (u) return { depth: u[1].length, ordered: false, content: u[2] };
  const o = line.match(/^(\.{1,5})\s+(.+)/);
  if (o) return { depth: o[1].length, ordered: true, content: o[2] };
  return null;
}

// ─── table helpers ────────────────────────────────────────────

function tableToMd(lines: string[]): string {
  // Collect rows: lines starting with |
  // Each cell: content between | delimiters
  const rows: string[][] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t === '' || !t.startsWith('|')) continue;
    const cells = t.slice(1).split('|').map((c) => c.trim());
    rows.push(cells);
  }
  if (rows.length === 0) return '';
  const header = rows[0];
  const sep = header.map(() => '---');
  const body = rows.slice(1);
  return [
    '| ' + header.join(' | ') + ' |',
    '| ' + sep.join(' | ') + ' |',
    ...body.map((r) => '| ' + r.join(' | ') + ' |'),
  ].join('\n');
}

// ─── block extractor ─────────────────────────────────────────

const ADMONITION_TYPES = new Set(['NOTE', 'TIP', 'WARNING', 'IMPORTANT', 'CAUTION']);

function extractBlocks(lines: string[]): Segment[] {
  const result: Segment[] = [];
  let i = 0;

  // Pending block annotation (e.g. [source,java] or [NOTE])
  let pendingAnnotation: string | null = null;

  function consumeDelimited(open: string, close: string): string[] {
    const content: string[] = [];
    i++; // skip opening delimiter
    while (i < lines.length && lines[i].trim() !== close) {
      content.push(lines[i]);
      i++;
    }
    i++; // skip closing delimiter
    return content;
  }

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // ── //// comment block ──────────────────────────────────
    if (line === '////') {
      i++;
      while (i < lines.length && lines[i].trim() !== '////') i++;
      i++;
      pendingAnnotation = null;
      continue;
    }

    // ── ++++ pass-through block ──────────────────────────────
    if (line === '++++') {
      const content = consumeDelimited('++++', '++++');
      result.push({ kind: 'pass', lines: content });
      pendingAnnotation = null;
      continue;
    }

    // ── |=== table ───────────────────────────────────────────
    if (line === '|===') {
      const content = consumeDelimited('|===', '|===');
      result.push({ kind: 'table', lines: content });
      pendingAnnotation = null;
      continue;
    }

    // ── Block annotation line [tag] ──────────────────────────
    // e.g. [source,java], [NOTE], [TIP], [%auto-animate], [#anchor]
    if (/^\[.*\]$/.test(line)) {
      // Check if it's an admonition type block annotation
      const admMatch = line.match(/^\[(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]$/);
      if (admMatch) {
        pendingAnnotation = admMatch[1];
      } else {
        // source annotation or other — store for next delimiter
        pendingAnnotation = line;
      }
      i++;
      continue;
    }

    // ── ==== example / admonition block ─────────────────────
    if (line === '====') {
      const content = consumeDelimited('====', '====');
      if (pendingAnnotation && ADMONITION_TYPES.has(pendingAnnotation)) {
        result.push({ kind: 'admonition', admonitionType: pendingAnnotation, lines: content });
      } else {
        result.push({ kind: 'example', lines: content });
      }
      pendingAnnotation = null;
      continue;
    }

    // ── **** sidebar block ────────────────────────────────────
    if (line === '****') {
      const content = consumeDelimited('****', '****');
      result.push({ kind: 'sidebar', lines: content });
      pendingAnnotation = null;
      continue;
    }

    // ── ____ quote block ──────────────────────────────────────
    if (line === '____') {
      const content = consumeDelimited('____', '____');
      result.push({ kind: 'quote', lines: content });
      pendingAnnotation = null;
      continue;
    }

    // ── -- open block ─────────────────────────────────────────
    // Only when standing alone on a line
    if (line === '--') {
      const content = consumeDelimited('--', '--');
      result.push({ kind: 'open', lines: content });
      pendingAnnotation = null;
      continue;
    }

    // ── ---- code / literal block ────────────────────────────
    if (line === '----') {
      const content = consumeDelimited('----', '----');
      // Did we have a [source,...] annotation?
      const srcAnn = pendingAnnotation?.match(/^\[source(?:[,%].*?)?(?:,([^\]]+))?\]$/);
      if (srcAnn) {
        // Try to extract language: [source,java] or [source%nowrap,java]
        const langMatch = pendingAnnotation!.match(/\[source[^,]*,\s*([^\]]+)\]/);
        const lang = langMatch ? langMatch[1].trim() : '';
        result.push({ kind: 'source', lang, lines: content });
      } else if (pendingAnnotation === '[listing]') {
        result.push({ kind: 'literal', lines: content });
      } else {
        result.push({ kind: 'literal', lines: content });
      }
      pendingAnnotation = null;
      continue;
    }

    // ── .... literal block ────────────────────────────────────
    if (line === '....') {
      const content = consumeDelimited('....', '....');
      result.push({ kind: 'literal', lines: content });
      pendingAnnotation = null;
      continue;
    }

    // ── Everything else ────────────────────────────────────────
    // Clear pending annotation if not a delimiter
    if (pendingAnnotation !== null) {
      // The annotation didn't precede a recognised delimiter — emit annotation as-is
      // (will be stripped later as a block-attribute line)
      pendingAnnotation = null;
    }
    result.push(raw);
    i++;
  }

  return result;
}

// ─── admonition type → MD callout ────────────────────────────

function admonitionCallout(type: string): string {
  if (type === 'TIP') return 'TIP';
  if (type === 'NOTE') return 'NOTE';
  return 'WARNING'; // IMPORTANT, CAUTION, WARNING
}

// ─── render a block back to MD lines ─────────────────────────

function blockToMd(block: Block): string[] {
  const out: string[] = [];
  switch (block.kind) {
    case 'source':
      out.push('```' + (block.lang ?? ''));
      out.push(...block.lines);
      out.push('```');
      break;
    case 'literal':
      out.push('```');
      out.push(...block.lines);
      out.push('```');
      break;
    case 'pass':
      out.push(...block.lines);
      break;
    case 'table':
      out.push(tableToMd(block.lines));
      break;
    case 'admonition': {
      const callout = admonitionCallout(block.admonitionType ?? 'NOTE');
      out.push(`> [!${callout}]`);
      for (const ln of block.lines) {
        out.push(ln.trim() ? `> ${ln}` : '>');
      }
      break;
    }
    case 'example':
    case 'sidebar':
    case 'open':
      // Recurse — treat content as normal adoc
      out.push(...convertLines(extractBlocks(block.lines)));
      break;
    case 'quote':
      for (const ln of block.lines) {
        out.push(ln.trim() ? `> ${inlineTransform(ln)}` : '>');
      }
      break;
  }
  out.push('');
  return out;
}

// ─── convert a segment list to markdown lines ─────────────────

function convertLines(segments: Segment[]): string[] {
  const out: string[] = [];
  let afterLevel1 = false;   // state: just saw a level-1 heading
  let preambleSkip = 0;      // how many more preamble lines to skip

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];

    // ── Block node ─────────────────────────────────────────
    if (typeof seg !== 'string') {
      afterLevel1 = false;
      preambleSkip = 0;
      out.push(...blockToMd(seg));
      continue;
    }

    const line = seg;
    const trimmed = line.trim();

    // ── ifdef/endif conditionals — strip the directive line ──
    if (/^i?f(?:def|ndef|eval)::/.test(trimmed) || /^endif::/.test(trimmed)) {
      continue;
    }

    // ── Preamble skip (author / revision after level-1 title) ─
    if (preambleSkip > 0) {
      // Skip lines that look like author or revision metadata
      const isAuthorLine = /^[A-Za-z].*<.*@.*>/.test(trimmed)        // Author <email>
        || /^[A-Z][a-z]+ [A-Z]/.test(trimmed)                         // Firstname Lastname
        || /^v\d/.test(trimmed)                                        // v1.0, 2024-01-01
        || /^\d{4}-\d{2}-\d{2}/.test(trimmed);                        // date
      if (isAuthorLine) {
        preambleSkip--;
        continue;
      }
      preambleSkip = 0; // non-metadata line — stop skipping
    }

    // ── Headings ─────────────────────────────────────────────
    const headingMatch = trimmed.match(/^(={1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      // Strip inline [[anchor]] from heading text
      const title = headingMatch[2].replace(/\[\[.*?\]\]/, '').trim();
      out.push('#'.repeat(level) + ' ' + title);
      if (level === 1) {
        afterLevel1 = true;
        preambleSkip = 2; // may skip up to 2 preamble lines
      } else {
        afterLevel1 = false;
      }
      continue;
    }
    afterLevel1 = false;

    // ── Page break / vertical slide break ────────────────────
    // <<< = AsciiDoc page break → Reveal.js vertical slide
    if (trimmed === '<<<') { out.push('<!-- vertical -->'); continue; }

    // ── Horizontal rule ──────────────────────────────────────
    if (trimmed === "'''") { out.push('---'); continue; }

    // ── Inline admonitions NOTE: ... ────────────────────────
    const admInline = trimmed.match(/^(NOTE|TIP|WARNING|IMPORTANT|CAUTION):\s+(.*)/);
    if (admInline) {
      const callout = admonitionCallout(admInline[1]);
      out.push(`> [!${callout}]\n> ${inlineTransform(admInline[2])}`);
      continue;
    }

    // ── List continuation (bare +) — skip, next line appends ─
    if (trimmed === '+') continue;

    // ── List items ───────────────────────────────────────────
    const listItem = parseListLine(trimmed);
    if (listItem) {
      const indent = '  '.repeat(Math.max(0, listItem.depth - 1));
      const bullet = listItem.ordered ? `${listItem.depth}.` : '-';
      out.push(`${indent}${bullet} ${inlineTransform(listItem.content)}`);
      continue;
    }

    // ── Everything else ──────────────────────────────────────
    out.push(inlineTransform(line));
  }

  return out;
}

// ─── main export ─────────────────────────────────────────────

export function adocToMarkdown(adoc: string): string {
  // Normalise line endings
  const rawLines = adoc.replace(/\r\n/g, '\n').split('\n');

  // Pre-filter:
  //   - single-line // comments
  //   - document attribute lines :key: value (but NOT :: in normal text)
  const filteredLines = rawLines.filter((line) => {
    if (/^\/\/(?!\/)/.test(line.trim())) return false;       // // comment
    if (/^:[a-zA-Z_][\w-]*(!)?:\s*/.test(line.trim())) return false; // :attr:
    return true;
  });

  const segments = extractBlocks(filteredLines);
  const mdLines = convertLines(segments);
  return mdLines.join('\n');
}
