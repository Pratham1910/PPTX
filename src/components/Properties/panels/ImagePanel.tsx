import type { ImageElement } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';
import FilePickerField from '../../shared/FilePickerField.tsx';

interface Props {
  element: ImageElement;
  slideIndex: number;
  elementIndex: number;
}

const FIT_OPTIONS: ImageElement['fit'][] = ['cover', 'contain', 'fill', 'scale-down'];

export default function ImagePanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  function patch(changes: Partial<ImageElement>) {
    updateElement(slideIndex, elementIndex, changes as never);
  }

  return (
    <div className="flex flex-col gap-3">
      <FilePickerField
        label="Image / SVG Source"
        accept="image/*,image/svg+xml"
        value={element.assetId}
        placeholder="https://… or pick a file below"
        onChange={(val) => patch({ assetId: val })}
      />

      <label className="flex flex-col gap-1">
        <span className="field-label">Alt Text</span>
        <input
          type="text"
          className="field-input"
          value={element.alt}
          placeholder="Describe the image…"
          onChange={(e) => patch({ alt: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Caption</span>
        <input
          type="text"
          className="field-input"
          value={element.caption ?? ''}
          placeholder="Optional caption…"
          onChange={(e) => patch({ caption: e.target.value || undefined })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Object Fit</span>
        <select
          className="field-select"
          value={element.fit}
          onChange={(e) => patch({ fit: e.target.value as ImageElement['fit'] })}
        >
          {FIT_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
