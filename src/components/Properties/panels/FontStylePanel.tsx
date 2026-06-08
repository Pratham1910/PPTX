import { useState } from 'react';
import type { ElementStyle, TextStyle } from '@/core/schema';

const FONT_FAMILIES = [
  'Inter', 'Roboto', 'Poppins', 'Nunito', 'Georgia', 'Merriweather',
  'Playfair Display', 'Lato', 'Open Sans', 'Raleway', 'Oswald',
  'JetBrains Mono', 'Fira Code', 'Source Code Pro',
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96];

interface Props {
  style?: ElementStyle;
  onChange: (patch: Partial<ElementStyle>) => void;
}

function update(style: ElementStyle | undefined, patch: Partial<TextStyle>): ElementStyle {
  return { ...style, text: { ...style?.text, ...patch } };
}

export default function FontStylePanel({ style, onChange }: Props) {
  const ts = style?.text ?? {};
  const [showAdvanced, setShowAdvanced] = useState(false);

  function set(patch: Partial<TextStyle>) { onChange(update(style, patch)); }

  const isBold        = ts.weight === 'bold' || ts.weight === 'semibold';
  const isUnderline   = ts.decoration === 'underline';
  const isStrike      = ts.decoration === 'line-through';

  function toggleBold()      { set({ weight: isBold ? 'normal' : 'bold' }); }
  function toggleItalic()    { set({ italic: !ts.italic }); }
  function toggleUnderline() { set({ decoration: isUnderline ? 'none' : 'underline' }); }
  function toggleStrike()    { set({ decoration: isStrike   ? 'none' : 'line-through' }); }

  const fmtBtn = (active: boolean) =>
    `w-8 h-8 rounded font-medium text-sm transition-colors ${active ? 'bg-indigo-600 text-white' : 'bg-white/8 text-gray-300 hover:bg-white/15'}`;

  return (
    <div className="flex flex-col gap-2.5">

      {/* ── Row 1: B / I / U / S + font size ─────────────────── */}
      <div className="flex items-center gap-1.5">
        <button className={fmtBtn(isBold)}      title="Bold (Ctrl+B)"          onClick={toggleBold}>      <strong>B</strong></button>
        <button className={fmtBtn(!!ts.italic)} title="Italic (Ctrl+I)"        onClick={toggleItalic}>    <em>I</em></button>
        <button className={fmtBtn(isUnderline)} title="Underline (Ctrl+U)"     onClick={toggleUnderline}> <u>U</u></button>
        <button className={fmtBtn(isStrike)}    title="Strikethrough"          onClick={toggleStrike}>    <s>S</s></button>

        <div className="w-px h-5 bg-white/15 mx-0.5" />

        {/* Font size — compact number input + quick +/- */}
        <div className="flex items-center gap-0.5 flex-1">
          <button
            className="w-6 h-8 rounded bg-white/8 hover:bg-white/15 text-gray-300 text-sm transition-colors"
            onClick={() => set({ sizePx: Math.max(8, (ts.sizePx ?? 18) - 2) })}
            title="Decrease font size"
          >−</button>
          <input
            type="number"
            className="field-input text-xs text-center w-14 h-8 px-1"
            value={ts.sizePx ?? ''}
            placeholder="auto"
            min={8} max={200}
            onChange={(e) => set({ sizePx: e.target.value ? Number(e.target.value) : undefined })}
          />
          <button
            className="w-6 h-8 rounded bg-white/8 hover:bg-white/15 text-gray-300 text-sm transition-colors"
            onClick={() => set({ sizePx: (ts.sizePx ?? 18) + 2 })}
            title="Increase font size"
          >+</button>
        </div>
      </div>

      {/* ── Row 2: Font family ────────────────────────────────── */}
      <select
        className="field-input text-xs"
        value={ts.fontFamily ?? ''}
        onChange={(e) => set({ fontFamily: e.target.value || undefined })}
        title="Font family"
      >
        <option value="">(theme default font)</option>
        {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>

      {/* ── Row 3: Alignment ─────────────────────────────────── */}
      <div className="flex gap-1">
        {(['left', 'center', 'right', 'justify'] as const).map((a) => {
          const icons = { left: '⬅', center: '↔', right: '➡', justify: '⬌' };
          const labels = { left: 'Left', center: 'Center', right: 'Right', justify: 'Justify' };
          return (
            <button
              key={a}
              title={labels[a]}
              className={`flex-1 h-7 rounded text-[11px] transition-colors ${ts.align === a ? 'bg-indigo-600 text-white' : 'bg-white/8 text-gray-400 hover:bg-white/15'}`}
              onClick={() => set({ align: ts.align === a ? undefined : a })}
            >
              {icons[a]}
            </button>
          );
        })}
      </div>

      {/* ── Row 4: Color + Highlight ──────────────────────────── */}
      <div className="flex gap-2">
        <label className="flex flex-col gap-1 flex-1">
          <span className="field-label text-[10px]">Text Color</span>
          <div className="flex gap-1.5 items-center">
            <input type="color" className="w-7 h-7 rounded cursor-pointer border border-white/10 bg-transparent flex-none"
              value={ts.color ?? '#e6edf3'} onChange={(e) => set({ color: e.target.value })} />
            <input type="text" className="field-input text-xs flex-1 h-7" value={ts.color ?? ''} placeholder="#e6edf3"
              onChange={(e) => set({ color: e.target.value || undefined })} />
          </div>
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <span className="field-label text-[10px]">Highlight</span>
          <div className="flex gap-1.5 items-center">
            <input type="color" className="w-7 h-7 rounded cursor-pointer border border-white/10 bg-transparent flex-none"
              value={ts.highlight ?? '#ffdd00'} onChange={(e) => set({ highlight: e.target.value })} />
            <input type="text" className="field-input text-xs flex-1 h-7" value={ts.highlight ?? ''} placeholder="none"
              onChange={(e) => set({ highlight: e.target.value || undefined })} />
            {ts.highlight && (
              <button className="text-xs text-red-400 hover:text-red-300 flex-none" onClick={() => set({ highlight: undefined })}>✕</button>
            )}
          </div>
        </label>
      </div>

      {/* ── Advanced toggle ───────────────────────────────────── */}
      <button
        className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors text-left flex items-center gap-1"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        <span>{showAdvanced ? '▾' : '▸'}</span> Advanced typography
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-2.5 pl-2 border-l border-white/10">
          {/* Weight */}
          <label className="flex flex-col gap-1">
            <span className="field-label text-[10px]">Weight</span>
            <select className="field-input text-xs"
              value={ts.weight ?? ''}
              onChange={(e) => set({ weight: (e.target.value || undefined) as TextStyle['weight'] })}>
              <option value="">(auto)</option>
              <option value="normal">Regular</option>
              <option value="medium">Medium</option>
              <option value="semibold">Semi Bold</option>
              <option value="bold">Bold</option>
            </select>
          </label>

          {/* Decoration + Transform */}
          <div className="flex gap-2">
            <label className="flex flex-col gap-1 flex-1">
              <span className="field-label text-[10px]">Decoration</span>
              <select className="field-input text-xs"
                value={ts.decoration ?? ''}
                onChange={(e) => set({ decoration: (e.target.value || undefined) as TextStyle['decoration'] })}>
                <option value="">(none)</option>
                <option value="underline">Underline</option>
                <option value="line-through">Strikethrough</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="field-label text-[10px]">Transform</span>
              <select className="field-input text-xs"
                value={ts.transform ?? ''}
                onChange={(e) => set({ transform: (e.target.value || undefined) as TextStyle['transform'] })}>
                <option value="">(none)</option>
                <option value="uppercase">UPPERCASE</option>
                <option value="lowercase">lowercase</option>
                <option value="capitalize">Capitalize</option>
              </select>
            </label>
          </div>

          {/* Line height + Letter spacing */}
          <div className="flex gap-2">
            <label className="flex flex-col gap-1 flex-1">
              <span className="field-label text-[10px]">Line Height</span>
              <input type="number" className="field-input text-xs" min="1" max="3" step="0.1"
                value={ts.lineHeight ?? ''} placeholder="1.5"
                onChange={(e) => set({ lineHeight: e.target.value ? Number(e.target.value) : undefined })} />
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="field-label text-[10px]">Letter Spacing</span>
              <input type="number" className="field-input text-xs" min="-5" max="20" step="0.5"
                value={ts.letterSpacing ?? ''} placeholder="0"
                onChange={(e) => set({ letterSpacing: e.target.value ? Number(e.target.value) : undefined })} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
