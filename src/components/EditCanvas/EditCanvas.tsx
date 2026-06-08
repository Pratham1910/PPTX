import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import ElementWidget, { CANVAS_W, CANVAS_H } from './ElementWidget.tsx';
import type { Slide, Theme } from '@/core/schema';

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

  return (
    <div
      ref={containerRef}
      className="flex flex-1 items-center justify-center bg-[#090b10] overflow-hidden"
      style={{ minHeight: 0 }}
    >
      {/* Edit mode banner */}
      <div
        style={{
          position: 'absolute', top: 44, left: 200, right: 280, zIndex: 40,
          background: 'rgba(99,102,241,0.12)', borderBottom: '1px solid rgba(99,102,241,0.3)',
          padding: '3px 12px', fontSize: 11, color: '#a5b4fc',
          display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
        }}
      >
        <span>✏️ Edit Mode</span>
        <span style={{ opacity: 0.6 }}>Drag elements to move · Double-click text to edit · Drag handles to resize</span>
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
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.5)',
            fontFamily: `'${theme.typography.bodyFont}', system-ui, sans-serif`,
            color: theme.colors.foreground,
            ...bgStyle,
          }}
          onClick={() => selectElement(null)}
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
        </div>
      </div>
    </div>
  );
}
