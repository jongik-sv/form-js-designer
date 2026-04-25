// packages/designer-tiptap/scripts/copy-css.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// @bpmn-io/form-js re-exports viewer assets; resolve from form-js-viewer directly
const sources = [
  resolve(root, '../../node_modules/@bpmn-io/form-js-viewer/dist/assets/form-js-base.css'),
  resolve(root, '../../node_modules/@bpmn-io/form-js-viewer/dist/assets/form-js.css'),
  resolve(root, '../designer-components/src/container-base.css'),
  resolve(root, 'src/styles/entry.css'),
];

const out = resolve(root, 'dist/designer-tiptap.css');
mkdirSync(dirname(out), { recursive: true });

const merged = sources
  .map((p) => {
    try {
      return `/* === ${p.split('/').slice(-2).join('/')} === */\n` + readFileSync(p, 'utf8');
    } catch (err) {
      console.warn(`[copy-css] missing: ${p}`);
      return '';
    }
  })
  .filter(Boolean)
  .join('\n\n');

writeFileSync(out, merged);
console.log(`[copy-css] wrote ${out} (${merged.length} bytes)`);
