/**
 * VideoExportModal.tsx
 *
 * UI for the Record & Export as Video feature.
 * Controls: seconds per slide, resolution, audio narration.
 * Shows a real-time progress bar while recording.
 */

import { useState, useRef, useCallback } from 'react';
import { exportVideo, type VideoExportOptions, type VideoExportProgress } from '../../utils/video-export.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';

interface Props {
  onClose: () => void;
}

type Stage = 'idle' | 'recording' | 'done' | 'error';

const RESOLUTION_OPTIONS = [
  { label: '720p (1280×720)', width: 1280, height: 720 },
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
] as const;

export default function VideoExportModal({ onClose }: Props) {
  const { presentation } = useEditorStore();

  const [secondsPerSlide, setSecondsPerSlide] = useState(5);
  const [resolution, setResolution]           = useState(0); // index into RESOLUTION_OPTIONS
  const [includeAudio, setIncludeAudio]       = useState(false);

  const [stage, setStage]       = useState<Stage>('idle');
  const [progress, setProgress] = useState<VideoExportProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  const totalSeconds = presentation.slides.length * secondsPerSlide;

  const handleStart = useCallback(async () => {
    setStage('recording');
    setProgress({ slideIndex: 0, total: presentation.slides.length, phase: 'rendering', label: 'Starting…' });

    abortRef.current = new AbortController();

    const opts: VideoExportOptions = {
      secondsPerSlide,
      fps:    30,
      width:  RESOLUTION_OPTIONS[resolution].width,
      height: RESOLUTION_OPTIONS[resolution].height,
      includeAudio,
    };

    try {
      await exportVideo(presentation, opts, setProgress, abortRef.current.signal);
      setStage('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Recording failed');
      setStage('error');
    }
  }, [presentation, secondsPerSlide, resolution, includeAudio]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setStage('idle');
    setProgress(null);
  }, []);

  const progressPct = progress
    ? Math.min(100, Math.round(((progress.slideIndex) / Math.max(1, progress.total)) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && stage !== 'recording') onClose(); }}
    >
      <div className="bg-[#161b27] modal-animate border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎬</span>
            <div>
              <h2 className="text-sm font-semibold text-white">Record as Video</h2>
              <p className="text-xs text-gray-400 mt-0.5">Export slides as a .webm video file</p>
            </div>
          </div>
          {stage !== 'recording' && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* ── IDLE: settings ── */}
          {stage === 'idle' && (
            <>
              {/* Seconds per slide */}
              <label className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Seconds per slide</span>
                  <span className="text-xs font-semibold text-white tabular-nums">{secondsPerSlide}s</span>
                </div>
                <input
                  type="range"
                  min={1} max={30} step={1}
                  value={secondsPerSlide}
                  onChange={(e) => setSecondsPerSlide(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>1s</span>
                  <span>30s</span>
                </div>
              </label>

              {/* Resolution */}
              <label className="flex flex-col gap-1">
                <span className="field-label">Resolution</span>
                <select
                  className="field-select"
                  value={resolution}
                  onChange={(e) => setResolution(Number(e.target.value))}
                >
                  {RESOLUTION_OPTIONS.map((r, i) => (
                    <option key={r.label} value={i}>{r.label}</option>
                  ))}
                </select>
              </label>

              {/* Audio toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setIncludeAudio((v) => !v)}
                  className={[
                    'w-10 h-5 rounded-full flex items-center transition-colors duration-200 flex-none',
                    includeAudio ? 'bg-indigo-600' : 'bg-white/20',
                  ].join(' ')}
                >
                  <div className={[
                    'w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 mx-0.5',
                    includeAudio ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-200">Record microphone audio</p>
                  <p className="text-[10px] text-gray-500">Adds voice narration (requires mic permission)</p>
                </div>
              </label>

              {/* Summary */}
              <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-xs text-gray-400 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Slides</span>
                  <span className="text-white">{presentation.slides.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total duration</span>
                  <span className="text-white">{totalSeconds}s ({(totalSeconds / 60).toFixed(1)} min)</span>
                </div>
                <div className="flex justify-between">
                  <span>Resolution</span>
                  <span className="text-white">{RESOLUTION_OPTIONS[resolution].width}×{RESOLUTION_OPTIONS[resolution].height}</span>
                </div>
                <div className="flex justify-between">
                  <span>Format</span>
                  <span className="text-white">.webm (VP9)</span>
                </div>
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-[11px] text-amber-300 leading-relaxed">
                  ⚠️ Recording captures a screenshot of each slide. Complex animations
                  and interactive elements may not reproduce perfectly. Keep the browser
                  window visible during recording.
                </p>
              </div>

              <button
                onClick={handleStart}
                className="btn-primary w-full justify-center"
              >
                🎬 Start Recording
              </button>
            </>
          )}

          {/* ── RECORDING: progress ── */}
          {stage === 'recording' && progress && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.4)' }}
              >
                🔴
              </div>
              <div className="w-full">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>{progress.label}</span>
                  <span className="tabular-nums">{progressPct}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-2 text-center">
                  Slide {Math.min(progress.slideIndex + 1, progress.total)} of {progress.total}
                </p>
              </div>
              <button onClick={handleCancel} className="btn-ghost text-xs text-red-400">
                Cancel
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {stage === 'done' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-5xl select-none">✅</div>
              <p className="text-sm font-semibold text-white">Video exported!</p>
              <p className="text-xs text-gray-400 text-center">
                Your <strong>.webm</strong> file has been downloaded. Open it with any modern browser or video player.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={onClose} className="btn-ghost flex-1">Close</button>
                <button
                  onClick={() => { setStage('idle'); setProgress(null); }}
                  className="btn-primary flex-1"
                >
                  Record again
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {stage === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-4xl select-none">❌</div>
              <p className="text-sm font-semibold text-red-400">Recording failed</p>
              <p className="text-xs text-gray-400 text-center">{errorMsg}</p>
              <div className="flex gap-3 w-full">
                <button onClick={onClose} className="btn-ghost flex-1">Close</button>
                <button
                  onClick={() => { setStage('idle'); setErrorMsg(''); setProgress(null); }}
                  className="btn-primary flex-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
