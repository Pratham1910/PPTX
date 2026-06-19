import type { ChartElement } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';

interface Props {
  element: ChartElement;
  slideIndex: number;
  elementIndex: number;
}

const CHART_TYPES: Array<{ value: ChartElement['chartType']; label: string }> = [
  { value: 'bar',      label: 'Bar' },
  { value: 'line',     label: 'Line' },
  { value: 'pie',      label: 'Pie' },
  { value: 'doughnut', label: 'Doughnut' },
  { value: 'area',     label: 'Area' },
  { value: 'radar',    label: 'Radar' },
];

export default function ChartPanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  function patch(p: Partial<ChartElement>) {
    updateElement(slideIndex, elementIndex, p as never);
  }

  function patchData(p: Partial<ChartElement['data']>) {
    patch({ data: { ...element.data, ...p } });
  }

  function patchOptions(p: Partial<NonNullable<ChartElement['options']>>) {
    patch({ options: { ...element.options, ...p } });
  }

  // Update a label by index
  function updateLabel(idx: number, value: string) {
    const labels = [...element.data.labels];
    labels[idx] = value;
    patchData({ labels });
  }

  // Update a data value by dataset 0 and index
  function updateDataValue(idx: number, value: string) {
    const datasets = element.data.datasets.map((ds, di) =>
      di === 0
        ? { ...ds, data: ds.data.map((v, vi) => (vi === idx ? Number(value) || 0 : v)) }
        : ds,
    );
    patchData({ datasets });
  }

  // Update dataset label
  function updateDatasetLabel(value: string) {
    const datasets = element.data.datasets.map((ds, di) =>
      di === 0 ? { ...ds, label: value } : ds,
    );
    patchData({ datasets });
  }

  // Update dataset color
  function updateDatasetColor(value: string) {
    const datasets = element.data.datasets.map((ds, di) =>
      di === 0 ? { ...ds, color: value } : ds,
    );
    patchData({ datasets });
  }

  // Add / remove a data point
  function addDataPoint() {
    const labels = [...element.data.labels, `Label ${element.data.labels.length + 1}`];
    const datasets = element.data.datasets.map((ds) => ({
      ...ds, data: [...ds.data, 0],
    }));
    patchData({ labels, datasets });
  }

  function removeDataPoint(idx: number) {
    if (element.data.labels.length <= 1) return;
    const labels = element.data.labels.filter((_, i) => i !== idx);
    const datasets = element.data.datasets.map((ds) => ({
      ...ds, data: ds.data.filter((_, i) => i !== idx),
    }));
    patchData({ labels, datasets });
  }

  const ds = element.data.datasets[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Chart type */}
      <label className="flex flex-col gap-1">
        <span className="field-label">Chart Type</span>
        <select
          className="field-select"
          value={element.chartType}
          onChange={(e) => patch({ chartType: e.target.value as ChartElement['chartType'] })}
        >
          {CHART_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      {/* Dataset label + color */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="field-label">Series Name</span>
          <input
            type="text"
            className="field-input text-xs"
            value={ds?.label ?? ''}
            onChange={(e) => updateDatasetLabel(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">Color</span>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              className="w-8 h-8 rounded cursor-pointer border border-white/10 bg-transparent flex-none"
              value={(typeof ds?.color === 'string' ? ds.color : null) ?? '#818cf8'}
              onChange={(e) => updateDatasetColor(e.target.value)}
            />
            <input
              type="text"
              className="field-input text-xs font-mono"
              value={(typeof ds?.color === 'string' ? ds.color : null) ?? '#818cf8'}
              onChange={(e) => updateDatasetColor(e.target.value)}
            />
          </div>
        </label>
      </div>

      {/* Options toggles */}
      <div className="flex flex-col gap-2">
        <span className="field-label">Display Options</span>
        {[
          { key: 'showLegend',  label: 'Show Legend' },
          { key: 'showGrid',    label: 'Show Grid' },
          { key: 'showLabels',  label: 'Show Labels' },
          { key: 'animated',    label: 'Animated' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="accent-indigo-500 w-3.5 h-3.5"
              checked={(element.options as Record<string, boolean>)?.[key] ?? true}
              onChange={(e) => patchOptions({ [key]: e.target.checked })}
            />
            <span className="text-xs text-gray-300">{label}</span>
          </label>
        ))}
      </div>

      {/* Data table */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="field-label">Data Points</span>
          <button
            className="text-[10px] font-medium text-accent hover:text-white bg-accent/10 hover:bg-accent/20 px-2 py-0.5 rounded transition-colors"
            onClick={addDataPoint}
          >
            + Add
          </button>
        </div>
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {element.data.labels.map((label, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <input
                type="text"
                className="field-input text-xs flex-1"
                value={label}
                placeholder="Label"
                onChange={(e) => updateLabel(idx, e.target.value)}
              />
              <input
                type="number"
                className="field-input text-xs w-20"
                value={ds?.data[idx] ?? 0}
                onChange={(e) => updateDataValue(idx, e.target.value)}
              />
              <button
                className="text-gray-500 hover:text-red-400 transition-colors flex-none text-sm"
                onClick={() => removeDataPoint(idx)}
                title="Remove data point"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
