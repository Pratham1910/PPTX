import { useEffect, useRef } from 'react';
import type {
  Element as PEl, Theme, Asset, ElementStyle,
  TextElement, HeadingElement, BulletListElement,
  ImageElement, VideoElement, CodeElement,
  CalloutElement, TableElement, DiagramElement,
  QuizElement, ButtonElement, DividerElement,
  EmbedElement, WhiteboardElement, ShapeElement,
} from '@/core/schema';

interface Props {
  element: PEl;
  theme: Theme;
  assets: Asset[];
  editing: boolean;
  onEditDone: (newContent?: string) => void;
}

// ── inline edit hook ──────────────────────────────────────────
function InlineEditable({
  value, onDone, tag = 'div', style,
}: { value: string; onDone: (v: string) => void; tag?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const Tag = tag as 'div';
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      contentEditable
      suppressContentEditableWarning
      style={{ outline: 'none', minWidth: 20, whiteSpace: 'pre-wrap', ...style }}
      onBlur={(e) => onDone(e.currentTarget.textContent ?? '')}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.currentTarget.blur(); } }}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}

// Strip HTML tags to get plain text for editing
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

// Build React CSS from element style metadata (used when contentFormat is plain)
function styleFromMeta(style?: ElementStyle, fallback?: React.CSSProperties): React.CSSProperties {
  if (!style?.text) return fallback ?? {};
  const ts = style.text;
  const wmap: Record<string, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };
  return {
    ...(fallback ?? {}),
    ...(ts.fontFamily ? { fontFamily: `'${ts.fontFamily}', system-ui, sans-serif` } : {}),
    ...(ts.sizePx     ? { fontSize: ts.sizePx }       : {}),
    ...(ts.color      ? { color: ts.color }            : {}),
    ...(ts.weight     ? { fontWeight: wmap[ts.weight] ?? ts.weight } : {}),
    ...(ts.italic     ? { fontStyle: 'italic' }        : {}),
    ...(ts.align      ? { textAlign: ts.align as React.CSSProperties['textAlign'] } : {}),
    ...(ts.lineHeight ? { lineHeight: ts.lineHeight }  : {}),
  };
}

// ─────────────────────────────────────────────────────────────

