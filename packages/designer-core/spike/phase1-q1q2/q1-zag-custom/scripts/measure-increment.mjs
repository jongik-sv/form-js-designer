/**
 * Measure Zag 3 machines + custom Preact adapter gzip increment vs preact-only baseline.
 */
import { build } from 'vite';
import preact from '@preact/preset-vite';
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

async function buildAndMeasure(entry, outDir, mode) {
  await build({
    root: process.cwd(),
    logLevel: 'warn',
    plugins: [preact()],
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: entry,
        output: { entryFileNames: `${mode}.js`, assetFileNames: 'a/[name][extname]' },
      },
      write: true,
      minify: 'esbuild',
      target: 'es2020',
    },
  });

  const file = path.join(outDir, `${mode}.js`);
  const buf = await fs.readFile(file);
  const raw = buf.byteLength;
  const gzip = gzipSync(buf).byteLength;
  return { file, raw, gzip };
}

await fs.writeFile('entry-baseline.ts', `import './src/main-baseline';\n`);
await fs.writeFile('entry-full.ts', `import './src/main';\n`);

const baseline = await buildAndMeasure('entry-baseline.ts', 'dist-baseline', 'baseline');
const full = await buildAndMeasure('entry-full.ts', 'dist-full', 'full');

const out = {
  baseline_preact_only: baseline,
  full_with_zag_and_custom_adapter: full,
  delta_raw_bytes: full.raw - baseline.raw,
  delta_gzip_bytes: full.gzip - baseline.gzip,
  delta_gzip_kb: ((full.gzip - baseline.gzip) / 1024).toFixed(2),
};
await fs.writeFile('measurements/bundle-increment.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

await fs.rm('entry-baseline.ts');
await fs.rm('entry-full.ts');
