/**
 * Copies vendor runtime files from node_modules → public/vendor/
 * Run automatically after `npm install` via the postinstall script.
 *
 * Why public/ instead of ?url imports:
 *   reveal.js v6 uses a restrictive package.json exports map that prevents
 *   Rollup from resolving arbitrary dist/ paths. Copying to public/ keeps
 *   vendor assets outside the module graph entirely — served as static files
 *   by Vite, cached by the PWA service worker, available offline.
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const nm   = join(root, 'node_modules');
const pub  = join(root, 'public', 'vendor');

function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log('  copied', to.replace(root + '/', ''));
}

console.log('Copying vendor assets to public/vendor/ …');

// ── Reveal.js ─────────────────────────────────────────────────
const rv = join(nm, 'reveal.js', 'dist');
copy(join(rv, 'reset.css'),                   join(pub, 'reveal', 'reset.css'));
copy(join(rv, 'reveal.css'),                  join(pub, 'reveal', 'reveal.css'));
copy(join(rv, 'reveal.js'),                   join(pub, 'reveal', 'reveal.js'));
copy(join(rv, 'plugin', 'highlight.js'),      join(pub, 'reveal', 'plugin', 'highlight.js'));
copy(join(rv, 'plugin', 'notes.js'),          join(pub, 'reveal', 'plugin', 'notes.js'));
copy(join(rv, 'plugin', 'zoom.js'),           join(pub, 'reveal', 'plugin', 'zoom.js'));
copy(join(rv, 'plugin', 'search.js'),         join(pub, 'reveal', 'plugin', 'search.js'));
copy(join(rv, 'plugin', 'math.js'),           join(pub, 'reveal', 'plugin', 'math.js'));

// ── highlight.js CSS theme ────────────────────────────────────
copy(
  join(nm, 'highlight.js', 'styles', 'github-dark.min.css'),
  join(pub, 'highlight', 'github-dark.min.css'),
);

// ── Mermaid ───────────────────────────────────────────────────
copy(
  join(nm, 'mermaid', 'dist', 'mermaid.min.js'),
  join(pub, 'mermaid', 'mermaid.min.js'),
);

console.log('Done.');
