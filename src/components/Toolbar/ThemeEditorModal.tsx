/**
 * ThemeEditorModal.tsx
 *
 * A full live theme editor that lets users customise every aspect of the
 * Presentation theme in real time. Every change calls applyTheme() which
 * triggers the existing 500 ms debounced preview refresh automatically.
 *
 * Sections:
 *   1. Colours        — 10 swatches with <input type="color"> + hex field
 *   2. Typography     — heading/body/mono font names, base size, scale ratio
 *   3. Spacing        — slide padding X/Y, element gap
 *   4. Global         — border radius, aspect ratio
 *
 * Built entirely with existing CSS utilities — no new dependencies.
 */

import { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import type { Theme } from '@/core/schema';

interface Props {
  onClose: () => void;
}

// ─── Preset palettes ──────────────────────────────────────────────────────────

interface Palette {
  name:  string;
  emoji: string;
  colors: Partial<Theme['colors']>;
}

const PALETTES: Palette[] = [
  {
    name: 'Dark Indigo', emoji: '🌌',
    colors: {
      background: '#0f1117', foreground: '#e2e8f0',
      primary: '#6366f1', secondary: '#818cf8',
      accent: '#c084fc', muted: '#475569',
    },
  },
  {
    name: 'Ocean Blue', emoji: '🌊',
    colors: {
      background: '#0a1628', foreground: '#e0f2fe',
      primary: '#0ea5e9', secondary: '#38bdf8',
      accent: '#22d3ee', muted: '#334155',
    },
  },
  {
    name: 'Forest Green', emoji: '🌿',
    colors: {
      background: '#0a1a0f', foreground: '#d1fae5',
      primary: '#10b981', secondary: '#34d399',
      accent: '#6ee7b7', muted: '#374151',
    },
  },
  {
    name: 'Sunset', emoji: '🌅',
    colors: {
      background: '#1a0a0a', foreground: '#fff7ed',
      primary: '#f97316', secondary: '#fb923c',
      accent: '#fbbf24', muted: '#44403c',
    },
  },
  {
    name: 'Pure Light', emoji: '☀️',
    colors: {
      background: '#ffffff', foreground: '#111827',
      primary: '#4f46e5', secondary: '#7c3aed',
      accent: '#ec4899', muted: '#9ca3af',
    },
  },
  {
    name: 'Rose Quartz', emoji: '🌸',
    colors: {
      background: '#1a0d12', foreground: '#fce7f3',
      primary: '#ec4899', secondary: '#f472b6',
      accent: '#fb7185', muted: '#4b2333',
    },
  },
];

// ─── Color definitions ────────────────────────────────────────────────────────

const COLOR_FIELDS: { key: keyof Theme['colors']; label: string; desc: string }[] = [
  { key: 'background', label: 'Background',  desc: 'Slide canvas background' },
  { key: 'foreground', label: 'Foreground',  desc: 'Default text colour' },
  { key: 'primary',    label: 'Primary',     desc: 'Headings, buttons, highlights' },
  { key: 'secondary',  label: 'Secondary',   desc: 'Sub-headings, accents' },
  { key: 'accent',     label: 'Accent',      desc: 'Callouts, badges, tags' },
  { key: 'muted',      label: 'Muted',       desc: 'Dividers, borders, subtle text' },
  { key: 'danger',     label: 'Danger',      desc: 'Warning callouts, errors' },
  { key: 'success',    label: 'Success',     desc: 'Success callouts' },
  { key: 'warning',    label: 'Warning',     desc: 'Warning callouts' },
  { key: 'info',       label: 'Info',        desc: 'Info callouts, notes' },
];

const SCALE_RATIOS = [
  { value: 1.2,    label: '1.200 — Minor Third' },
  { value: 1.25,   label: '1.250 — Major Third' },
  { value: 1.333,  label: '1.333 — Perfect Fourth' },
  { value: 1.414,  label: '1.414 — Augmented Fourth' },
  { value: 1.5,    label: '1.500 — Perfect Fifth' },
];

const ASPECT_RATIOS = ['16:9', '4:3', '1:1'] as const;

// ─── Helper ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-5 first:mt-0">
      {children}
    </p>
  );
}

