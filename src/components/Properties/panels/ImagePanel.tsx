import type { ImageElement } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';

interface Props {
  element: ImageElement;
  slideIndex: number;
  elementIndex: number;
}

const FIT_OPTIONS: ImageElement['fit'][] = ['cover', 'contain', 'fill', 'scale-down'];

export default function ImagePanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="field-label">Asset ID / URL</span>
        <input
          type="text"
          className="field-input font-mono text-xs"
          value={element.assetId}
          placeholder="asset-id or https://..."
          onChange={(e) => updateElement(slideIndex, elementIndex, { assetId: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Alt Text</span>
        <input
          type="text"
          className="field-input"
          value={element.alt}
          placeholder="Describe the image..."
          onChange={(e) => updateElement(slideIndex, elementIndex, { alt: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Caption</span>
        <input
          type="text"
          className="field-input"
          value={element.caption ?? ''}
          placeholder="Optional caption..."
          onChange={(e) =>
            updateElement(slideIndex, elementIndex, { caption: e.target.value || undefined })
          }
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Object Fit</span>
        <select
          className="field-select"
          value={element.fit}
          onChange={(e) =>
            updateElement(slideIndex, elementIndex, { fit: e.target.value as ImageElement['fit'] })
          }
        >
          {FIT_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
