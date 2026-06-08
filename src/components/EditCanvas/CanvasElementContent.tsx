import { useEffect, useRef } from 'react';
import type {
  Element as PEl, Theme, Asset,
  TextElement, HeadingElement, BulletListElement,
  ImageElement, VideoElement, CodeElement,
  CalloutElement, TableElement, DiagramElement,
  QuizElement, ButtonElement, DividerElement,
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

// ─────────────────────────────────────────────────────────────

export default function CanvasElementContent({ element, theme, assets, editing, onEditDone }: Props) {
  const fg  = theme.colors.foreground;
  const pri = theme.colors.primary;
  const mono = `'${theme.typography.monoFont}', 'Courier New', monospace`;
  const heading = `'${theme.typography.headingFont}', system-ui, sans-serif`;

  switch (element.type) {

    case 'text': {
      const el = element as TextElement;
      const val = String(el.content);
      if (editing) return <InlineEditable value={val} onDone={onEditDone} style={{ fontSize: 20, color: fg, lineHeight: 1.6 }} />;
      return <p style={{ margin: 0, fontSize: 20, color: fg, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{val}</p>;
    }

    case 'heading': {
      const el = element as HeadingElement;
      const sizes = [56, 44, 34, 26, 21, 18];
      const sz = sizes[(el.level ?? 1) - 1] ?? 28;
      const col = el.level <= 2 ? pri : fg;
      if (editing) {
        return (
          <InlineEditable
            value={el.content}
            onDone={onEditDone}
            tag={`h${el.level}` as 'div'}
            style={{ margin: 0, fontSize: sz, color: col, fontFamily: heading, lineHeight: 1.2, fontWeight: 700 }}
          />
        );
      }
      const Tag = `h${el.level ?? 1}` as 'h1';
      return (
        <Tag style={{ margin: 0, fontSize: sz, color: col, fontFamily: heading, lineHeight: 1.2, fontWeight: 700 }}>
          {el.content}
        </Tag>
      );
    }

    case 'bullet-list': {
      const el = element as BulletListElement;
      const Tag = el.ordered ? 'ol' : 'ul';
      return (
        <Tag style={{ margin: 0, paddingLeft: 28, color: fg, fontSize: 19, lineHeight: 1.7 }}>
          {el.items.map((item) => (
            <li key={item.id} style={{ marginBottom: 4 }}>{String(item.content)}</li>
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
          style={{ width: '100%', height: '100%', objectFit: el.fit ?? 'contain', display: 'block', pointerEvents: 'none' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', minHeight: 120, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: theme.colors.muted, fontSize: 13 }}>
          🖼 Image
        </div>
      );
    }

    case 'video': {
      const el = element as VideoElement;
      return (
        <div style={{ width: '100%', height: '100%', minHeight: 100, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: theme.colors.muted, borderRadius: 4, fontSize: 13 }}>
          <span style={{ fontSize: 28 }}>▶</span>
          <span style={{ fontSize: 11, maxWidth: 240, textAlign: 'center', wordBreak: 'break-all' }}>{el.url}</span>
        </div>
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

    default:
      return (
        <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: 13, color: theme.colors.muted, fontStyle: 'italic' }}>
          {element.type}
        </div>
      );
  }
}
