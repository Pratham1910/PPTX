import type { BulletListElement, BulletItem } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';

interface Props {
  element: BulletListElement;
  slideIndex: number;
  elementIndex: number;
}

export default function BulletListPanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  function updateItem(itemIndex: number, content: string) {
    const items = element.items.map((it, i) =>
      i === itemIndex ? { ...it, content } : it,
    );
    updateElement(slideIndex, elementIndex, { items });
  }

  function addItem() {
    const newItem: BulletItem = {
      id: crypto.randomUUID(),
      content: '',
      contentFormat: 'plain',
      level: 0,
    };
    updateElement(slideIndex, elementIndex, { items: [...element.items, newItem] });
  }

  function removeItem(itemIndex: number) {
    const items = element.items.filter((_, i) => i !== itemIndex);
    updateElement(slideIndex, elementIndex, { items });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="field-label mb-0">
          {element.ordered ? 'Ordered' : 'Unordered'} List
        </span>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={element.ordered}
            onChange={(e) => updateElement(slideIndex, elementIndex, { ordered: e.target.checked })}
            className="accent-indigo-500"
          />
          Ordered
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        {element.items.map((item, i) => (
          <div key={item.id} className="flex gap-1.5 items-center">
            <span className="text-xs text-gray-500 w-4 text-right flex-none">{i + 1}.</span>
            <input
              type="text"
              className="field-input flex-1"
              value={item.content}
              placeholder="Item text..."
              onChange={(e) => updateItem(i, e.target.value)}
            />
            <button
              className="text-gray-500 hover:text-red-400 transition-colors px-1 flex-none"
              onClick={() => removeItem(i)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        className="btn-ghost text-xs w-full border border-dashed border-white/15 hover:border-white/30"
        onClick={addItem}
      >
        + Add Item
      </button>
    </div>
  );
}
