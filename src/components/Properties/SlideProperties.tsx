import type { Slide, SlideLayout, SlideBackground, TransitionConfig } from '@/core/schema';
import { useEditorStore } from '../../store/useEditorStore.ts';

const LAYOUTS: SlideLayout[] = [
  'content', 'cover', 'section', 'two-column', 'three-column',
  'image-left', 'image-right', 'full-image', 'full-video', 'quote', 'blank',
];

const TRANSITIONS: Array<{ value: TransitionConfig['type']; label: string }> = [
  { value: 'none',    label: 'None' },
  { value: 'fade',    label: 'Fade' },
  { value: 'slide',   label: 'Slide' },
  { value: 'convex',  label: 'Convex' },
  { value: 'concave', label: 'Concave' },
  { value: 'zoom',    label: 'Zoom' },
];

interface Props {
  slide: Slide;
  slideIndex: number;
}

export default function SlideProperties({ slide, slideIndex }: Props) {
  const {
    updateSlideTitle,
    updateSlideNotes,
    updateSlideLayout,
    updateSlideAutoAnimate,
    updateSlideBackground,
    updateSlideTransition,
  } = useEditorStore();

  // Background helpers
  const bg = slide.background;
  const bgType = bg?.type ?? 'none';

  function setBgType(type: SlideBackground['type']) {
    if (type === 'none')  return updateSlideBackground(slideIndex, { type: 'none' });
    if (type === 'color') return updateSlideBackground(slideIndex, { type: 'color', color: '#1e293b' });
    if (type === 'gradient') return updateSlideBackground(slideIndex, {
      type: 'gradient',
      gradient: { type: 'linear', angle: 135, stops: [{ color: '#6366f1', position: 0 }, { color: '#a855f7', position: 100 }] },
    });
  }

  // Transition helpers
  const transitionType: TransitionConfig['type'] = slide.transition?.in?.type ?? 'none';

  function setTransition(type: TransitionConfig['type']) {
    if (type === 'none') {
      updateSlideTransition(slideIndex, undefined);
    } else {
      updateSlideTransition(slideIndex, { in: { type }, out: { type } });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <details className="accordion-section" open>
        <summary>Slide Layout</summary>
        <div className="accordion-content">
          <label className="flex flex-col gap-1">
            <span className="field-label">Title</span>
            <input
              type="text"
              className="field-input"
              value={slide.title ?? ''}
              placeholder="Slide title..."
              onChange={(e) => updateSlideTitle(slideIndex, e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="field-label">Layout</span>
            <select
              className="field-select"
              value={slide.layout}
              onChange={(e) => updateSlideLayout(slideIndex, e.target.value as SlideLayout)}
            >
              {LAYOUTS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>

          {/* Transition picker */}
          <label className="flex flex-col gap-1">
            <span className="field-label">Slide Transition</span>
            <select
              className="field-select"
              value={transitionType}
              onChange={(e) => setTransition(e.target.value as TransitionConfig['type'])}
            >
              {TRANSITIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>
      </details>

      {/* Background Picker */}
      <details className="accordion-section" open>
        <summary>
          Background
        </summary>
        <div className="accordion-content">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-1">
            {(['none', 'color', 'gradient'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setBgType(t)}
                className={`py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border transition-all ${
                  bgType === t
                    ? 'bg-accent/15 border-accent/50 text-accent'
                    : 'bg-surface-900 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Color picker */}
          {bgType === 'color' && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                className="w-10 h-8 rounded cursor-pointer border border-white/10 bg-transparent"
                value={bg?.color ?? '#1e293b'}
                onChange={(e) => updateSlideBackground(slideIndex, { type: 'color', color: e.target.value })}
              />
              <input
                type="text"
                className="field-input flex-1 font-mono text-xs"
                value={bg?.color ?? '#1e293b'}
                onChange={(e) => updateSlideBackground(slideIndex, { type: 'color', color: e.target.value })}
              />
            </div>
          )}

          {/* Gradient picker */}
          {bgType === 'gradient' && bg?.gradient && (
            <div className="flex flex-col gap-2 mt-2">
              <div
                className="w-full h-10 rounded-md border border-white/10"
                style={{
                  background: `linear-gradient(${bg.gradient.angle ?? 135}deg, ${bg.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="field-label">Start</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      className="w-7 h-7 rounded cursor-pointer border border-white/10 bg-transparent flex-none"
                      value={bg.gradient.stops[0]?.color ?? '#6366f1'}
                      onChange={(e) => {
                        const stops = [...bg.gradient!.stops];
                        stops[0] = { ...stops[0], color: e.target.value };
                        updateSlideBackground(slideIndex, { ...bg, gradient: { ...bg.gradient!, stops } });
                      }}
                    />
                    <span className="text-[10px] text-gray-500 font-mono">{bg.gradient.stops[0]?.color}</span>
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="field-label">End</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      className="w-7 h-7 rounded cursor-pointer border border-white/10 bg-transparent flex-none"
                      value={bg.gradient.stops[1]?.color ?? '#a855f7'}
                      onChange={(e) => {
                        const stops = [...bg.gradient!.stops];
                        stops[1] = { ...stops[1], color: e.target.value };
                        updateSlideBackground(slideIndex, { ...bg, gradient: { ...bg.gradient!, stops } });
                      }}
                    />
                    <span className="text-[10px] text-gray-500 font-mono">{bg.gradient.stops[1]?.color}</span>
                  </div>
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="field-label">Angle: {bg.gradient.angle ?? 135}°</span>
                <input
                  type="range" min="0" max="360" step="5"
                  className="w-full accent-indigo-500"
                  value={bg.gradient.angle ?? 135}
                  onChange={(e) =>
                    updateSlideBackground(slideIndex, {
                      ...bg,
                      gradient: { ...bg.gradient!, angle: Number(e.target.value) },
                    })
                  }
                />
              </label>
            </div>
          )}
        </div>
      </details>

      <details className="accordion-section">
        <summary>Speaker Notes</summary>
        <div className="accordion-content">
          <textarea
            className="field-textarea w-full min-h-[80px]"
            value={slide.notes ?? ''}
            placeholder="Add speaker notes..."
            onChange={(e) => updateSlideNotes(slideIndex, e.target.value)}
          />
        </div>
      </details>

      <details className="accordion-section">
        <summary>Auto-Animate</summary>
        <div className="accordion-content">
          <label className="flex flex-col gap-1">
            <span className="field-label">Morph Group ID</span>
            <input
              type="text"
              className="field-input font-mono text-xs"
              value={slide.autoAnimateId ?? ''}
              placeholder="e.g. group-1 (leave blank to disable)"
              onChange={(e) => updateSlideAutoAnimate(slideIndex, e.target.value || undefined)}
            />
          </label>
          <p className="text-[10px] text-gray-500 leading-snug">
            Adjacent slides sharing the same Group ID will morph elements with matching{' '}
            <code className="bg-white/10 px-0.5 rounded">id</code> between them.
          </p>
        </div>
      </details>

      <details className="accordion-section" open>
        <summary>Elements ({slide.elements.length})</summary>
        <div className="accordion-content">
          <p className="text-xs text-gray-500">
            Click an element below to edit its properties.
          </p>
        </div>
      </details>
    </div>
  );
}
