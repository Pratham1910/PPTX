import type { CalloutElement } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';

interface Props {
  element: CalloutElement;
  slideIndex: number;
  elementIndex: number;
}

const VARIANTS: CalloutElement['variant'][] = ['info', 'warning', 'danger', 'success', 'tip', 'note'];

const VARIANT_COLORS: Record<CalloutElement['variant'], string> = {
  info:    'text-blue-400',
  warning: 'text-yellow-400',
  danger:  'text-red-400',
  success: 'text-green-400',
  tip:     'text-teal-400',
  note:    'text-gray-400',
};

export default function CalloutPanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="field-label">Variant</span>
        <select
          className="field-select"
          value={element.variant}
          onChange={(e) =>
            updateElement(slideIndex, elementIndex, {
              variant: e.target.value as CalloutElement['variant'],
            })
          }
        >
          {VARIANTS.map((v) => (
            <option key={v} value={v} className={VARIANT_COLORS[v]}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Title (optional)</span>
        <input
          type="text"
          className="field-input"
          value={element.title ?? ''}
          placeholder="Callout title..."
          onChange={(e) =>
            updateElement(slideIndex, elementIndex, { title: e.target.value || undefined })
          }
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Content</span>
        <textarea
          className="field-textarea min-h-[80px]"
          value={element.content}
          onChange={(e) =>
            updateElement(slideIndex, elementIndex, { content: e.target.value, contentFormat: 'plain' })
          }
        />
      </label>
    </div>
  );
}
