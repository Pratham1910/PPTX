import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import ElementWidget, { CANVAS_W, CANVAS_H } from './ElementWidget.tsx';
import ContextMenu from '../ContextMenu/ContextMenu.tsx';
import type { Slide, Theme, Element as PresentationElement } from '@/core/schema';

function slideBackground(slide: Slide, theme: Theme): React.CSSProperties {
  const bg = slide.background;
  if (bg?.type === 'color' && bg.color) return { background: bg.color };
  if (bg?.type === 'gradient' && bg.gradient) {
    const stops = bg.gradient.stops.map((s) => `${s.color} ${s.position}%`).join(', ');
    const angle = bg.gradient.angle ?? 135;
    return { background: `linear-gradient(${angle}deg, ${stops})` };
  }
  return { background: theme.colors.background };
}

export default function EditCanvas() {
  const {
    presentation, selectedSlideIndex, selectedElementIndex, selectElement,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.min((width - 48) / CANVAS_W, (height - 48) / CANVAS_H));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const slide = presentation.slides[selectedSlideIndex];
  if (!slide) return null;

  const theme   = presentation.theme;
  const bgStyle = slideBackground(slide, theme);

  const flowEls = slide.elements.filter((el) => el.position.mode !== 'absolute');
  const absEls  = slide.elements.filter((el) => el.position.mode === 'absolute');

  const sharedProps = {
    slideIndex: selectedSlideIndex,
    canvasRef:  canvasRef as React.RefObject<HTMLDivElement>,
    scale,
    theme,
    assets: presentation.assets,
  };

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedElementIndex === null) return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const selectedElement = selectedElementIndex !== null ? slide.elements[selectedElementIndex] : null;

  const handleDuplicate = () => {
    if (!selectedElement) return;
    const { addElement } = useEditorStore.getState();
    const newEl = {
      ...selectedElement,
      id: crypto.randomUUID(),
    };
    if (newEl.position.mode === 'absolute') {
      newEl.position = {
        ...newEl.position,
        x: (newEl.position.x || 0) + 2,
        y: (newEl.position.y || 0) + 2,
      };
    }
    addElement(selectedSlideIndex, newEl);
  };

  const handleBringForward = () => {
    if (!selectedElement || selectedElement.position.mode !== 'absolute') return;
    const { updateElement } = useEditorStore.getState();
    updateElement(selectedSlideIndex, selectedElementIndex!, {
      position: { ...selectedElement.position, zIndex: (selectedElement.position.zIndex || 1) + 1 }
    } as Partial<PresentationElement>);
  };

  const handleSendBackward = () => {
    if (!selectedElement || selectedElement.position.mode !== 'absolute') return;
    const { updateElement } = useEditorStore.getState();
    updateElement(selectedSlideIndex, selectedElementIndex!, {
      position: { ...selectedElement.position, zIndex: Math.max(1, (selectedElement.position.zIndex || 1) - 1) }
    } as Partial<PresentationElement>);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-1 items-center justify-center bg-surface-900 overflow-hidden relative"
      style={{ 
        minHeight: 0,
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        backgroundPosition: 'center center'
      }}
    >
      {/* Subtle hint */}
      <div
        style={{
          position: 'absolute', top: 44, left: 200, right: 280, zIndex: 40,
          padding: '2px 12px', fontSize: 10, color: 'rgba(148,163,184,0.4)',
          display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
          letterSpacing: '0.03em',
        }}
      >
        Click to select · Double-click to edit text · Drag to move
      </div>

      {/* Canvas wrapper — occupies exactly scaled size so it stays centred */}
      <div style={{ width: CANVAS_W * scale, height: CANVAS_H * scale, position: 'relative', flexShrink: 0 }}>
        <div
          ref={canvasRef}
          style={{
            position: 'absolute',
            width:  CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
            fontFamily: `'${theme.typography.bodyFont}', system-ui, sans-serif`,
            color: theme.colors.foreground,
            ...bgStyle,
          }}
          onClick={() => selectElement(null)}
          onContextMenu={handleContextMenu}
        >
          {/* Flow elements — stacked in their natural order */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.elementGap,
              padding: `${theme.spacing.slidePaddingY}px ${theme.spacing.slidePaddingX}px`,
              pointerEvents: 'none',
            }}
          >
            {flowEls.map((el) => {
              const idx = slide.elements.indexOf(el);
              return (
                <div key={el.id} style={{ pointerEvents: 'auto' }}>
                  <ElementWidget
                    element={el}
                    elementIndex={idx}
                    isSelected={idx === selectedElementIndex}
                    {...sharedProps}
                  />
                </div>
              );
            })}
          </div>

          {/* Absolute elements — freely positioned */}
          {absEls.map((el) => {
            const idx = slide.elements.indexOf(el);
            return (
              <ElementWidget
                key={el.id}
                element={el}
                elementIndex={idx}
                isSelected={idx === selectedElementIndex}
                {...sharedProps}
              />
            );
          })}

          {/* Empty State Overlay */}
          {slide.elements.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none select-none">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-xl shadow-black/20">
                <span className="text-4xl opacity-50 drop-shadow-lg">✨</span>
              </div>
              <h3 className="text-3xl font-bold tracking-tight text-gray-300 drop-shadow-md">Beautifully Empty</h3>
              <p className="text-base text-gray-500 max-w-md text-center leading-relaxed">
                This slide is waiting for your ideas. Insert text, media, or shapes from the right panel to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {contextMenu && selectedElementIndex !== null && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'Duplicate', icon: '📋', onClick: handleDuplicate },
            { divider: true, label: '', onClick: () => {} },
            { label: 'Bring Forward', icon: '⬆️', onClick: handleBringForward },
            { label: 'Send Backward', icon: '⬇️', onClick: handleSendBackward },
            { divider: true, label: '', onClick: () => {} },
            { 
              label: 'Delete', 
              icon: '🗑️', 
              danger: true, 
              onClick: () => {
                const { deleteElement } = useEditorStore.getState();
                deleteElement(selectedSlideIndex, selectedElementIndex);
              } 
            },
          ]}
        />
      )}
    </div>
  );
}
