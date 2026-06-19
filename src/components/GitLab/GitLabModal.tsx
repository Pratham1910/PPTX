import { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import {
  testConnection,
  listMdFiles,
  fetchFileContent,
  fetchFileAsDataUrl,
} from '../../services/gitlab.ts';
import type { GitLabConfig, GitLabFile } from '../../services/gitlab.ts';
import { adocToMarkdown } from '../../core/parser/adoc-to-md.ts';
import { SHOWCASE_PRESENTATION } from '../../data/showcase.ts';

interface Props {
  onClose: () => void;
}

type Step = 'connect' | 'browse';

const GITLAB_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.92z"/>
  </svg>
);

const FILE_ICON = (
  <svg width="13" height="13" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3 2.5A1.5 1.5 0 014.5 1h5.086a1.5 1.5 0 011.06.44l2.915 2.914A1.5 1.5 0 0114 5.414V13.5A1.5 1.5 0 0112.5 15h-8A1.5 1.5 0 013 13.5v-11z"/>
  </svg>
);

// ── folder grouping ──────────────────────────────────────────

interface FolderGroup {
  name: string;       // e.g. "Chapter 1", "(root)", "Other files"
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
  const sortedKeys = [...workDirMap.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  for (const k of sortedKeys) {
    groups.push({ name: k, isWorkDir: true, files: workDirMap.get(k)! });
  }
  if (others.length > 0) {
    groups.push({ name: 'Other files', isWorkDir: false, files: others });
  }
  return groups;
}

// ─────────────────────────────────────────────────────────────

export default function GitLabModal({ onClose }: Props) {
  const { gitlabConfig, setGitlabConfig, parseFromMarkdown, loadPresentation } = useEditorStore();

  // ── form ──────────────────────────────────────────────────
  const [form, setForm] = useState<GitLabConfig>(
    gitlabConfig ?? { url: 'https://gitlab.com', projectId: '', branch: 'main', token: '' }
  );
  const [showToken, setShowToken] = useState(false);

  // ── step / status ─────────────────────────────────────────
  const [step, setStep]       = useState<Step>(gitlabConfig ? 'browse' : 'connect');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── file browser ──────────────────────────────────────────
  const [files, setFiles]         = useState<GitLabFile[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const groups = useMemo(() => groupByFolder(files), [files]);

  useEffect(() => {
    if (step === 'browse' && gitlabConfig) loadFiles(gitlabConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── helpers ───────────────────────────────────────────────

  async function loadFiles(cfg: GitLabConfig) {
    setLoading(true);
    setError('');
    try {
      const result = await listMdFiles(cfg);
      setFiles(result);
      // Auto-select all WorkDir files
      const workDirPaths = result
        .filter((f) => f.path.startsWith('WorkDir/'))
        .map((f) => f.path);
      setSelectedPaths(new Set(workDirPaths.length ? workDirPaths : result.map((f) => f.path)));
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
    if (selectedPaths.size === 0 || !gitlabConfig) return;
    setImporting(true);
    setImportStatus('Fetching files…');
    setError('');
    try {
      const ordered = files.filter((f) => selectedPaths.has(f.path));

      // 1. Fetch all text files in parallel
      const contents = await Promise.all(
        ordered.map((f) => fetchFileContent(gitlabConfig, f.path))
      );

      // 2. Convert adoc → markdown per file
      const markdownParts = ordered.map((f, idx) =>
        f.ext === 'adoc' ? adocToMarkdown(contents[idx]) : contents[idx]
      );

      // 3. For each file, find relative image refs and replace with base64 data URIs
      setImportStatus('Fetching images…');

      const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

      const resolvedParts = await Promise.all(
        markdownParts.map(async (md, idx) => {
          // Directory of the source file (e.g. "WorkDir/Chapter 1")
          const filePath = ordered[idx].path;
          const fileDir  = filePath.includes('/')
            ? filePath.substring(0, filePath.lastIndexOf('/'))
            : '';

          // Collect unique relative image paths in this file
          const relativePaths = new Set<string>();
          let m: RegExpExecArray | null;
          IMG_RE.lastIndex = 0;
          while ((m = IMG_RE.exec(md)) !== null) {
            const src = m[2];
            if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
              relativePaths.add(src);
            }
          }

          if (relativePaths.size === 0) return md;

          // Fetch all images in parallel; skip ones that 404
          const dataUrls = new Map<string, string>();
          await Promise.all(
            [...relativePaths].map(async (imgPath) => {
              const gitlabPath = fileDir ? `${fileDir}/${imgPath}` : imgPath;
              const dataUrl = await fetchFileAsDataUrl(gitlabConfig!, gitlabPath);
              if (dataUrl) dataUrls.set(imgPath, dataUrl);
            })
          );

          // Replace relative paths with data URIs in-place
          return md.replace(IMG_RE, (_full, alt, src) => {
            const replacement = dataUrls.get(src);
            return replacement ? `![${alt}](${replacement})` : `![${alt}](${src})`;
          });
        })
      );

      setImportStatus('Building presentation…');
      parseFromMarkdown(resolvedParts.join('\n\n'));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
      setImportStatus('');
    }
  }

  function handleDisconnect() {
    // Clear the GitLab config from the store
    setGitlabConfig(null);
    // Reset the presentation to the default showcase so the
    // GitLab-sourced content is no longer visible after disconnect
    loadPresentation(SHOWCASE_PRESENTATION);
    // Reset local modal state
    setFiles([]);
    setSelectedPaths(new Set());
    setStep('connect');
    setError('');
  }

  // ── selection helpers ─────────────────────────────────────

  function toggleFile(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleFolder(groupFiles: GitLabFile[]) {
    const allSelected = groupFiles.every((f) => selectedPaths.has(f.path));
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      for (const f of groupFiles) {
        if (allSelected) next.delete(f.path);
        else next.add(f.path);
      }
      return next;
    });
  }

  function toggleCollapse(name: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectAll() {
    setSelectedPaths(new Set(files.map((f) => f.path)));
  }

  function selectNone() {
    setSelectedPaths(new Set());
  }

  // ── render ────────────────────────────────────────────────

  const selectedCount = selectedPaths.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#161b27] modal-animate border border-white/10 rounded-xl shadow-2xl w-[540px] max-h-[90vh] flex flex-col overflow-hidden">

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
                Connect to a GitLab repository. The app fetches
                {' '}<code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">.md</code> and
                {' '}<code className="text-orange-400 bg-orange-500/10 px-1 rounded">.adoc</code> files
                from <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">WorkDir/</code>,
                grouped by folder. Select one or multiple files to combine into a single presentation.
              </p>

              <label className="flex flex-col gap-1">
                <span className="field-label">GitLab URL <span className="text-red-400">*</span></span>
                <input type="url" className="field-input" placeholder="https://gitlab.com"
                  value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                <span className="text-[10px] text-gray-500">Use your self-hosted GitLab URL if applicable</span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="field-label">Project ID or Path <span className="text-red-400">*</span></span>
                <input type="text" className="field-input" placeholder="123456  or  namespace/project-name"
                  value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} />
                <span className="text-[10px] text-gray-500">Settings → General on your GitLab project page</span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="field-label">Branch <span className="text-red-400">*</span></span>
                <input type="text" className="field-input" placeholder="main"
                  value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
              </label>

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
                  <button type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                    onClick={() => setShowToken((v) => !v)}>
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <span className="text-[10px] text-gray-500">
                  Needs <strong className="text-gray-400">read_repository</strong> scope —
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
              <button className="btn-primary text-sm flex items-center gap-2"
                onClick={handleConnect} disabled={loading}>
                {loading
                  ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connecting…</>
                  : <>{GITLAB_ICON} Connect</>}
              </button>
            </div>
          </>
        )}

        {/* ── BROWSE STEP ── */}
        {step === 'browse' && (
          <>
            {/* Connected bar */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-none" />
              <span className="text-xs text-emerald-300 flex-1 truncate">
                Connected · <strong>{gitlabConfig?.projectId}</strong> · branch: <strong>{gitlabConfig?.branch}</strong>
              </span>
              <button className="text-[11px] text-gray-400 hover:text-red-400 transition-colors"
                onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>

            {/* Top controls */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-xs text-gray-400">
                {loading ? 'Loading…' : `${files.length} file${files.length !== 1 ? 's' : ''}`}
                {!loading && selectedCount > 0 && (
                  <span className="ml-1 text-indigo-400">· {selectedCount} selected</span>
                )}
              </span>
              <div className="flex items-center gap-3">
                {!loading && files.length > 0 && (
                  <>
                    <button className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                      onClick={selectAll}>All</button>
                    <button className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                      onClick={selectNone}>None</button>
                  </>
                )}
                <button className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  onClick={() => gitlabConfig && loadFiles(gitlabConfig)} disabled={loading}>
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* File tree */}
            <div className="px-4 pb-3 overflow-y-auto flex-1">
              {loading && (
                <div className="flex items-center justify-center py-10 gap-3 text-gray-500 text-sm">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
                  Fetching repository…
                </div>
              )}

              {!loading && files.length === 0 && (
                <div className="text-center py-10 text-sm text-gray-500">
                  No <code>.md</code> or <code>.adoc</code> files found.
                </div>
              )}

              {!loading && groups.map((group) => {
                const collapsed = collapsedFolders.has(group.name);
                const allChecked = group.files.every((f) => selectedPaths.has(f.path));
                const someChecked = group.files.some((f) => selectedPaths.has(f.path));

                return (
                  <div key={group.name} className="mb-2">
                    {/* Folder row */}
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors">
                      {/* Collapse toggle */}
                      <button
                        className="text-[9px] text-gray-500 w-3 flex-none"
                        onClick={() => toggleCollapse(group.name)}
                      >
                        {collapsed ? '▶' : '▼'}
                      </button>

                      {/* Folder checkbox */}
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => toggleFolder(group.files)}
                        className="w-3.5 h-3.5 accent-indigo-500 flex-none cursor-pointer"
                      />

                      {/* Folder icon + name */}
                      <button
                        className="flex items-center gap-1.5 flex-1 min-w-0"
                        onClick={() => toggleCollapse(group.name)}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
                          className={group.isWorkDir ? 'text-yellow-400' : 'text-gray-500'}>
                          <path d="M1.5 2A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0014.5 4H7.621a1.5 1.5 0 01-1.06-.44L5.5 2.44A1.5 1.5 0 004.439 2H1.5z"/>
                        </svg>
                        <span className={`text-xs font-semibold truncate ${group.isWorkDir ? 'text-yellow-300' : 'text-gray-400'}`}>
                          {group.name}
                        </span>
                        <span className="ml-auto text-[10px] text-gray-600 pr-1">
                          {group.files.length} file{group.files.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                    </div>

                    {/* Files */}
                    {!collapsed && (
                      <div className="ml-8 flex flex-col gap-0.5 mt-0.5">
                        {group.files.map((file) => {
                          const checked = selectedPaths.has(file.path);
                          return (
                            <label
                              key={file.path}
                              className={[
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                                checked
                                  ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200'
                                  : 'bg-white/3 border-white/8 text-gray-300 hover:bg-white/7 hover:border-white/15',
                              ].join(' ')}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFile(file.path)}
                                className="w-3.5 h-3.5 accent-indigo-500 flex-none"
                              />

                              <span className={checked ? 'text-indigo-400' : 'text-gray-500'}>
                                {FILE_ICON}
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
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mx-4 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-500">
                {selectedCount === 0
                  ? 'No files selected'
                  : `${selectedCount} file${selectedCount !== 1 ? 's' : ''} will be combined`}
              </p>
              <div className="flex gap-2">
                <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
                <button
                  className="btn-primary text-sm flex items-center gap-2"
                  onClick={handleImport}
                  disabled={selectedCount === 0 || importing}
                >
                  {importing
                    ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />{importStatus || 'Importing…'}</>
                    : `Import${selectedCount > 1 ? ` ${selectedCount} Files` : ' Presentation'}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
