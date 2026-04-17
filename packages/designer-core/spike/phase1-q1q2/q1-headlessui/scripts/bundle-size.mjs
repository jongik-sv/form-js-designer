// Measure gzip size of main JS chunks in dist/.
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const distAssets = path.join(root, 'dist/assets');
const out = path.join(root, 'measurements/bundle-size.txt');

const files = await fs.readdir(distAssets);
const lines = ['file\traw\tgzip'];
let totalRaw = 0;
let totalGzip = 0;
for (const f of files.sort()) {
  if (!f.endsWith('.js') && !f.endsWith('.css')) continue;
  const buf = await fs.readFile(path.join(distAssets, f));
  const raw = buf.byteLength;
  const gz = gzipSync(buf).byteLength;
  totalRaw += raw;
  totalGzip += gz;
  lines.push(`${f}\t${raw}\t${gz}`);
}
lines.push(`TOTAL\t${totalRaw}\t${totalGzip}`);
lines.push('');
lines.push(`TOTAL gzip KB: ${(totalGzip / 1024).toFixed(2)}`);
await fs.writeFile(out, lines.join('\n'));
console.log(lines.join('\n'));
