/**
 * adoc-to-md.ts
 *
 * Converts a subset of AsciiDoc syntax to Markdown so the existing
 * markdownToPresentation pipeline can handle .adoc files without a
 * separate AST walker.
 *
 * Supported constructs:
 *   Headings        = / == / === / ==== (→ # / ## / ### / ####)
 *   Bold            *text*  (→ **text**)
 *   Italic          _text_  (→ _text_)
 *   Mono/code       +text+  (→ `text`)
 *   Unordered list  * / ** / ***  (indented bullets)
 *   Ordered list    . / .. / ...  (1. nested)
 *   Images          image::path[alt]
 *   Links           link:url[text], bare URLs
 *   Code blocks     [source,lang] + ---- delimiters
 *   Literal blocks  ---- or .... without source annotation
 *   Admonitions     NOTE: / TIP: / WARNING: / IMPORTANT: / CAUTION:
 *   Horizontal rule '''
 *   Doc attributes  :key: value  (stripped)
 *   Comments        // single-line, //// blocks (stripped)
 *   Pass-through    ++++ blocks (kept as raw HTML)
 *   Slide breaks    --- inside ==+ blocks treated as slide dividers
 */

// ─── helpers ──────────────────────────────────────────────────

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── multi-line block processor ───────────────────────────────

interface Block {
  kind: 'source' | 'literal' | 'pass' | 'comment' | 'table';
  lang?: string;
  lines: string[];
}

function extractBlocks(lines: string[]): (string | Block)[] {
  const result: (string | Block)[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // //// comment block
    if (line.trim() === '////') {
      i++;
      while (i < lines.length && lines[i].trim() !== '////') i++;
      i++; // skip closing ////
      continue;
    }

    // Pass-through block ++++
    if (line.trim() === '++++') {
      const block: Block = { kind: 'pass', lines: [] };
      i++;
      while (i < lines.length && lines[i].trim() !== '++++') {
        block.lines.push(lines[i]);
        i++;
      }
      i++;
      result.push(block);
      continue;
    }

    // Table |===
    if (line.trim() === '|===') {
      const block: Block = { kind: 'table', lines: [] };
      i++;
      while (i < lines.length && lines[i].trim() !== '|===') {
        block.lines.push(lines[i]);
        i++;
      }
      i++;
      result.push(block);
      continue;
    }

    // Check for [source,...] or [%autowidth] annotation before ----
    const sourceMatch = line.match(/^\[source(?:,\s*([^\]]+))?\]/);
    if (sourceMatch) {
      const lang = (sourceMatch[1] ?? '').trim();
      i++;
      // expect ---- delimiter next
      if (i < lines.length && lines[i].trim() === '----') {
        i++;
        const block: Block = { kind: 'source', lang, lines: [] };
        while (i < lines.length && lines[i].trim() !== '----') {
          block.lines.push(lines[i]);
          i++;
        }
        i++;
        result.push(block);
        continue;
      }
      // no delimiter found — just emit the annotation line and continue
      result.push(line);
      continue;
    }

    // Bare ---- delimiter → literal/code block
    if (line.trim() === '----') {
      i++;
      const block: Block = { kind: 'literal', lines: [] };
      while (i < lines.length && lines[i].trim() !== '----') {
        block.lines.push(lines[i]);
        i++;
      }
      i++;
      result.push(block);
      continue;
    }

    // .... literal block
    if (line.trim() === '....') {
      i++;
      const block: Block = { kind: 'literal', lines: [] };
      while (i < lines.length && lines[i].trim() !== '....') {
        block.lines.push(lines[i]);
        i++;
      }
      i++;
      result.push(block);
      continue;
    }

    result.push(line);
    i++;
  }

  return result;
}

// ─── inline transforms ─────────────────────────────────────────

function inlineTransform(text: string): string {
  // image::path[alt,...]
  text = text.replace(/image::([^\[]+)\[([^\]]*)\]/g, (_, path, attrs) => {
    const parts = attrs.split(',');
    const alt = parts[0]?.trim() || '';
    return `![${alt}](${path.trim()})`;
  });

  // inline image: image:path[alt]
  text = text.replace(/image:([^\[]+)\[([^\]]*)\]/g, (_, path, attrs) => {
    const parts = attrs.split(',');
    const alt = parts[0]?.trim() || '';
    return `![${alt}](${path.trim()})`;
  });

  // link:url[text]
  text = text.replace(/link:([^\[]+)\[([^\]]*)\]/g, (_, url, label) => {
    return `[${label.trim() || url.trim()}](${url.trim()})`;
  });

  // <<target,text>> or <<target>>
  text = text.replace(/<<([^,>]+)(?:,([^>]+))?>>/, (_, _target, label) => {
    return label ? label.trim() : '';
  });

  // *bold* — but not ** (which is already MD)
  text = text.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '**$1**');

  // _italic_ — careful not to affect underscores in words
  text = text.replace(/(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, '_$1_');

  // +mono+
  text = text.replace(/\+([^+]+)\+/g, '`$1`');

  // `backtick` is already MD — leave alone

  return text;
}

