import { useRef, useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import type { Element as PEl, Theme, Asset, ElementPosition, WhiteboardElement } from '@/core/schema';
import CanvasElementContent from './CanvasElementContent.tsx';
import WhiteboardModal from '../Whiteboard/WhiteboardModal.tsx';

export const CANVAS_W = 1600;
export const CANVAS_H = 900;

const HANDLES = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'] as const;
type Handle = typeof HANDLES[number];

const HANDLE_CURSORS: Record<Handle, string> = {
  tl: 'nwse-resize', tc: 'ns-resize', tr: 'nesw-resize',
  ml: 'ew-resize',   mr: 'ew-resize',
  bl: 'nesw-resize', bc: 'ns-resize', br: 'nwse-resize',
};

interface Props {
  element: PEl;
  elementIndex: number;
  slideIndex: number;
  canvasRef: React.RefObject<HTMLDivElement>;
  scale: number;
  isSelected: boolean;
  theme: Theme;
  assets: Asset[];
}

function applyResizeDelta(
  orig: { x: number; y: number; w: number; h: number },
  dx: number, dy: number, handle: Handle,
): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = orig;
  const minW = 4, minH = 3; // in % of canvas
  if (handle.includes('l')) { const nx = Math.min(x + dx, x + w - minW); w = w - (nx - x); x = nx; }
  if (handle.includes('r')) { w = Math.max(minW, w + dx); }
  if (handle.includes('t')) { const ny = Math.min(y + dy, y + h - minH); h = h - (ny - y); y = ny; }
  if (handle === 'bc' || handle.includes('b')) { h = Math.max(minH, h + dy); }
  return { x, y, w, h };
}