function RangeRow({
  label, value, min, max, step = 1, unit = '',
  onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  unit?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-28 flex-none">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-indigo-500"
      />
      <span className="text-xs text-gray-300 w-12 text-right flex-none tabular-nums">
        {value}{unit}
      </span>
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ThemeEditorModal({ onClose }: Props) {
  const { presentation, applyTheme } = useEditorStore();
  const [theme, setTheme] = useState<Theme>(() => structuredClone(presentation.theme));
  const [activeTab, setActiveTab] = useState<'colors' | 'type' | 'spacing' | 'global'>('colors');

  /** Apply a partial delta to the local theme state and push to the store. */
  const update = useCallback((partial: Partial<Theme>) => {
    setTheme((prev) => {
      const next = { ...prev, ...partial };
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  const updateColors = useCallback((key: keyof Theme['colors'], value: string) => {
    update({ colors: { ...theme.colors, [key]: value } });
  }, [theme.colors, update]);

  const updateTypography = useCallback((key: keyof Theme['typography'], value: string | number) => {
    update({ typography: { ...theme.typography, [key]: value } });
  }, [theme.typography, update]);

  const updateSpacing = useCallback((key: keyof Theme['spacing'], value: number) => {
    update({ spacing: { ...theme.spacing, [key]: value } });
  }, [theme.spacing, update]);

  const applyPalette = useCallback((palette: Palette) => {
    update({ colors: { ...theme.colors, ...palette.colors } });
  }, [theme.colors, update]);

  const tabs = [
    { id: 'colors',  label: '🎨 Colors'   },
    { id: 'type',    label: '🔤 Type'     },
    { id: 'spacing', label: '📐 Spacing'  },
    { id: 'global',  label: '⚙️ Global'   },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#161b27] modal-animate border border-white/10 rounded-xl shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-none">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎨</span>
            <div>
              <h2 className="text-sm font-semibold text-white">Live Theme Editor</h2>
              <p className="text-xs text-gray-400 mt-0.5">Changes reflect in the preview instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 py-2.5 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Colors tab ─────────────────────────────────────────────────── */}
          {activeTab === 'colors' && (
            <div className="flex flex-col gap-5">
              <div>
                <SectionTitle>Quick Palettes</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {PALETTES.map((palette) => (
                    <button
                      key={palette.name}
                      onClick={() => applyPalette(palette)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 text-left transition-all group"
                    >
                      <span className="text-base">{palette.emoji}</span>
                      <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                        {palette.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle>Custom Colors</SectionTitle>
                <div className="flex flex-col gap-3">
                  {COLOR_FIELDS.map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center gap-3">
                      {/* Native color picker */}
                      <div className="relative flex-none">
                        <input
                          type="color"
                          value={theme.colors[key]}
                          onChange={(e) => updateColors(key, e.target.value)}
                          className="w-9 h-9 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0.5"
                          title={`Pick ${label} colour`}
                        />
                      </div>
                      {/* Hex field */}
                      <input
                        type="text"
                        value={theme.colors[key]}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateColors(key, v);
                        }}
                        className="field-input w-24 font-mono text-xs"
                        maxLength={7}
                      />
                      {/* Label + desc */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-200">{label}</p>
                        <p className="text-[10px] text-gray-500 truncate">{desc}</p>
                      </div>
                      {/* Live swatch */}
                      <div
                        className="w-6 h-6 rounded flex-none border border-white/10"
                        style={{ background: theme.colors[key] }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Typography tab ──────────────────────────────────────────────── */}
          {activeTab === 'type' && (
            <div className="flex flex-col gap-4">
              <SectionTitle>Fonts</SectionTitle>
              {(
                [
                  { key: 'headingFont', label: 'Heading font', placeholder: 'e.g. Playfair Display' },
                  { key: 'bodyFont',    label: 'Body font',    placeholder: 'e.g. Inter' },
                  { key: 'monoFont',    label: 'Monospace font', placeholder: 'e.g. JetBrains Mono' },
                ] as const
              ).map(({ key, label, placeholder }) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="field-label">{label}</span>
                  <input
                    type="text"
                    className="field-input text-sm"
                    value={theme.typography[key]}
                    placeholder={placeholder}
                    onChange={(e) => updateTypography(key, e.target.value)}
                  />
                </label>
              ))}

              <div className="mt-2">
                <SectionTitle>Size &amp; Scale</SectionTitle>
                <div className="flex flex-col gap-3">
                  <RangeRow
                    label="Base size"
                    value={theme.typography.baseSizePx}
                    min={12} max={36} step={1} unit="px"
                    onChange={(v) => updateTypography('baseSizePx', v)}
                  />
                  <label className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-28 flex-none">Scale ratio</span>
                    <select
                      className="field-select flex-1"
                      value={theme.typography.scaleRatio}
                      onChange={(e) => updateTypography('scaleRatio', parseFloat(e.target.value))}
                    >
                      {SCALE_RATIOS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Live font preview */}
              <div
                className="mt-4 rounded-lg border border-white/10 p-4 overflow-hidden"
                style={{ background: theme.colors.background, color: theme.colors.foreground }}
              >
                <p
                  style={{
                    fontFamily: `'${theme.typography.headingFont}', system-ui, sans-serif`,
                    fontSize: `${theme.typography.baseSizePx * theme.typography.scaleRatio ** 3}px`,
                    fontWeight: 700,
                    color: theme.colors.primary,
                    lineHeight: 1.2,
                  }}
                >
                  Heading Preview
                </p>
                <p
                  style={{
                    fontFamily: `'${theme.typography.bodyFont}', system-ui, sans-serif`,
                    fontSize: `${theme.typography.baseSizePx}px`,
                    marginTop: 8,
                    opacity: 0.85,
                  }}
                >
                  Body text preview — The quick brown fox jumps over the lazy dog.
                </p>
                <p
                  style={{
                    fontFamily: `'${theme.typography.monoFont}', monospace`,
                    fontSize: `${theme.typography.baseSizePx * 0.8}px`,
                    marginTop: 8,
                    opacity: 0.6,
                    background: theme.colors.muted + '33',
                    padding: '2px 6px',
                    borderRadius: 4,
                    display: 'inline-block',
                  }}
                >
                  const monospace = true;
                </p>
              </div>
            </div>
          )}

          {/* ── Spacing tab ─────────────────────────────────────────────────── */}
          {activeTab === 'spacing' && (
            <div className="flex flex-col gap-4">
              <SectionTitle>Slide Padding</SectionTitle>
              <div className="flex flex-col gap-3">
                <RangeRow
                  label="Padding X (left/right)"
                  value={theme.spacing.slidePaddingX}
                  min={0} max={160} step={4} unit="px"
                  onChange={(v) => updateSpacing('slidePaddingX', v)}
                />
                <RangeRow
                  label="Padding Y (top/bottom)"
                  value={theme.spacing.slidePaddingY}
                  min={0} max={120} step={4} unit="px"
                  onChange={(v) => updateSpacing('slidePaddingY', v)}
                />
                <RangeRow
                  label="Element gap"
                  value={theme.spacing.elementGap}
                  min={0} max={64} step={2} unit="px"
                  onChange={(v) => updateSpacing('elementGap', v)}
                />
              </div>
            </div>
          )}

          {/* ── Global tab ──────────────────────────────────────────────────── */}
          {activeTab === 'global' && (
            <div className="flex flex-col gap-4">
              <SectionTitle>Shape &amp; Layout</SectionTitle>
              <div className="flex flex-col gap-3">
                <RangeRow
                  label="Border radius"
                  value={theme.borderRadius}
                  min={0} max={24} step={1} unit="px"
                  onChange={(v) => update({ borderRadius: v })}
                />
                <label className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-28 flex-none">Aspect ratio</span>
                  <div className="flex gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => update({ aspectRatio: ratio })}
                        className={[
                          'px-3 py-1.5 rounded text-xs font-medium border transition-colors',
                          theme.aspectRatio === ratio
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200',
                        ].join(' ')}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <div className="mt-2">
                <SectionTitle>Theme Name</SectionTitle>
                <input
                  type="text"
                  className="field-input w-full"
                  value={theme.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="My Custom Theme"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 flex-none">
          <button
            onClick={() => {
              const reset = structuredClone(presentation.theme);
              setTheme(reset);
              applyTheme(reset);
            }}
            className="btn-ghost text-xs text-gray-500"
          >
            Reset to original
          </button>
          <button onClick={onClose} className="btn-primary text-xs">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