// ─── list handling ─────────────────────────────────────────────

function isListLine(line: string): { depth: number; ordered: boolean; content: string } | null {
  // unordered: * / ** / ***
  const uMatch = line.match(/^(\*+)\s+(.+)/);
  if (uMatch) return { depth: uMatch[1].length, ordered: false, content: uMatch[2] };

  // ordered: . / .. / ...
  const oMatch = line.match(/^(\.+)\s+(.+)/);
  if (oMatch) return { depth: oMatch[1].length, ordered: true, content: oMatch[2] };

  return null;
}

// ─── table converter ───────────────────────────────────────────

function tableToMd(lines: string[]): string {
  const rows: string[][] = [];
  let inHeader = false;

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('[')) continue;
    if (line.trim().startsWith('|')) {
      const cells = line
        .trim()
        .slice(1)
        .split('|')
        .map((c) => c.trim());
      rows.push(cells);
    }
    // header separator row (e.g. h|)
    if (line.trim().startsWith('h|') || line.includes('header')) {
      inHeader = true;
    }
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

// ─── heading conversion ────────────────────────────────────────

function convertHeading(line: string): string | null {
  const m = line.match(/^(={1,6})\s+(.+)/);
  if (!m) return null;
  const level = m[1].length;
  return '#'.repeat(level) + ' ' + m[2].trim();
}

// ─── admonition conversion ─────────────────────────────────────

function convertAdmonition(line: string): string | null {
  const m = line.match(/^(NOTE|TIP|WARNING|IMPORTANT|CAUTION):\s+(.*)/);
  if (!m) return null;
  const type = m[1] === 'TIP' ? 'TIP' : m[1] === 'NOTE' ? 'NOTE' : 'WARNING';
  return `> [!${type}]\n> ${m[2]}`;
}

// ─── main export ───────────────────────────────────────────────

export function adocToMarkdown(adoc: string): string {
  // Normalise line endings
  const rawLines = adoc.replace(/\r\n/g, '\n').split('\n');

  // Remove single-line // comments and doc-attribute lines (:key: val)
  const filteredLines = rawLines.filter((line) => {
    if (/^\/\/(?!\/)/.test(line)) return false; // // comment
    if (/^:[a-zA-Z_][\w-]*(!)?:\s*/.test(line)) return false; // :attr: val
    return true;
  });

  // Extract multi-line blocks first
  const segments = extractBlocks(filteredLines);

  const mdLines: string[] = [];

  for (const seg of segments) {
    if (typeof seg !== 'string') {
      // Block node
      const block = seg;
      if (block.kind === 'pass') {
        // raw HTML pass-through
        mdLines.push(...block.lines);
      } else if (block.kind === 'source') {
        mdLines.push('```' + (block.lang ?? ''));
        mdLines.push(...block.lines);
        mdLines.push('```');
      } else if (block.kind === 'literal') {
        mdLines.push('```');
        mdLines.push(...block.lines);
        mdLines.push('```');
      } else if (block.kind === 'table') {
        mdLines.push(tableToMd(block.lines));
      }
      mdLines.push('');
      continue;
    }

    const line = seg;

    // Skip block attribute lines like [%auto-animate], [.step], etc.
    if (/^\[.*\]\s*$/.test(line.trim())) continue;

    // Headings
    const heading = convertHeading(line);
    if (heading !== null) { mdLines.push(heading); continue; }

    // Horizontal rule
    if (line.trim() === "'''") { mdLines.push('---'); continue; }

    // Admonitions
    const admonition = convertAdmonition(line);
    if (admonition !== null) { mdLines.push(admonition); continue; }

    // List items — convert to MD list with indentation
    const listItem = isListLine(line);
    if (listItem) {
      const indent = '  '.repeat(Math.max(0, listItem.depth - 1));
      const bullet = listItem.ordered ? `${listItem.depth}.` : '-';
      mdLines.push(`${indent}${bullet} ${inlineTransform(listItem.content)}`);
      continue;
    }

    // Everything else: inline transforms
    mdLines.push(inlineTransform(line));
  }

  return mdLines.join('\n');
}
