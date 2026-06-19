/**
 * AnalyticsDashboard.tsx
 *
 * Presentation analytics configuration and live dashboard.
 *
 * Two panels:
 *   1. Setup  — paste an endpoint URL; analytics are embedded in exported HTML
 *   2. Dashboard — shows mock/live data once an endpoint is configured
 *
 * The analytics endpoint receives POST/sendBeacon payloads:
 * {
 *   presentationId, presentationTitle, session,
 *   slideIndex, slideTitle, dwellMs, completedAt, totalSlides
 * }
 *
 * For the dashboard without a backend, we store received events in
 * localStorage (prefix: ppt-analytics-{presentationId}).
 * A minimal event receiver can be added to the exported HTML via
 * postMessage so the editor can capture events from the same origin.
 */

import { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';

interface Props {
  onClose: () => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsEvent {
  session:    string;
  slideIndex: number;
  slideTitle: string;
  dwellMs:    number;
  completedAt: string;
  totalSlides: number;
}

interface SlideStats {
  slideIndex: number;
  slideTitle: string;
  views:      number;
  avgDwellSec: number;
  totalDwellSec: number;
}

// ─── Local event storage helpers ──────────────────────────────────────────────

const STORAGE_PREFIX = 'ppt-analytics-';

function storageKey(presentationId: string) {
  return `${STORAGE_PREFIX}${presentationId}`;
}

function loadEvents(presentationId: string): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(storageKey(presentationId));
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function clearEvents(presentationId: string) {
  localStorage.removeItem(storageKey(presentationId));
}

// ─── Statistics helpers ───────────────────────────────────────────────────────

function computeStats(events: AnalyticsEvent[], totalSlides: number): SlideStats[] {
  const bySlide = new Map<number, { title: string; dwells: number[] }>();
  for (const ev of events) {
    const entry = bySlide.get(ev.slideIndex) ?? { title: ev.slideTitle, dwells: [] };
    entry.dwells.push(ev.dwellMs);
    bySlide.set(ev.slideIndex, entry);
  }

  const stats: SlideStats[] = [];
  for (let i = 0; i < totalSlides; i++) {
    const entry = bySlide.get(i);
    if (!entry) {
      stats.push({ slideIndex: i, slideTitle: `Slide ${i + 1}`, views: 0, avgDwellSec: 0, totalDwellSec: 0 });
    } else {
      const total = entry.dwells.reduce((a, b) => a + b, 0);
      stats.push({
        slideIndex:    i,
        slideTitle:    entry.title || `Slide ${i + 1}`,
        views:         entry.dwells.length,
        avgDwellSec:   Math.round((total / entry.dwells.length) / 1000),
        totalDwellSec: Math.round(total / 1000),
      });
    }
  }
  return stats;
}

function uniqueSessions(events: AnalyticsEvent[]): number {
  return new Set(events.map((e) => e.session)).size;
}

function completionRate(events: AnalyticsEvent[], totalSlides: number): number {
  if (!events.length || totalSlides === 0) return 0;
  const sessions = new Map<string, Set<number>>();
  for (const ev of events) {
    const set = sessions.get(ev.session) ?? new Set<number>();
    set.add(ev.slideIndex);
    sessions.set(ev.session, set);
  }
  const rates = [...sessions.values()].map((set) => set.size / totalSlides);
  return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100);
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-center">
      <p className="text-2xl font-bold text-indigo-400 tabular-nums">{value}</p>
      <p className="text-xs text-gray-300 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard({ onClose }: Props) {
  const {
    presentation, analyticsEndpoint, setAnalyticsEndpoint,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<'setup' | 'dashboard'>('setup');
  const [endpointInput, setEndpointInput] = useState(analyticsEndpoint ?? '');
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [saved, setSaved] = useState(false);

  const presentationId = presentation.presentationId;
  const totalSlides    = presentation.slides.length;

  // Load stored events on mount and when switching to dashboard tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      setEvents(loadEvents(presentationId));
    }
  }, [activeTab, presentationId]);

  // Listen for analytics events postMessaged from the preview iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'ppt-analytics' && e.data.presentationId === presentationId) {
        const ev: AnalyticsEvent = e.data;
        setEvents((prev) => {
          const updated = [...prev, ev];
          try {
            localStorage.setItem(storageKey(presentationId), JSON.stringify(updated));
          } catch { /* quota exceeded */ }
          return updated;
        });
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [presentationId]);

  const handleSave = useCallback(() => {
    const url = endpointInput.trim();
    setAnalyticsEndpoint(url || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [endpointInput, setAnalyticsEndpoint]);

  const handleClear = useCallback(() => {
    clearEvents(presentationId);
    setEvents([]);
  }, [presentationId]);

  const stats      = computeStats(events, totalSlides);
  const sessions   = uniqueSessions(events);
  const completion = completionRate(events, totalSlides);
  const maxViews   = Math.max(1, ...stats.map((s) => s.views));

  const tabs = [
    { id: 'setup',     label: '⚙️ Setup'     },
    { id: 'dashboard', label: '📊 Dashboard' },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#161b27] modal-animate border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-none">
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div>
              <h2 className="text-sm font-semibold text-white">Presentation Analytics</h2>
              <p className="text-xs text-gray-400 mt-0.5">Track who views your exported slides</p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Setup tab ───────────────────────────────────────────────────── */}
          {activeTab === 'setup' && (
            <div className="flex flex-col gap-5">

              {/* Status badge */}
              <div className={[
                'rounded-lg p-4 border flex items-center gap-3',
                analyticsEndpoint
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-white/5 border-white/10',
              ].join(' ')}>
                <span className="text-2xl">{analyticsEndpoint ? '✅' : '⭕'}</span>
                <div>
                  <p className="text-sm font-medium text-white">
                    {analyticsEndpoint ? 'Analytics enabled' : 'Analytics not configured'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {analyticsEndpoint
                      ? `Endpoint: ${analyticsEndpoint}`
                      : 'Set an endpoint URL to start tracking slide views'}
                  </p>
                </div>
              </div>

              {/* Endpoint input */}
              <div className="flex flex-col gap-2">
                <label className="field-label">Analytics Endpoint URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="field-input flex-1 text-sm font-mono"
                    placeholder="https://your-analytics-endpoint.com/track"
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                  />
                  <button
                    onClick={handleSave}
                    className="btn-primary text-xs whitespace-nowrap"
                  >
                    {saved ? '✓ Saved!' : 'Save'}
                  </button>
                </div>
                {endpointInput && (
                  <button
                    onClick={() => { setEndpointInput(''); setAnalyticsEndpoint(null); }}
                    className="text-xs text-red-400 hover:text-red-300 text-left transition-colors"
                  >
                    Disable analytics
                  </button>
                )}
              </div>

              {/* How it works */}
              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/20 p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-indigo-300">How it works</p>
                <ol className="flex flex-col gap-2 text-xs text-gray-400 list-decimal list-inside">
                  <li>Set an endpoint URL above (any HTTP POST endpoint)</li>
                  <li>Export your presentation as HTML (Export HTML or ZIP)</li>
                  <li>When viewers open the exported file and navigate slides, events are sent to your endpoint</li>
                  <li>View the data here in the Dashboard tab, or in your own analytics tool</li>
                </ol>
              </div>

              {/* Event payload example */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Event payload (JSON)</p>
                <pre className="bg-[#0f1117] rounded-lg p-3 text-[11px] text-green-300 font-mono overflow-x-auto leading-relaxed border border-white/10">
{`{
  "presentationId": "${presentation.presentationId.slice(0, 8)}…",
  "presentationTitle": "${presentation.meta.title.slice(0, 20)}…",
  "session": "abc123…",
  "slideIndex": 2,
  "slideTitle": "Problem Statement",
  "dwellMs": 12400,
  "completedAt": "2026-06-17T10:30:00.000Z",
  "totalSlides": ${totalSlides}
}`}
                </pre>
              </div>

              {/* Free backend options */}
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4">
                <p className="text-xs font-semibold text-amber-300 mb-2">🆓 Free endpoint options</p>
                <ul className="text-xs text-gray-400 flex flex-col gap-1.5">
                  <li>• <strong className="text-gray-300">Pipedream</strong> — pipedream.com (free HTTP listener, see data instantly)</li>
                  <li>• <strong className="text-gray-300">webhook.site</strong> — webhook.site (copy the unique URL)</li>
                  <li>• <strong className="text-gray-300">Cloudflare Worker</strong> — free tier, write events to KV storage</li>
                  <li>• <strong className="text-gray-300">Supabase</strong> — free Postgres DB with REST API</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Dashboard tab ────────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-5">

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Unique sessions" value={sessions} />
                <StatCard label="Avg. completion" value={`${completion}%`} sub="slides viewed per session" />
                <StatCard label="Total events" value={events.length} sub="slide-view events" />
              </div>

              {events.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <span className="text-4xl select-none">📭</span>
                  <p className="text-sm text-gray-400">No analytics data yet.</p>
                  <p className="text-xs text-gray-500 max-w-xs">
                    {analyticsEndpoint
                      ? 'Export your presentation and share the HTML file. Data appears here as viewers interact with it.'
                      : 'Configure an endpoint in the Setup tab first, then export and share the HTML.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Per-slide bar chart */}
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">
                      Avg. dwell time per slide (seconds)
                    </p>
                    <div className="flex flex-col gap-2">
                      {stats.map((s) => (
                        <div key={s.slideIndex} className="flex items-center gap-3">
                          <span className="text-[10px] text-gray-500 w-5 text-right flex-none tabular-nums">
                            {s.slideIndex + 1}
                          </span>
                          <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded transition-all duration-500"
                              style={{ width: `${(s.avgDwellSec / Math.max(1, ...stats.map(x => x.avgDwellSec))) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-300 w-12 tabular-nums text-right flex-none">
                            {s.avgDwellSec}s
                          </span>
                          <span className="text-[10px] text-gray-500 w-10 tabular-nums text-right flex-none">
                            {s.views}v
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Engagement heatmap */}
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">
                      Slide engagement (views)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {stats.map((s) => {
                        const intensity = maxViews > 0 ? s.views / maxViews : 0;
                        return (
                          <div
                            key={s.slideIndex}
                            className="w-9 h-9 rounded flex items-center justify-center text-[10px] font-bold transition-colors cursor-default"
                            style={{
                              background: `rgba(99,102,241,${0.1 + intensity * 0.7})`,
                              color: intensity > 0.3 ? '#c7d2fe' : '#6b7280',
                              border: '1px solid rgba(99,102,241,0.2)',
                            }}
                            title={`Slide ${s.slideIndex + 1}: ${s.views} views, avg ${s.avgDwellSec}s`}
                          >
                            {s.slideIndex + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clear button */}
                  <button
                    onClick={handleClear}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors self-start"
                  >
                    Clear all stored events
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/10 flex-none">
          <button onClick={onClose} className="btn-primary text-xs">Close</button>
        </div>
      </div>
    </div>
  );
}
