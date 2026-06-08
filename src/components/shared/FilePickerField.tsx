import { useRef, useState } from 'react';

interface Props {
  /** Current value — a URL, data URI, or empty string */
  value: string;
  onChange: (value: string, fileName?: string) => void;
  /** MIME type filter, e.g. "image/*" or "video/*,image/svg+xml" */
  accept: string;
  placeholder?: string;
  label?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilePickerField({ value, onChange, accept, placeholder, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isDataUri = value.startsWith('data:') || value.startsWith('blob:');
  const displayName = localName ?? (isDataUri ? 'Local file' : null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setLoading(false);
      setLocalName(`${file.name} (${formatBytes(file.size)})`);
      onChange(reader.result as string, file.name);
    };
    reader.onerror = () => setLoading(false);
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-picked
    e.target.value = '';
  }

  function clear() {
    setLocalName(null);
    onChange('');
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="field-label">{label}</span>}

      {/* URL / data-uri input — hidden when a local file is loaded */}
      {!isDataUri && (
        <input
          type="text"
          className="field-input font-mono text-xs"
          value={value}
          placeholder={placeholder ?? 'https://...'}
          onChange={(e) => { setLocalName(null); onChange(e.target.value); }}
        />
      )}

      {/* Local file badge */}
      {isDataUri && displayName && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-white/5 border border-white/10 text-xs">
          <span className="text-indigo-400 flex-none">📎</span>
          <span className="flex-1 truncate text-gray-300">{displayName}</span>
          <button
            onClick={clear}
            className="flex-none text-gray-500 hover:text-red-400 transition-colors px-1"
            title="Clear file"
          >
            ✕
          </button>
        </div>
      )}

      {/* Browse button */}
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/40 text-gray-400 hover:text-gray-200 transition-colors"
      >
        {loading ? (
          <span className="animate-spin text-[10px]">⟳</span>
        ) : (
          <span>📁</span>
        )}
        {loading ? 'Reading file…' : 'Browse from device'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
