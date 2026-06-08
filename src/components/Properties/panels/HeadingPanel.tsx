import type { HeadingElement, ElementStyle } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';
import FontStylePanel from './FontStylePanel.tsx';

interface Props {
  element: HeadingElement;
  slideIndex: number;
  elementIndex: number;
}

export default function HeadingPanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="field-label">Text</span>
        <input
          type="text"
          className="field-input"
          value={element.content}
          onChange={(e) => updateElement(slideIndex, elementIndex, { content: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="field-label">Level</span>
        <select
          className="field-select"
          value={element.level}
          onChange={(e) =>
            updateElement(slideIndex, elementIndex, {
              level: Number(e.target.value) as HeadingElement['level'],
            })
          }
        >
          {([1, 2, 3, 4, 5, 6] as const).map((l) => (
            <option key={l} value={l}>H{l} — {['Display', 'Title', 'Heading', 'Subheading', 'Caption', 'Fine'][l - 1]}</option>
          ))}
        </select>
      </label>

      <div className="border-t border-white/10 pt-3">
        <p className="field-label mb-2">Font & Style</p>
        <FontStylePanel
          style={element.style}
          onChange={(patch: Partial<ElementStyle>) =>
            updateElement(slideIndex, elementIndex, {
              style: { ...element.style, ...patch },
            })
          }
        />
      </div>
    </div>
  );
}
