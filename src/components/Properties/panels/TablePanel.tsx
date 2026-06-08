import type { TableElement } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';

interface Props {
  element: TableElement;
  slideIndex: number;
  elementIndex: number;
}

export default function TablePanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  function updateHeader(col: number, value: string) {
    const headers = element.headers.map((h, i) => (i === col ? value : h));
    updateElement(slideIndex, elementIndex, { headers });
  }

  function updateCell(row: number, col: number, value: string) {
    const rows = element.rows.map((r, ri) =>
      ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r,
    );
    updateElement(slideIndex, elementIndex, { rows });
  }

  function addRow() {
    const emptyRow = Array(element.headers.length).fill('');
    updateElement(slideIndex, elementIndex, { rows: [...element.rows, emptyRow] });
  }

  function removeRow(row: number) {
    updateElement(slideIndex, elementIndex, {
      rows: element.rows.filter((_, i) => i !== row),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={element.striped ?? false}
            onChange={(e) => updateElement(slideIndex, elementIndex, { striped: e.target.checked })}
            className="accent-indigo-500"
          />
          Striped rows
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={element.bordered ?? false}
            onChange={(e) => updateElement(slideIndex, elementIndex, { bordered: e.target.checked })}
            className="accent-indigo-500"
          />
          Bordered
        </label>
      </div>

      {element.caption !== undefined && (
        <label className="flex flex-col gap-1">
          <span className="field-label">Caption</span>
          <input
            type="text"
            className="field-input"
            value={element.caption}
            onChange={(e) => updateElement(slideIndex, elementIndex, { caption: e.target.value })}
          />
        </label>
      )}

      {/* Headers */}
      <div>
        <p className="field-label">Headers</p>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {element.headers.map((h, i) => (
            <input
              key={i}
              type="text"
              className="field-input min-w-[80px] flex-1 text-xs font-semibold"
              value={h}
              placeholder={`Col ${i + 1}`}
              onChange={(e) => updateHeader(i, e.target.value)}
            />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1">
        <p className="field-label">Rows ({element.rows.length})</p>
        {element.rows.map((row, ri) => (
          <div key={ri} className="flex gap-1 items-center">
            <span className="text-[10px] text-gray-500 w-4 flex-none">{ri + 1}</span>
            <div className="flex gap-1 flex-1 overflow-x-auto">
              {row.map((cell, ci) => (
                <input
                  key={ci}
                  type="text"
                  className="field-input min-w-[60px] flex-1 text-xs"
                  value={cell}
                  onChange={(e) => updateCell(ri, ci, e.target.value)}
                />
              ))}
            </div>
            <button
              className="text-gray-500 hover:text-red-400 transition-colors px-1 flex-none"
              onClick={() => removeRow(ri)}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="btn-ghost text-xs w-full border border-dashed border-white/15 hover:border-white/30 mt-1"
          onClick={addRow}
        >
          + Add Row
        </button>
      </div>
    </div>
  );
}
