/**
 * gitlab.ts
 *
 * Thin wrapper around the GitLab REST API v4.
 * All calls go directly from the browser (no proxy required for gitlab.com
 * and properly CORS-configured self-hosted instances).
 */

export interface GitLabConfig {
  url: string;        // e.g. "https://gitlab.com"
  projectId: string;  // numeric id OR "namespace/project-name"
  branch: string;     // e.g. "main"
  token: string;      // Personal / Project access token
}

export interface GitLabFile {
  id: string;
  name: string;
  path: string;
  type: 'blob' | 'tree';
  /** Derived from the file name — 'md' | 'adoc' */
  ext: 'md' | 'adoc';
  /** Immediate parent folder name relative to WorkDir/ (empty string = root) */
  folder: string;
}

// ─── helpers ──────────────────────────────────────────────────

function apiBase(url: string): string {
  return url.replace(/\/+$/, '') + '/api/v4';
}

function authHeaders(token: string): Record<string, string> {
  return { 'PRIVATE-TOKEN': token };
}

function encodeProjectId(projectId: string): string {
  const id = projectId.trim();
  // Numeric ID → use as-is; path → percent-encode slashes
  return /^\d+$/.test(id) ? id : encodeURIComponent(id);
}

async function guardedFetch(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(
      'Network error — check the GitLab URL and that the server allows CORS.'
    );
  }
  return res;
}

// ─── public API ───────────────────────────────────────────────

/**
 * Verify credentials by fetching the project metadata.
 * Throws a human-readable Error on failure.
 */
export async function testConnection(config: GitLabConfig): Promise<void> {
  const { url, projectId, token } = config;
  const res = await guardedFetch(
    `${apiBase(url)}/projects/${encodeProjectId(projectId)}`,
    { headers: authHeaders(token) }
  );
  if (res.ok) return;
  const body = await res.text().catch(() => '');
  if (res.status === 401) throw new Error('Invalid access token — check your Personal Access Token.');
  if (res.status === 403) throw new Error('Access denied — the token may lack read_repository scope.');
  if (res.status === 404) throw new Error('Project not found — verify the Project ID or path.');
  throw new Error(`GitLab returned ${res.status}: ${body.slice(0, 120)}`);
}

/**
 * Return all .md files found recursively in the repository.
 * Files inside `WorkDir/` are sorted to the top.
 */
export async function listMdFiles(config: GitLabConfig): Promise<GitLabFile[]> {
  const { url, projectId, branch, token } = config;
  const base = apiBase(url);
  const pid = encodeProjectId(projectId);

  // Fetch first 100 tree entries (covers most repos)
  const res = await guardedFetch(
    `${base}/projects/${pid}/repository/tree?` +
    `ref=${encodeURIComponent(branch)}&recursive=true&per_page=100`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(`Could not list files: ${res.status}`);

  const all: Array<Omit<GitLabFile, 'ext' | 'folder'>> = await res.json();
  const contentFiles = all
    .filter((f) => f.type === 'blob' && /\.(md|adoc)$/i.test(f.name))
    .map((f) => {
      const ext: 'md' | 'adoc' = /\.adoc$/i.test(f.name) ? 'adoc' : 'md';
      // folder = immediate subdirectory inside WorkDir/, or '' for root/non-WorkDir
      let folder = '';
      if (f.path.startsWith('WorkDir/')) {
        const rel = f.path.slice('WorkDir/'.length); // e.g. "Chapter 1/file.adoc"
        const slash = rel.indexOf('/');
        folder = slash >= 0 ? rel.slice(0, slash) : '';
      }
      return { ...f, ext, folder } as GitLabFile;
    });

  // Sort: WorkDir/ files first, then by folder name, then alphabetically
  return contentFiles.sort((a, b) => {
    const aWork = a.path.startsWith('WorkDir/') ? 0 : 1;
    const bWork = b.path.startsWith('WorkDir/') ? 0 : 1;
    if (aWork !== bWork) return aWork - bWork;
    if (a.folder !== b.folder) return a.folder.localeCompare(b.folder);
    return a.path.localeCompare(b.path);
  });
}

/**
 * Fetch the raw text content of a file by its repo path.
 */
export async function fetchFileContent(
  config: GitLabConfig,
  filePath: string
): Promise<string> {
  const { url, projectId, branch, token } = config;
  const base = apiBase(url);
  const pid = encodeProjectId(projectId);

  const res = await guardedFetch(
    `${base}/projects/${pid}/repository/files/${encodeURIComponent(filePath)}/raw` +
    `?ref=${encodeURIComponent(branch)}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(`Could not fetch "${filePath}": ${res.status}`);
  return res.text();
}

/**
 * Fetch a binary file (image, etc.) and return it as a base64 data URI.
 * Returns null if the file is not found (404) so callers can silently skip.
 */
export async function fetchFileAsDataUrl(
  config: GitLabConfig,
  filePath: string
): Promise<string | null> {
  const { url, projectId, branch, token } = config;
  const base = apiBase(url);
  const pid = encodeProjectId(projectId);

  let res: Response;
  try {
    res = await fetch(
      `${base}/projects/${pid}/repository/files/${encodeURIComponent(filePath)}/raw` +
      `?ref=${encodeURIComponent(branch)}`,
      { headers: authHeaders(token) }
    );
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
