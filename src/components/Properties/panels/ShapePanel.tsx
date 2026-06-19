import type { ShapeElement } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';

interface Props {
  element: ShapeElement;
  slideIndex: number;
  elementIndex: number;
}

const SHAPES: Array<{ value: ShapeElement['shape']; label: string }> = [
  { value: 'rectangle',         label: 'Rectangle' },
  { value: 'rounded-rectangle', label: 'Rounded Rect' },
  { value: 'circle',            label: 'Circle' },
  { value: 'ellipse',           label: 'Ellipse' },
  { value: 'triangle',          label: 'Triangle' },
  { value: 'line',              label: 'Line' },
  { value: 'arrow',             label: 'Arrow' },
  { value: 'star',              label: 'Star' },
  { value: 'hexagon',           label: 'Hexagon' },
];

export default function ShapePanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  function patch(p: Partial<ShapeElement>) {
    updateElement(slideIndex, elementIndex, p as never);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Shape Type */}
      <label className="flex flex-col gap-1">
        <span className="field-label">Shape Type</span>
        <select
          className="field-select"
          value={element.shape}
          onChange={(e) => patch({ shape: e.target.value as ShapeElement['shape'] })}
        >
          {SHAPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="field-label">Fill Color</span>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              className="w-8 h-8 rounded cursor-pointer border border-white/10 bg-transparent flex-none"
              value={element.fill ?? '#818cf8'}
              onChange={(e) => patch({ fill: e.target.value })}
            />
            <input
              type="text"
              className="field-input text-xs font-mono"
              value={element.fill ?? '#818cf8'}
              onChange={(e) => patch({ fill: e.target.value })}
            />
          </div>
        </label>
        
        <label className="flex flex-col gap-1">
          <span className="field-label">Border Color</span>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              className="w-8 h-8 rounded cursor-pointer border border-white/10 bg-transparent flex-none"
              value={element.stroke ?? '#ffffff'}
              onChange={(e) => patch({ stroke: e.target.value })}
            />
            <input
              type="text"
              className="field-input text-xs font-mono"
              value={element.stroke ?? '#ffffff'}
              onChange={(e) => patch({ stroke: e.target.value })}
            />
          </div>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="field-label">Border Width: {element.strokeWidth ?? 0}px</span>
        <input
          type="range" min="0" max="20" step="1"
          className="w-full accent-indigo-500"
          value={element.strokeWidth ?? 0}
          onChange={(e) => patch({ strokeWidth: Number(e.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Opacity: {element.opacity ?? 1}</span>
        <input
          type="range" min="0" max="1" step="0.1"
          className="w-full accent-indigo-500"
          value={element.opacity ?? 1}
          onChange={(e) => patch({ opacity: Number(e.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Label (Optional Text inside)</span>
        <input
          type="text"
          className="field-input"
          value={element.label ?? ''}
          placeholder="Shape text..."
          onChange={(e) => patch({ label: e.target.value || undefined })}
        />
      </label>
    </div>
  );
}
