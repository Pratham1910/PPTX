import type { VideoElement } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';
import FilePickerField from '../../shared/FilePickerField.tsx';

interface Props {
  element: VideoElement;
  slideIndex: number;
  elementIndex: number;
}

export default function VideoPanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  function patch(changes: Partial<VideoElement>) {
    updateElement(slideIndex, elementIndex, changes as never);
  }

  const sourceValue = element.assetId ?? element.url ?? '';

  function handleSourceChange(val: string) {
    if (val.startsWith('data:') || val === '') {
      patch({ assetId: val || undefined, url: undefined });
    } else {
      patch({ url: val, assetId: undefined });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FilePickerField
        label="Video Source"
        accept="video/*"
        value={sourceValue}
        placeholder="https://… YouTube / Vimeo / .mp4"
        onChange={handleSourceChange}
      />

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

      {/* Playback toggles */}
      <div className="flex flex-col gap-1.5">
        <span className="field-label">Playback Options</span>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { key: 'controls', label: 'Controls' },
              { key: 'autoplay', label: 'Autoplay' },
              { key: 'loop',     label: 'Loop' },
              { key: 'muted',    label: 'Muted' },
            ] as const
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={element[key] ?? false}
                onChange={(e) => patch({ [key]: e.target.checked })}
                className="accent-indigo-500"
              />
              <span className="text-xs text-gray-300">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
