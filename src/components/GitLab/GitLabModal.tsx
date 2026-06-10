import { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import {
  testConnection,
  listMdFiles,
  fetchFileContent,
} from '../../services/gitlab.ts';
import type { GitLabConfig, GitLabFile } from '../../services/gitlab.ts';

interface Props {
  onClose: () => void;
}

type Step = 'connect' | 'browse';

const GITLAB_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.92z"/>
  </svg>
);

const FOLDER_ICON = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-yellow-400">
    <path d="M1.5 2A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0014.5 4H7.621a1.5 1.5 0 01-1.06-.44L5.5 2.44A1.5 1.5 0 004.439 2H1.5z"/>
  </svg>
);

const FILE_MD_ICON = (
  <svg width="14" height="14" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 2.5A1.5 1.5 0 014.5 1h5.086a1.5 1.5 0 011.06.44l2.915 2.914A1.5 1.5 0 0114 5.414V13.5A1.5 1.5 0 0112.5 15h-8A1.5 1.5 0 013 13.5v-11z"/>
  </svg>
);

// ── folder grouping ─────────────────────────────────────────────

interface FolderGroup {
  /** Display name — the folder name or '' for root / non-WorkDir */
  name: string;
  isWorkDir: boolean;
  files: GitLabFile[];
}

function groupByFolder(files: GitLabFile[]): FolderGroup[] {
  const workDirMap = new Map<string, GitLabFile[]>();
  const others: GitLabFile[] = [];

  for (const f of files) {
    if (f.path.startsWith('WorkDir/')) {
      const key = f.folder || '(root)';
      if (!workDirMap.has(key)) workDirMap.set(key, []);
      workDirMap.get(key)!.push(f);
    } else {
      others.push(f);
    }
  }

  const groups: FolderGroup[] = [];

  // WorkDir groups — sorted by folder name
  const sortedKeys = [...workDirMap.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const key of sortedKeys) {
    groups.push({ name: key, isWorkDir: true, files: workDirMap.get(key)! });
  }

  // Non-WorkDir files
  if (others.length > 0) {
    groups.push({ name: 'Other files', isWorkDir: false, files: others });
  }

  return groups;
}

// ───────────────────────────────────────────────────────────────

