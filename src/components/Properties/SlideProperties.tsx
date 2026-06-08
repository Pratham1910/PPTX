import type { Slide, SlideLayout } from '@/core/schema';
import { useEditorStore } from '../../store/useEditorStore.ts';

const LAYOUTS: SlideLayout[] = [
  'content', 'cover', 'section', 'two-column', 'three-column',
  'image-left', 'image-right', 'full-image', 'full-video', 'quote', 'blank',
];

interface Props {
  slide: Slide;
  slideIndex: number;
}

export default function SlideProperties({ slide, slideIndex }: Props) {
  const { updateSlideTitle, updateSlideNotes, updateSlideLayout, updateSlideAutoAnimate } = useEditorStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="panel-section">
        <p className="panel-section-title">Slide</p>
        <div className="flex flex-col gap-3">
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
        </div>
      </div>

      <div className="panel-section">
        <p className="panel-section-title">Speaker Notes</p>
        <textarea
          className="field-textarea w-full min-h-[80px]"
          value={slide.notes ?? ''}
          placeholder="Add speaker notes..."
          onChange={(e) => updateSlideNotes(slideIndex, e.target.value)}
        />
      </div>

      <div className="panel-section">
        <p className="panel-section-title">Auto-Animate</p>
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
        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
          Adjacent slides sharing the same Group ID will morph elements with matching{' '}
          <code className="bg-white/10 px-0.5 rounded">id</code> between them (Reveal.js auto-animate).
        </p>
      </div>

      <div className="panel-section">
        <div className="flex items-center justify-between mb-2">
          <p className="panel-section-title mb-0">Elements ({slide.elements.length})</p>
        </div>
        <p className="text-xs text-gray-500">
          Click an element below to edit its properties.
        </p>
      </div>
    </div>
  );
}