export default function CanvasElementContent({ element, theme, assets, editing, onEditDone }: Props) {
  const fg   = theme.colors.foreground;
  const pri  = theme.colors.primary;
  const mono = `'${theme.typography.monoFont}', 'Courier New', monospace`;
  const headingFont = `'${theme.typography.headingFont}', system-ui, sans-serif`;
  const bodyFont    = `'${theme.typography.bodyFont}', system-ui, sans-serif`;

  // Compute typographic scale to match preview (theme-css.ts: --ppt-text-* custom props)
  const b = theme.typography.baseSizePx;
  const r = theme.typography.scaleRatio;
  const textBase = b;
  const textLg   = b * r;
  const textXl   = b * r ** 2;
  const text2xl  = b * r ** 3;
  const text3xl  = b * r ** 4;
  // h1=3xl, h2=2xl, h3=xl, h4=lg, h5/h6=base
  const hSizes = [text3xl, text2xl, textXl, textLg, textBase, textBase];

  switch (element.type) {

    case 'text': {
      const el = element as TextElement;
      const val = String(el.content);
      const isHtml = el.contentFormat === 'html';
      const baseStyle = { fontFamily: bodyFont, fontSize: textBase, color: fg, lineHeight: 1.6 };

      if (editing) {
        const editVal = isHtml ? stripHtml(val) : val;
        return <InlineEditable value={editVal} onDone={onEditDone} style={styleFromMeta(el.style, baseStyle)} />;
      }

      if (isHtml) {
        return (
          <div
            style={{ margin: 0, lineHeight: 1.4, overflow: 'hidden', width: '100%', fontFamily: bodyFont }}
            dangerouslySetInnerHTML={{ __html: val }}
          />
        );
      }

      return <p style={{ margin: 0, whiteSpace: 'pre-wrap', ...styleFromMeta(el.style, baseStyle) }}>{val}</p>;
    }

    case 'heading': {
      const el = element as HeadingElement;
      const isHtml = el.contentFormat === 'html';
      const lvl = el.level ?? 1;
      const sz = hSizes[lvl - 1] ?? textBase;
      const col = lvl <= 2 ? pri : fg;
      const baseStyle = { margin: 0, fontSize: sz, color: col, fontFamily: headingFont, lineHeight: 1.2, fontWeight: 700 as const };

      if (editing) {
        const editVal = isHtml ? stripHtml(el.content) : el.content;
        return (
          <InlineEditable
            value={editVal}
            onDone={onEditDone}
            tag={`h${lvl}` as 'div'}
            style={styleFromMeta(el.style, baseStyle)}
          />
        );
      }

      if (isHtml) {
        return (
          <div
            style={{ margin: 0, lineHeight: 1.2, fontFamily: headingFont, overflow: 'hidden', width: '100%' }}
            dangerouslySetInnerHTML={{ __html: el.content }}
          />
        );
      }

      const hStyle = styleFromMeta(el.style, baseStyle);
      const Tag = `h${lvl}` as 'h1';
      return <Tag style={hStyle}>{el.content}</Tag>;
    }

    case 'bullet-list': {
      const el = element as BulletListElement;
      const Tag = el.ordered ? 'ol' : 'ul';
      return (
        <Tag style={{ margin: 0, paddingLeft: '1.5em', color: fg, fontSize: textBase, lineHeight: 1.5, fontFamily: bodyFont }}>
          {el.items.map((item) => (
            <li key={item.id} style={{ marginBottom: '0.4em' }}>
              {item.contentFormat === 'html'
                ? <span dangerouslySetInnerHTML={{ __html: String(item.content) }} />
                : String(item.content)}
            </li>
          ))}
        </Tag>
      );
    }

    case 'image': {
      const el = element as ImageElement;
      const asset = assets.find((a) => a.id === el.assetId);
      const src = asset?.url ?? '';
      return src ? (
        <img
          src={src}
          alt={el.alt ?? ''}
          draggable={false}
          style={{
            width: element.position.mode === 'absolute' ? '100%' : 'auto',
            height: element.position.mode === 'absolute' ? '100%' : 'auto',
            maxWidth: '100%',
            maxHeight: element.position.mode === 'absolute' ? '100%' : 360,
            objectFit: el.fit ?? 'contain',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div style={{ width: '100%', minHeight: 120, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: theme.colors.muted, fontSize: 13 }}>
          🖼 Image
        </div>
      );
    }

    case 'video': {
      const el = element as VideoElement;
      const videoAsset = el.assetId ? assets.find((a) => a.id === el.assetId) : null;
      const src = videoAsset?.url ?? el.url ?? '';

      if (!src) {
        return (
          <div style={{ width: '100%', height: '100%', minHeight: 100, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: theme.colors.muted, borderRadius: 4, fontSize: 13 }}>
            <span style={{ fontSize: 28 }}>▶</span>
            <span style={{ fontSize: 11 }}>No video source. Pick a file or paste a URL.</span>
          </div>
        );
      }

      const isEmbedUrl = src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com');
      if (isEmbedUrl) {
        let embedSrc = src;
        const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (ytMatch) embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}${el.autoplay ? '?autoplay=1&mute=1' : ''}`;
        const vmMatch = src.match(/vimeo\.com\/(\d+)/);
        if (vmMatch) embedSrc = `https://player.vimeo.com/video/${vmMatch[1]}${el.autoplay ? '?autoplay=1&muted=1' : ''}`;
        return (
          <iframe
            src={embedSrc}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: 200, borderRadius: 4 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video embed"
          />
        );
      }

      return (
        <video
          src={src}
          style={{ width: '100%', height: '100%', display: 'block', borderRadius: 4, background: '#000' }}
          controls={el.controls}
          autoPlay={el.autoplay}
          loop={el.loop}
          muted={el.muted || el.autoplay}
          playsInline
        />
      );
    }

    case 'code': {
      const el = element as unknown as { language?: string; code?: string; content?: string };
      const code = el.code ?? el.content ?? '';
      return (
        <pre style={{ margin: 0, padding: '14px 18px', background: 'rgba(0,0,0,0.4)', borderRadius: 6, fontFamily: mono, fontSize: 14, color: '#c9d1d9', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
          <code>{code}</code>
        </pre>
      );
    }

    case 'table': {
      const el = element as TableElement;
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 15, color: fg }}>
            {el.headers?.length > 0 && (
              <thead>
                <tr>
                  {el.headers.map((h, i) => (
                    <th key={i} style={{ padding: '8px 12px', borderBottom: `2px solid ${pri}`, textAlign: 'left', fontWeight: 600, color: pri }}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {el.rows?.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '7px 12px', borderBottom: `1px solid rgba(255,255,255,0.08)` }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'callout': {
      const el = element as CalloutElement;
      const variantColors: Record<string, string> = {
        warning: '#d29922', danger: '#da3633', tip: '#3fb950',
        note: '#58a6ff', success: '#3fb950', info: '#58a6ff',
      };
      const color = variantColors[el.variant ?? 'note'] ?? pri;
      return (
        <div style={{ padding: '14px 18px', background: `${color}18`, border: `1px solid ${color}44`, borderLeft: `4px solid ${color}`, borderRadius: 6 }}>
          {el.title && <p style={{ margin: '0 0 6px', fontWeight: 700, color, fontSize: 14 }}>{el.title}</p>}
          <p style={{ margin: 0, fontSize: 16, color: fg, lineHeight: 1.55 }}>{String(el.content)}</p>
        </div>
      );
    }

    case 'shape': {
      const el = element as ShapeElement;
      const fill = el.fill ?? 'transparent';
      const stroke = el.stroke ?? 'transparent';
      const strokeW = el.strokeWidth ?? 0;
      const opacity = el.opacity ?? 1;

      let path = '';
      switch (el.shape) {
        case 'rectangle':
          path = `<rect x="0" y="0" width="100" height="100" />`; break;
        case 'rounded-rectangle':
          path = `<rect x="0" y="0" width="100" height="100" rx="10" ry="10" />`; break;
        case 'circle':
        case 'ellipse':
          path = `<ellipse cx="50" cy="50" rx="50" ry="50" />`; break;
        case 'triangle':
          path = `<polygon points="50,0 100,100 0,100" />`; break;
        case 'line':
          path = `<line x1="0" y1="50" x2="100" y2="50" />`; break;
        case 'arrow':
          path = `<polygon points="0,35 75,35 75,15 100,50 75,85 75,65 0,65" />`; break;
        case 'star':
          path = `<polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" />`; break;
        case 'hexagon':
          path = `<polygon points="25,0 75,0 100,50 75,100 25,100 0,50" />`; break;
        default:
          path = `<rect x="0" y="0" width="100" height="100" />`;
      }

      const labelColor = el.style?.text?.color ?? (fill === 'transparent' ? '#000' : '#fff');

      return (
        <div style={{ position: 'relative', width: '100%', height: '100%', minWidth: 40, minHeight: 40 }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block', opacity }}
            dangerouslySetInnerHTML={{
              __html: `<g fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}">${path}</g>`,
            }}
          />
          {el.label && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: labelColor, textAlign: 'center', fontSize: '1em', padding: 4,
            }}>
              {el.label}
            </div>
          )}
        </div>
      );
    }

    case 'diagram': {
      const el = element as DiagramElement;
      return (
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', minHeight: 80, display: 'flex', alignItems: 'center', gap: 10, color: theme.colors.muted, fontSize: 14 }}>
          <span style={{ fontSize: 24 }}>⬡</span>
          <span>{el.diagramType} diagram{el.animated ? ' · ✦ animated' : ''}</span>
          <span style={{ fontSize: 11, opacity: 0.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.source.split('\n')[0]}</span>
        </div>
      );
    }

    case 'quiz': {
      const el = element as QuizElement;
      return (
        <div style={{ padding: '14px 18px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px dashed rgba(99,102,241,0.4)', color: fg, fontSize: 16 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 600 }}>❓ {el.question}</p>
          {el.options?.slice(0, 3).map((opt) => (
            <div key={opt.id} style={{ fontSize: 14, padding: '4px 0', opacity: 0.7 }}>• {String(opt.text)}</div>
          ))}
          {(el.options?.length ?? 0) > 3 && <div style={{ fontSize: 12, opacity: 0.4 }}>+ {(el.options?.length ?? 0) - 3} more…</div>}
        </div>
      );
    }

    case 'button': {
      const el = element as ButtonElement;
      return (
        <button
          style={{ padding: '12px 28px', background: pri, color: '#fff', border: 'none', borderRadius: theme.borderRadius, fontSize: 16, fontWeight: 600, cursor: 'default', pointerEvents: 'none', display: 'inline-block' }}
        >
          {el.label}
        </button>
      );
    }

    case 'divider': {
      const el = element as DividerElement;
      return (
        <hr style={{ border: 'none', borderTop: `1px ${el.lineStyle ?? 'solid'} ${theme.colors.muted}`, margin: 0, width: '100%' }} />
      );
    }

    case 'embed': {
      const el = element as EmbedElement;
      if (el.embedType === 'html' && el.htmlContent) {
        return (
          <iframe
            srcDoc={el.htmlContent}
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms allow-modals"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: 200, borderRadius: 4, pointerEvents: 'auto' }}
            title="HTML Embed"
          />
        );
      }
      if ((el.embedType === 'iframe' || el.embedType === 'pdf') && el.url) {
        return (
          <iframe
            src={el.url}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: 200, borderRadius: 4, pointerEvents: 'auto' }}
            title="Embed"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking"
            allowFullScreen
          />
        );
      }
      return (
        <div style={{ width: '100%', height: '100%', minHeight: 120, background: 'rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 6, color: theme.colors.muted, fontSize: 13, border: '1px dashed rgba(255,255,255,0.12)' }}>
          <span style={{ fontSize: 28 }}>⬡</span>
          <span>HTML / Embed</span>
          <span style={{ fontSize: 11, opacity: 0.5 }}>Pick an HTML file or paste a URL to embed content</span>
        </div>
      );
    }

    case 'whiteboard': {
      const el = element as WhiteboardElement;
      if (el.svgDataUrl) {
        return (
          <img
            src={el.svgDataUrl}
            alt="Whiteboard"
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
          />
        );
      }
      return (
        <div style={{
          width: '100%', height: '100%', minHeight: 160,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
          border: '2px dashed rgba(99,102,241,0.3)',
          borderRadius: 8, color: 'rgba(165,180,252,0.5)',
          background: 'rgba(99,102,241,0.04)',
          userSelect: 'none', pointerEvents: 'none',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M8 12h8M12 8v8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Whiteboard</span>
          <span style={{ fontSize: 11, opacity: 0.6 }}>Double-click or click "Edit Whiteboard" to draw</span>
        </div>
      );
    }

    default:
      return (
        <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: 13, color: theme.colors.muted, fontStyle: 'italic' }}>
          {element.type}
        </div>
      );
  }
}