export default function GitLabModal({ onClose }: Props) {
  const { gitlabConfig, setGitlabConfig, parseFromMarkdown, parseFromAdoc } = useEditorStore();

  // ── form state ─────────────────────────────────────────────
  const [form, setForm] = useState<GitLabConfig>(
    gitlabConfig ?? { url: 'https://gitlab.com', projectId: '', branch: 'main', token: '' }
  );
  const [showToken, setShowToken] = useState(false);

  // ── step & async state ────────────────────────────────────
  const [step, setStep] = useState<Step>(gitlabConfig ? 'browse' : 'connect');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── file browser state ────────────────────────────────────
  const [files, setFiles] = useState<GitLabFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // ── expanded folders (all expanded by default) ────────────
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupByFolder(files), [files]);

  // Auto-load files when modal opens already connected
  useEffect(() => {
    if (step === 'browse' && gitlabConfig) {
      loadFiles(gitlabConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── helpers ───────────────────────────────────────────────

  async function loadFiles(cfg: GitLabConfig) {
    setLoading(true);
    setError('');
    try {
      const contentFiles = await listMdFiles(cfg);
      setFiles(contentFiles);
      // Pre-select first WorkDir file
      const workDirFile = contentFiles.find((f) => f.path.startsWith('WorkDir/'));
      setSelected(workDirFile?.path ?? contentFiles[0]?.path ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!form.url.trim() || !form.projectId.trim() || !form.token.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await testConnection(form);
      setGitlabConfig(form);
      setStep('browse');
      await loadFiles(form);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!selected || !gitlabConfig) return;
    setImporting(true);
    setError('');
    try {
      const content = await fetchFileContent(gitlabConfig, selected);
      const file = files.find((f) => f.path === selected);
      if (file?.ext === 'adoc') {
        parseFromAdoc(content);
      } else {
        parseFromMarkdown(content);
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  function handleDisconnect() {
    setGitlabConfig(null);
    setFiles([]);
    setSelected(null);
    setStep('connect');
    setError('');
  }

  function toggleFolder(name: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // ── render ────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#161b27] border border-white/10 rounded-xl shadow-2xl w-[520px] max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-orange-400">
            {GITLAB_ICON}
            <h2 className="text-sm font-semibold text-white">GitLab Integration</h2>
          </div>
          <button className="text-gray-400 hover:text-white text-xl leading-none" onClick={onClose}>×</button>
        </div>

        {/* ── CONNECT STEP ── */}
        {step === 'connect' && (
          <>
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <p className="text-xs text-gray-400 leading-relaxed">
                Connect to a GitLab repository. The app will fetch
                {' '}<code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">.md</code> and
                {' '}<code className="text-orange-400 bg-orange-500/10 px-1 rounded">.adoc</code> files
                from <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">WorkDir/</code>,
                grouped by folder (Chapter 1, Chapter 2, …).
              </p>

              {/* GitLab URL */}
              <label className="flex flex-col gap-1">
                <span className="field-label">GitLab URL <span className="text-red-400">*</span></span>
                <input
                  type="url"
                  className="field-input"
                  placeholder="https://gitlab.com"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
                <span className="text-[10px] text-gray-500">Use your self-hosted GitLab URL if applicable</span>
              </label>

              {/* Project ID / Path */}
              <label className="flex flex-col gap-1">
                <span className="field-label">Project ID or Path <span className="text-red-400">*</span></span>
                <input
                  type="text"
                  className="field-input"
                  placeholder="123456  or  namespace/project-name"
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                />
                <span className="text-[10px] text-gray-500">
                  Find this on your GitLab project's main page (Settings → General)
                </span>
              </label>

              {/* Branch */}
              <label className="flex flex-col gap-1">
                <span className="field-label">Branch <span className="text-red-400">*</span></span>
                <input
                  type="text"
                  className="field-input"
                  placeholder="main"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                />
              </label>

              {/* Access Token */}
              <label className="flex flex-col gap-1">
                <span className="field-label">Access Token <span className="text-red-400">*</span></span>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="field-input pr-10"
                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                    value={form.token}
                    onChange={(e) => setForm({ ...form, token: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                    onClick={() => setShowToken((v) => !v)}
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <span className="text-[10px] text-gray-500">
                  Create a Personal Access Token with <strong className="text-gray-400">read_repository</strong> scope in
                  GitLab → User Settings → Access Tokens
                </span>
              </label>

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">
              <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary text-sm flex items-center gap-2"
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>{GITLAB_ICON} Connect</>
                )}
              </button>
            </div>
          </>
        )}

        {/* ── BROWSE STEP ── */}
        {step === 'browse' && (
          <>
            {/* Connected status bar */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-none" />
              <span className="text-xs text-emerald-300 flex-1 truncate">
                Connected · <strong>{gitlabConfig?.projectId}</strong> · branch: <strong>{gitlabConfig?.branch}</strong>
              </span>
              <button
                className="text-[11px] text-gray-400 hover:text-red-400 transition-colors flex-none"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">

              {/* Top bar */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {loading
                    ? 'Loading files…'
                    : `${files.length} file${files.length !== 1 ? 's' : ''} found`}
                </span>
                <button
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  onClick={() => gitlabConfig && loadFiles(gitlabConfig)}
                  disabled={loading}
                >
                  ↻ Refresh
                </button>
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-10 gap-3 text-gray-500 text-sm">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
                  Fetching repository…
                </div>
              )}

              {/* Empty */}
              {!loading && files.length === 0 && (
                <div className="text-center py-10 text-sm text-gray-500">
                  No <code>.md</code> or <code>.adoc</code> files found in this branch.
                </div>
              )}

              {/* Folder-grouped file list */}
              {!loading && groups.length > 0 && (
                <div className="flex flex-col gap-2">
                  {groups.map((group) => {
                    const collapsed = collapsedFolders.has(group.name);
                    return (
                      <div key={group.name}>
                        {/* Folder header */}
                        <button
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors group"
                          onClick={() => toggleFolder(group.name)}
                        >
                          <span className={`text-[10px] transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
                          {group.isWorkDir
                            ? <span className="flex-none">{FOLDER_ICON}</span>
                            : <span className="w-3.5 h-3.5 text-gray-500 flex-none">
                                <svg viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M1.5 2A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0014.5 4H7.621a1.5 1.5 0 01-1.06-.44L5.5 2.44A1.5 1.5 0 004.439 2H1.5z"/>
                                </svg>
                              </span>
                          }
                          <span className={`text-xs font-semibold truncate ${group.isWorkDir ? 'text-yellow-300' : 'text-gray-400'}`}>
                            {group.name}
                          </span>
                          <span className="ml-auto text-[10px] text-gray-600 group-hover:text-gray-500">
                            {group.files.length} file{group.files.length !== 1 ? 's' : ''}
                          </span>
                        </button>

                        {/* Files inside folder */}
                        {!collapsed && (
                          <div className="flex flex-col gap-0.5 ml-5 mt-0.5">
                            {group.files.map((file) => {
                              const isSelected = selected === file.path;
                              return (
                                <button
                                  key={file.path}
                                  className={[
                                    'w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-2.5',
                                    isSelected
                                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                                      : 'bg-white/3 border-white/8 text-gray-300 hover:bg-white/8 hover:border-white/15',
                                  ].join(' ')}
                                  onClick={() => setSelected(file.path)}
                                  onDoubleClick={handleImport}
                                >
                                  {/* File type icon */}
                                  <span className={isSelected ? 'text-indigo-400' : 'text-gray-500'}>
                                    {FILE_MD_ICON}
                                  </span>

                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">{file.name}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{file.path}</div>
                                  </div>

                                  {/* Extension badge */}
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border flex-none font-mono ${
                                    file.ext === 'adoc'
                                      ? 'bg-orange-500/15 text-orange-400 border-orange-500/20'
                                      : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
                                  }`}>
                                    .{file.ext}
                                  </span>

                                  {isSelected && (
                                    <svg className="w-3.5 h-3.5 text-indigo-400 flex-none" viewBox="0 0 16 16" fill="currentColor">
                                      <path d="M6.5 11.5l-3-3 1.06-1.06L6.5 9.38l5.44-5.44L13 5l-6.5 6.5z"/>
                                    </svg>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-[11px] text-gray-500 truncate max-w-[55%]">
                {selected
                  ? <>Selected: <span className="text-gray-300">{selected}</span></>
                  : 'No file selected'}
              </p>
              <div className="flex gap-2">
                <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
                <button
                  className="btn-primary text-sm flex items-center gap-2"
                  onClick={handleImport}
                  disabled={!selected || importing}
                >
                  {importing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importing…
                    </>
                  ) : (
                    'Import Presentation'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