export default function ElementWidget({ element, elementIndex, slideIndex, canvasRef, scale, isSelected, theme, assets }: Props) {
  const { selectElement, updateElement } = useEditorStore();
  const widgetRef = useRef<HTMLDivElement>(null);
  const [hover, setHover]         = useState(false);
  const [editing, setEditing]     = useState(false);
  const [livePos, setLivePos]     = useState<ElementPosition | null>(null);
  const [wbOpen, setWbOpen]       = useState(false);

  const isAbs = element.position.mode === 'absolute';
  const displayPos = livePos ?? (isAbs ? element.position : null);

  // ── helpers ──────────────────────────────────────────────────
  function toCanvasPct(clientDx: number, clientDy: number) {
    return { dx: clientDx / scale / CANVAS_W * 100, dy: clientDy / scale / CANVAS_H * 100 };
  }

  function getElementCanvasRect() {
    const el = widgetRef.current;
    const cv = canvasRef.current;
    if (!el || !cv) return null;
    const er = el.getBoundingClientRect();
    const cr = cv.getBoundingClientRect();
    return {
      x: (er.left - cr.left) / scale / CANVAS_W * 100,
      y: (er.top  - cr.top)  / scale / CANVAS_H * 100,
      w: er.width  / scale / CANVAS_W * 100,
      h: er.height / scale / CANVAS_H * 100,
    };
  }

  // ── drag to move ─────────────────────────────────────────────
  function onDragStart(e: React.MouseEvent) {
    if (editing) return;
    e.stopPropagation();
    e.preventDefault();

    selectElement(elementIndex);

    const rawRect = getElementCanvasRect();
    if (!rawRect) return;

    // If the element was in flow mode (no explicit position) its measured
    // DOM rect may span nearly the full canvas. Cap it to a sensible default
    // size so the converted absolute element isn't giant.
    const isFlow = element.position.mode !== 'absolute';
    const MAX_W = 50; // max 50% canvas width when snapping from flow
    const MAX_H = 50; // max 50% canvas height
    const startRect = isFlow
      ? {
          x: rawRect.x,
          y: rawRect.y,
          w: Math.min(rawRect.w, MAX_W),
          h: Math.min(rawRect.h, MAX_H),
        }
      : rawRect;

    const startMouse = { x: e.clientX, y: e.clientY };

    const onMove = (me: MouseEvent) => {
      const { dx, dy } = toCanvasPct(me.clientX - startMouse.x, me.clientY - startMouse.y);
      setLivePos({
        mode: 'absolute',
        x: Math.max(0, Math.min(100 - startRect.w, startRect.x + dx)),
        y: Math.max(0, Math.min(100 - startRect.h, startRect.y + dy)),
        width: startRect.w,
        height: startRect.h,
      });
    };

    const onUp = (me: MouseEvent) => {
      const { dx, dy } = toCanvasPct(me.clientX - startMouse.x, me.clientY - startMouse.y);
      if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
        updateElement(slideIndex, elementIndex, {
          position: {
            mode: 'absolute',
            x: Math.max(0, Math.min(100 - startRect.w, startRect.x + dx)),
            y: Math.max(0, Math.min(100 - startRect.h, startRect.y + dy)),
            width: startRect.w,
            height: startRect.h,
          },
        } as Partial<PEl>);
      }
      setLivePos(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── resize ───────────────────────────────────────────────────
  function onResizeStart(e: React.MouseEvent, handle: Handle) {
    e.stopPropagation();
    e.preventDefault();

    const startRect = getElementCanvasRect();
    if (!startRect) return;
    const startMouse = { x: e.clientX, y: e.clientY };

    const onMove = (me: MouseEvent) => {
      const { dx, dy } = toCanvasPct(me.clientX - startMouse.x, me.clientY - startMouse.y);
      const r = applyResizeDelta(startRect, dx, dy, handle);
      setLivePos({ mode: 'absolute', x: r.x, y: r.y, width: r.w, height: r.h });
    };

    const onUp = (me: MouseEvent) => {
      const { dx, dy } = toCanvasPct(me.clientX - startMouse.x, me.clientY - startMouse.y);
      const r = applyResizeDelta(startRect, dx, dy, handle);
      updateElement(slideIndex, elementIndex, {
        position: { mode: 'absolute', x: r.x, y: r.y, width: r.w, height: r.h },
      } as Partial<PEl>);
      setLivePos(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── return to flow ───────────────────────────────────────────
  function resetToFlow() {
    updateElement(slideIndex, elementIndex, {
      position: { mode: 'flow' },
    } as Partial<PEl>);
    setLivePos(null);
  }

  // ── position styles ──────────────────────────────────────────
  const rotate = element.position.rotate;
  const containerStyle: React.CSSProperties = displayPos
    ? {
        position: 'absolute',
        left:   `${displayPos.x ?? 0}%`,
        top:    `${displayPos.y ?? 0}%`,
        width:  displayPos.width  ? `${displayPos.width}%`  : 'auto',
        height: displayPos.height ? `${displayPos.height}%` : 'auto',
        zIndex: element.position.zIndex ?? 1,
        minWidth: 40,
        minHeight: 24,
        overflow: editing ? 'visible' : 'hidden',
        ...(rotate ? { transform: `rotate(${rotate}deg)`, transformOrigin: 'center center' } : {}),
      }
    : {};

  const outline = isSelected
    ? '1.5px solid #6366f1'
    : hover ? '1px solid rgba(99,102,241,0.45)' : '1px solid transparent';

  const showHandles = isSelected && !!displayPos;
  const canEdit = ['text', 'heading', 'bullet-list'].includes(element.type);
  const isWhiteboard = element.type === 'whiteboard';

  function handlePositionStyle(h: Handle): React.CSSProperties {
    const base: React.CSSProperties = {
      position: 'absolute', width: 11, height: 11,
      background: '#ffffff', border: '1.5px solid #6366f1',
      borderRadius: '50%', transform: 'translate(-50%, -50%)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      cursor: HANDLE_CURSORS[h], zIndex: 20, pointerEvents: 'auto',
    };
    if (h === 'tl') return { ...base, left: 0,     top: 0 };
    if (h === 'tc') return { ...base, left: '50%',  top: 0 };
    if (h === 'tr') return { ...base, left: '100%', top: 0 };
    if (h === 'ml') return { ...base, left: 0,     top: '50%' };
    if (h === 'mr') return { ...base, left: '100%', top: '50%' };
    if (h === 'bl') return { ...base, left: 0,     top: '100%' };
    if (h === 'bc') return { ...base, left: '50%',  top: '100%' };
    return           { ...base, left: '100%', top: '100%' }; // br
  }

  return (
    <>
    <div
      ref={widgetRef}
      style={{
        ...containerStyle,
        outline,
        outlineOffset: 2,
        cursor: editing ? 'text' : 'move',
        userSelect: editing ? 'text' : 'none',
        boxSizing: 'border-box',
        position: displayPos ? 'absolute' : 'relative',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); selectElement(elementIndex); }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (isWhiteboard) { setWbOpen(true); return; }
        if (canEdit) setEditing(true);
      }}
      onMouseDown={editing ? undefined : onDragStart}
    >
      {/* Floating label when selected */}
      {isSelected && !editing && (
        <div
          style={{
            position: 'absolute', top: 0, left: 0, transform: 'translateY(-100%)',
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#6366f1', color: '#fff',
            fontSize: 10, padding: '2px 8px', borderRadius: '4px 4px 0 0',
            pointerEvents: 'auto', zIndex: 30, whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontWeight: 600 }}>{element.type}</span>
          {!displayPos && <span style={{ opacity: 0.75 }}>· drag to reposition</span>}
          {displayPos && (
            <button
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 10, opacity: 0.8, padding: '0 0 0 4px', textDecoration: 'underline' }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); resetToFlow(); }}
            >
              reset to flow
            </button>
          )}
        </div>
      )}

      {/* Element content */}
      <CanvasElementContent
        element={element}
        theme={theme}
        assets={assets}
        editing={editing}
        onEditDone={(val) => {
          if (val !== undefined) updateElement(slideIndex, elementIndex, { content: val } as Partial<PEl>);
          setEditing(false);
        }}
      />

      {/* Resize handles */}
      {showHandles && HANDLES.map((h) => (
        <div key={h} style={handlePositionStyle(h)} onMouseDown={(e) => onResizeStart(e, h)} />
      ))}

      {/* Whiteboard "Edit" overlay — visible when selected */}
      {isWhiteboard && isSelected && !wbOpen && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setWbOpen(true); }}
          style={{
            position: 'absolute', bottom: 8, right: 8, zIndex: 25,
            padding: '5px 12px', borderRadius: 6,
            background: '#4f46e5', border: '1px solid rgba(99,102,241,0.5)',
            color: '#fff', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          ✏️ Edit Whiteboard
        </button>
      )}
    </div>

    {/* Whiteboard full-screen modal — portal-like fixed overlay */}
    {wbOpen && (
      <WhiteboardModal
        snapshot={(element as WhiteboardElement).snapshot}
        onClose={() => setWbOpen(false)}
        onSave={(snap, svgDataUrl) => {
          updateElement(slideIndex, elementIndex, {
            snapshot: snap,
            svgDataUrl,
          } as Partial<PEl>);
          setWbOpen(false);
        }}
      />
    )}
    </>
  );
}
