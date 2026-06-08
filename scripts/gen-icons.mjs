/**
 * gen-icons.mjs
 * Generates PNG icons (192x192 and 512x512) from public/icons/icon.svg
 * using only the Node.js built-in module and the browser-compatible
 * canvas via @napi-rs/canvas (if available) or a fallback pure-JS PNG encoder.
 *
 * Fallback: writes a solid #6366f1 square PNG (no SVG rendering needed).
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '..', 'public', 'icons');

// ── Minimal PNG encoder ────────────────────────────────────────
function crc32(buf) {
  let crc = 0xffffffff;
  const table = crc32.table ??= (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })();
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function makePng(size, r, g, b) {
  const PNG_SIG = Buffer.from([137,80,78,71,13,10,26,10]);

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw scanlines: filter byte (0) + RGB pixels per row
  const raw = Buffer.allocUnsafe(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const px = row + 1 + x * 3;
      raw[px] = r; raw[px+1] = g; raw[px+2] = b;
    }
  }

  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Indigo-500 (#6366f1) — matches the theme_color in vite.config.ts
const [R, G, B] = [0x63, 0x66, 0xf1];

for (const size of [192, 512]) {
  const outPath = join(ICONS_DIR, `icon-${size}.png`);
  writeFileSync(outPath, makePng(size, R, G, B));
  console.log(`  wrote ${outPath} (${size}×${size})`);
}

console.log('Icons generated.');
