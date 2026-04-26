import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    viewer: 'src/index.ts',
    editor: 'src/editor/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  splitting: true,
  clean: true,
  external: [
    '@tiptap/core',
    '@tiptap/pm',
    '@tiptap/starter-kit',
    '@bpmn-io/form-js-viewer',
    '@bpmn-io/form-js-editor',
    'preact',
    'preact/compat',
    'preact/hooks',
  ],
  noExternal: [
    /^@form-js-designer\//,
  ],
  treeshake: true,
});
