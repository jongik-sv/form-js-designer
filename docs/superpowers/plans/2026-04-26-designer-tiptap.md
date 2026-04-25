# Designer × Tiptap (v0.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@form-js-designer/designer-tiptap` v0.1 — a single self-contained Tiptap extension that renders form-js-designer schemas (incl. Tabs/Card/Modal) as atomic blocks via vanilla NodeView, distributable via GitHub Packages with no changes to the existing 6 designer-* packages.

**Architecture:** New monorepo package `packages/designer-tiptap/`. A Tiptap `Node` (atom, draggable) carries the form-js schema as a plain JSON attribute. NodeView mounts `@bpmn-io/form-js-viewer` with `DesignerContainerModule` + `DesignerComponentsModule` + `LayoutHeightModule` injected so our Tabs/Card components render. Built with `tsup` — designer-* are inlined (`noExternal`), `@bpmn-io/form-js-*`/`@tiptap/*`/`preact` stay peer.

**Tech Stack:** TypeScript, Tiptap v2 (`@tiptap/core` + `@tiptap/pm`), `@bpmn-io/form-js-viewer` 1.21.x, Preact 10.29.x, Vitest + happy-dom (units), Playwright (e2e), tsup (bundler), Vite (examples).

**Spec:** [`docs/superpowers/specs/2026-04-26-designer-tiptap-design.md`](../specs/2026-04-26-designer-tiptap-design.md)

---

## File Structure

```
packages/designer-tiptap/
├── package.json                       # Create — name, exports, peer, publishConfig
├── tsconfig.json                      # Create
├── tsup.config.ts                     # Create — viewer entry only in v0.1 (editor stub)
├── vitest.config.ts                   # Create
├── playwright.config.ts               # Create
├── README.md                          # Create — consumer guide
├── .npmignore                         # Create
├── scripts/
│   └── copy-css.mjs                   # Create — aggregate form-js + designer CSS into dist
├── src/
│   ├── index.ts                       # Create — public exports (FormJsBlock node)
│   ├── node.ts                        # Create — Tiptap Node spec
│   ├── mount/
│   │   └── mountFormJs.ts             # Create — thin form-js Viewer wrapper
│   ├── nodeview/
│   │   └── viewer.ts                  # Create — NodeView lifecycle
│   ├── editor/
│   │   └── index.ts                   # Create — v0.2 placeholder (throws NotImplemented)
│   ├── styles/
│   │   └── entry.css                  # Create — CSS source aggregator (built into dist)
│   └── __tests__/
│       ├── node.test.ts               # Create — Node spec round-trip
│       └── mount.test.ts              # Create — mountFormJs contract
├── e2e/
│   └── tiptap-host.spec.ts            # Create — 6 scenarios
└── examples/
    └── vanilla-host/
        ├── index.html                 # Create
        ├── main.ts                    # Create
        ├── vite.config.ts             # Create
        └── seed/
            ├── simple.json            # Create
            ├── tabs.json              # Create
            └── modal.json             # Create
```

No files outside `packages/designer-tiptap/` are modified in v0.1 (root `package.json` gets one optional `release:tiptap` script line — see Task 12).

---

## Task 1: Scaffold package skeleton

**Files:**
- Create: `packages/designer-tiptap/package.json`
- Create: `packages/designer-tiptap/tsconfig.json`
- Create: `packages/designer-tiptap/vitest.config.ts`
- Create: `packages/designer-tiptap/.npmignore`
- Create: `packages/designer-tiptap/src/index.ts` (placeholder export)

- [ ] **Step 1: Create package.json**

```jsonc
// packages/designer-tiptap/package.json
{
  "name": "@form-js-designer/designer-tiptap",
  "version": "0.1.0",
  "private": false,
  "description": "Tiptap extension for form-js-designer schemas (Tabs/Card/Modal aware)",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./editor": "./src/editor/index.ts",
    "./styles": "./dist/designer-tiptap.css"
  },
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted",
    "main": "./dist/viewer.js",
    "types": "./dist/viewer.d.ts",
    "exports": {
      ".": { "import": "./dist/viewer.js", "types": "./dist/viewer.d.ts" },
      "./editor": { "import": "./dist/editor.js", "types": "./dist/editor.d.ts" },
      "./styles": "./dist/designer-tiptap.css"
    }
  },
  "scripts": {
    "dev": "vite --config examples/vanilla-host/vite.config.ts",
    "build": "tsup && node scripts/copy-css.mjs",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed"
  },
  "peerDependencies": {
    "@tiptap/core": "^2",
    "@tiptap/pm": "^2",
    "@bpmn-io/form-js-viewer": "^1.21.2",
    "preact": "^10.19.3"
  },
  "dependencies": {
    "@form-js-designer/designer-core": "*",
    "@form-js-designer/designer-components": "*",
    "@form-js-designer/designer-runtime": "*"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.11.0",
    "@playwright/test": "^1.47.2",
    "@tiptap/core": "^2.6.6",
    "@tiptap/pm": "^2.6.6",
    "@tiptap/starter-kit": "^2.6.6",
    "@types/node": "^20.16.10",
    "happy-dom": "^15.7.4",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```jsonc
// packages/designer-tiptap/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "e2e", "examples", "scripts"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
// packages/designer-tiptap/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create .npmignore**

```
# packages/designer-tiptap/.npmignore
src/
e2e/
examples/
scripts/
test-results/
playwright-report/
*.test.ts
tsconfig.json
vitest.config.ts
playwright.config.ts
tsup.config.ts
```

- [ ] **Step 5: Create placeholder src/index.ts**

```ts
// packages/designer-tiptap/src/index.ts
export const VERSION = '0.1.0';
```

- [ ] **Step 6: Install dependencies at workspace root**

```bash
cd /Users/jji/project/form-js-designer
npm install
```

Expected: workspace links resolved, `node_modules/@form-js-designer/designer-tiptap` symlinks present.

- [ ] **Step 7: Verify typecheck passes with empty package**

```bash
npm run typecheck -w @form-js-designer/designer-tiptap
```

Expected: exit 0, no output.

- [ ] **Step 8: Commit**

```bash
git add packages/designer-tiptap/ package-lock.json
git commit -m "feat(designer-tiptap): scaffold package skeleton"
```

---

## Task 2: Tiptap Node spec — attrs, parseHTML, renderHTML (TDD)

**Files:**
- Create: `packages/designer-tiptap/src/node.ts`
- Create: `packages/designer-tiptap/src/__tests__/node.test.ts`

- [ ] **Step 1: Write failing test for round-trip**

```ts
// packages/designer-tiptap/src/__tests__/node.test.ts
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FormJsBlock } from '../node';

function makeEditor() {
  return new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit, FormJsBlock],
  });
}

describe('FormJsBlock node spec', () => {
  it('inserts a form-js-block with schema attr', () => {
    const editor = makeEditor();
    const schema = { type: 'default', components: [{ type: 'textfield', key: 'name' }] };

    editor.commands.insertContent({
      type: 'formJsBlock',
      attrs: { schema, formId: 'f1' },
    });

    const json = editor.getJSON();
    const block = json.content?.find((n) => n.type === 'formJsBlock');
    expect(block?.attrs?.schema).toEqual(schema);
    expect(block?.attrs?.formId).toBe('f1');
  });

  it('serializes schema to data-form-schema and parses back', () => {
    const editor = makeEditor();
    const schema = { type: 'default', components: [{ type: 'textfield', key: 'a' }] };

    editor.commands.insertContent({ type: 'formJsBlock', attrs: { schema } });
    const html = editor.getHTML();

    expect(html).toContain('data-type="form-js-block"');
    expect(html).toContain('data-form-schema');

    const editor2 = makeEditor();
    editor2.commands.setContent(html);
    const block = editor2.getJSON().content?.find((n) => n.type === 'formJsBlock');
    expect(block?.attrs?.schema).toEqual(schema);
  });

  it('treats node as atom (no contentDOM)', () => {
    const editor = makeEditor();
    const ext = editor.extensionManager.extensions.find((e) => e.name === 'formJsBlock');
    expect(ext?.config.atom).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test:unit -w @form-js-designer/designer-tiptap
```

Expected: FAIL — `Cannot find module '../node'`.

- [ ] **Step 3: Implement Node**

```ts
// packages/designer-tiptap/src/node.ts
import { Node, mergeAttributes } from '@tiptap/core';

export interface FormJsBlockAttrs {
  schema: Record<string, unknown> | null;
  formId: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formJsBlock: {
      insertFormJsBlock: (schema: Record<string, unknown>, formId?: string) => ReturnType;
      updateFormJsBlock: (schema: Record<string, unknown>) => ReturnType;
    };
  }
}

export const FormJsBlock = Node.create({
  name: 'formJsBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      schema: {
        default: null,
        parseHTML: (el) => {
          const raw = (el as HTMLElement).getAttribute('data-form-schema');
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        },
        renderHTML: (attrs) => ({
          'data-form-schema': attrs.schema ? JSON.stringify(attrs.schema) : '',
        }),
      },
      formId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-form-id'),
        renderHTML: (attrs) => (attrs.formId ? { 'data-form-id': attrs.formId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="form-js-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'form-js-block' })];
  },
});
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm run test:unit -w @form-js-designer/designer-tiptap
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-tiptap/src/
git commit -m "feat(designer-tiptap): Tiptap Node spec with schema attr round-trip"
```

---

## Task 3: addCommands — insertFormJsBlock / updateFormJsBlock (TDD)

**Files:**
- Modify: `packages/designer-tiptap/src/node.ts`
- Modify: `packages/designer-tiptap/src/__tests__/node.test.ts`

- [ ] **Step 1: Add failing test**

Append to `node.test.ts`:

```ts
describe('FormJsBlock commands', () => {
  it('insertFormJsBlock inserts node with schema', () => {
    const editor = makeEditor();
    const schema = { type: 'default', components: [{ type: 'textfield', key: 'name' }] };
    editor.commands.insertFormJsBlock(schema, 'form-1');
    const block = editor.getJSON().content?.find((n) => n.type === 'formJsBlock');
    expect(block?.attrs?.schema).toEqual(schema);
    expect(block?.attrs?.formId).toBe('form-1');
  });

  it('updateFormJsBlock updates schema on selected node', () => {
    const editor = makeEditor();
    const v1 = { type: 'default', components: [] };
    const v2 = { type: 'default', components: [{ type: 'textfield', key: 'x' }] };
    editor.commands.insertFormJsBlock(v1);
    editor.commands.selectNodeBackward();
    editor.commands.updateFormJsBlock(v2);
    const block = editor.getJSON().content?.find((n) => n.type === 'formJsBlock');
    expect(block?.attrs?.schema).toEqual(v2);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
npm run test:unit -w @form-js-designer/designer-tiptap
```

Expected: FAIL — `editor.commands.insertFormJsBlock is not a function`.

- [ ] **Step 3: Implement addCommands**

In `src/node.ts`, add to the Node config (after `renderHTML`):

```ts
  addCommands() {
    return {
      insertFormJsBlock:
        (schema, formId) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { schema, formId: formId ?? null },
          }),
      updateFormJsBlock:
        (schema) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { schema }),
    };
  },
```

- [ ] **Step 4: Verify tests pass**

```bash
npm run test:unit -w @form-js-designer/designer-tiptap
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-tiptap/src/
git commit -m "feat(designer-tiptap): insertFormJsBlock / updateFormJsBlock commands"
```

---

## Task 4: Mount helper `mountFormJs` (TDD)

**Files:**
- Create: `packages/designer-tiptap/src/mount/mountFormJs.ts`
- Create: `packages/designer-tiptap/src/__tests__/mount.test.ts`

`mountFormJs` is the thin wrapper around `@bpmn-io/form-js-viewer`'s `Form` constructor that injects our designer modules. It returns a handle with `update(schema)` and `destroy()`.

- [ ] **Step 1: Write failing test (with mocked Form)**

```ts
// packages/designer-tiptap/src/__tests__/mount.test.ts
import { describe, it, expect, vi } from 'vitest';

const importSchema = vi.fn(async () => {});
const destroy = vi.fn();
const FormCtor = vi.fn().mockImplementation(() => ({ importSchema, destroy }));

vi.mock('@bpmn-io/form-js-viewer', () => ({ Form: FormCtor }));
vi.mock('@form-js-designer/designer-core', () => ({ DesignerContainerModule: { __id: 'container' } }));
vi.mock('@form-js-designer/designer-components', () => ({
  DesignerComponentsModule: { __id: 'components' },
  migrateLegacyTabsSchema: (s: unknown) => s,
}));
vi.mock('@form-js-designer/designer-runtime', () => ({
  LayoutHeightModule: { __id: 'layout-height' },
}));

import { mountFormJs } from '../mount/mountFormJs';

describe('mountFormJs', () => {
  it('constructs Form with designer modules and imports schema', async () => {
    const container = document.createElement('div');
    const schema = { type: 'default', components: [] };
    const handle = await mountFormJs({ container, schema });

    expect(FormCtor).toHaveBeenCalledTimes(1);
    const opts = FormCtor.mock.calls[0][0];
    expect(opts.container).toBe(container);
    expect(opts.additionalModules).toEqual([
      { __id: 'container' },
      { __id: 'components' },
      { __id: 'layout-height' },
    ]);
    expect(importSchema).toHaveBeenCalledWith(schema);
    expect(typeof handle.update).toBe('function');
    expect(typeof handle.destroy).toBe('function');
  });

  it('handle.update calls importSchema again', async () => {
    importSchema.mockClear();
    const handle = await mountFormJs({
      container: document.createElement('div'),
      schema: { type: 'default', components: [] },
    });
    await handle.update({ type: 'default', components: [{ type: 'textfield', key: 'x' }] });
    expect(importSchema).toHaveBeenCalledTimes(2);
  });

  it('handle.destroy calls form destroy', async () => {
    destroy.mockClear();
    const handle = await mountFormJs({
      container: document.createElement('div'),
      schema: { type: 'default', components: [] },
    });
    handle.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test:unit -w @form-js-designer/designer-tiptap
```

Expected: FAIL — `Cannot find module '../mount/mountFormJs'`.

- [ ] **Step 3: Implement mountFormJs**

```ts
// packages/designer-tiptap/src/mount/mountFormJs.ts
import { Form } from '@bpmn-io/form-js-viewer';
import { DesignerContainerModule } from '@form-js-designer/designer-core';
import {
  DesignerComponentsModule,
  migrateLegacyTabsSchema,
} from '@form-js-designer/designer-components';
import { LayoutHeightModule } from '@form-js-designer/designer-runtime';

export interface MountOptions {
  container: HTMLElement;
  schema: Record<string, unknown>;
}

export interface MountHandle {
  update(schema: Record<string, unknown>): Promise<void>;
  destroy(): void;
}

export async function mountFormJs(opts: MountOptions): Promise<MountHandle> {
  const { container, schema } = opts;

  const form = new (Form as unknown as new (cfg: unknown) => {
    importSchema: (s: unknown) => Promise<void>;
    destroy: () => void;
  })({
    container,
    additionalModules: [
      DesignerContainerModule,
      DesignerComponentsModule,
      LayoutHeightModule,
    ],
  });

  await form.importSchema(migrateLegacyTabsSchema(schema));

  return {
    async update(next: Record<string, unknown>) {
      await form.importSchema(migrateLegacyTabsSchema(next));
    },
    destroy() {
      form.destroy();
    },
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm run test:unit -w @form-js-designer/designer-tiptap
```

Expected: PASS — 3 mount tests + 5 node tests.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-tiptap/src/
git commit -m "feat(designer-tiptap): mountFormJs helper with designer modules"
```

---

## Task 5: NodeView — viewer lifecycle + idempotent update

**Files:**
- Create: `packages/designer-tiptap/src/nodeview/viewer.ts`
- Modify: `packages/designer-tiptap/src/node.ts` (wire `addNodeView`)

NodeView mounts `mountFormJs` into a wrapper div. On Tiptap's `update` callback we compare the new schema to the previous one (deep equal via JSON string) and only re-import when it actually changed.

- [ ] **Step 1: Implement NodeView module**

```ts
// packages/designer-tiptap/src/nodeview/viewer.ts
import type { NodeViewRenderer, NodeViewRendererProps } from '@tiptap/core';
import { mountFormJs, type MountHandle } from '../mount/mountFormJs';

export const createFormJsViewerNodeView: NodeViewRenderer = (props: NodeViewRendererProps) => {
  const dom = document.createElement('div');
  dom.dataset.type = 'form-js-block';
  dom.classList.add('form-js-tiptap-block');

  const inner = document.createElement('div');
  inner.classList.add('form-js-tiptap-block__inner');
  dom.appendChild(inner);

  let handle: MountHandle | null = null;
  let lastSchemaJson = '';

  const mount = async (schema: Record<string, unknown> | null) => {
    if (!schema) return;
    lastSchemaJson = JSON.stringify(schema);
    handle = await mountFormJs({ container: inner, schema });
  };

  void mount(props.node.attrs.schema as Record<string, unknown> | null);

  return {
    dom,
    update(updatedNode) {
      if (updatedNode.type.name !== props.node.type.name) return false;
      const next = updatedNode.attrs.schema as Record<string, unknown> | null;
      const nextJson = next ? JSON.stringify(next) : '';
      if (nextJson === lastSchemaJson) return true;
      lastSchemaJson = nextJson;
      if (handle && next) void handle.update(next);
      return true;
    },
    destroy() {
      handle?.destroy();
      handle = null;
      while (inner.firstChild) inner.removeChild(inner.firstChild);
    },
    stopEvent(event: Event) {
      const target = event.target as Node | null;
      return inner.contains(target);
    },
    ignoreMutation(mutation) {
      return inner.contains(mutation.target as Node);
    },
  };
};
```

- [ ] **Step 2: Wire `addNodeView` in node.ts**

Append to the Node config in `src/node.ts` (after `addCommands`):

```ts
  addNodeView() {
    // dynamic import to keep node.ts test-friendly without DOM mount in unit tests
    return (props) => {
      const { createFormJsViewerNodeView } = require('./nodeview/viewer');
      return (createFormJsViewerNodeView as typeof import('./nodeview/viewer').createFormJsViewerNodeView)(
        props,
      );
    };
  },
```

(`require` is used because tsup outputs ESM; at runtime Tiptap calls this lazily, and tsup will resolve it. If your environment forbids `require`, swap to a top-level static import — the unit tests already mock `mountFormJs`.)

**Cleaner alternative (preferred if the static import works in your test setup):**

```ts
import { createFormJsViewerNodeView } from './nodeview/viewer';

// ...
  addNodeView() {
    return createFormJsViewerNodeView;
  },
```

Use the static-import version. Drop the `require` form — it's only documented above as a fallback.

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck -w @form-js-designer/designer-tiptap
```

Expected: exit 0.

- [ ] **Step 4: Verify all unit tests still pass**

```bash
npm run test:unit -w @form-js-designer/designer-tiptap
```

Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-tiptap/src/
git commit -m "feat(designer-tiptap): NodeView with mount/update/destroy + event isolation"
```

---

## Task 6: CSS bundle aggregator

**Files:**
- Create: `packages/designer-tiptap/src/styles/entry.css`
- Create: `packages/designer-tiptap/scripts/copy-css.mjs`

The package needs to ship one CSS file `dist/designer-tiptap.css` that includes:
1. `@bpmn-io/form-js/dist/assets/form-js-base.css` (memory: missing this → drop container h=0)
2. `@form-js-designer/designer-components` `container-base.css` (already imported by JS, but ship combined for explicit `import '...styles'` users)
3. Local block styles

- [ ] **Step 1: Create CSS source aggregator**

```css
/* packages/designer-tiptap/src/styles/entry.css */
@import '@bpmn-io/form-js/dist/assets/form-js-base.css';
@import '@bpmn-io/form-js/dist/assets/form-js.css';
@import '@form-js-designer/designer-components/src/container-base.css';

.form-js-tiptap-block {
  border: 1px solid var(--fjs-border-color, #e5e7eb);
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  position: relative;
}

.form-js-tiptap-block__inner {
  pointer-events: auto;
}

.form-js-tiptap-block.ProseMirror-selectednode {
  outline: 2px solid var(--fjs-primary, #2563eb);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Create copy-css script**

```js
// packages/designer-tiptap/scripts/copy-css.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const sources = [
  resolve(root, '../../node_modules/@bpmn-io/form-js/dist/assets/form-js-base.css'),
  resolve(root, '../../node_modules/@bpmn-io/form-js/dist/assets/form-js.css'),
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
```

- [ ] **Step 3: Verify script can resolve all source paths**

```bash
node packages/designer-tiptap/scripts/copy-css.mjs
```

Expected: prints `[copy-css] wrote .../dist/designer-tiptap.css (NNNN bytes)` with no warnings. If `[copy-css] missing` appears for a form-js path, run `npm install` at root and retry.

- [ ] **Step 4: Commit**

```bash
git add packages/designer-tiptap/src/styles/ packages/designer-tiptap/scripts/
git commit -m "feat(designer-tiptap): CSS bundle pipeline aggregating form-js + designer styles"
```

---

## Task 7: Public exports + editor stub

**Files:**
- Modify: `packages/designer-tiptap/src/index.ts`
- Create: `packages/designer-tiptap/src/editor/index.ts`

- [ ] **Step 1: Replace placeholder index.ts**

```ts
// packages/designer-tiptap/src/index.ts
export { FormJsBlock } from './node';
export { mountFormJs } from './mount/mountFormJs';
export type { MountOptions, MountHandle } from './mount/mountFormJs';
export type { FormJsBlockAttrs } from './node';
export const VERSION = '0.1.0';
```

- [ ] **Step 2: Create editor placeholder**

```ts
// packages/designer-tiptap/src/editor/index.ts
import { FormJsBlock } from '../node';

export { FormJsBlock };

/**
 * v0.2 — wraps FormJsBlock with double-click → designer modal.
 * In v0.1 this is a passthrough; consumers using ./editor get the same node as ./.
 */
export function withDesigner(node: typeof FormJsBlock): typeof FormJsBlock {
  return node;
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck -w @form-js-designer/designer-tiptap
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/designer-tiptap/src/index.ts packages/designer-tiptap/src/editor/
git commit -m "feat(designer-tiptap): public exports + editor stub for v0.2"
```

---

## Task 8: examples/vanilla-host (manual + e2e source of truth)

**Files:**
- Create: `packages/designer-tiptap/examples/vanilla-host/index.html`
- Create: `packages/designer-tiptap/examples/vanilla-host/main.ts`
- Create: `packages/designer-tiptap/examples/vanilla-host/vite.config.ts`
- Create: `packages/designer-tiptap/examples/vanilla-host/seed/simple.json`
- Create: `packages/designer-tiptap/examples/vanilla-host/seed/tabs.json`
- Create: `packages/designer-tiptap/examples/vanilla-host/seed/modal.json`

- [ ] **Step 1: Create vite.config.ts**

```ts
// packages/designer-tiptap/examples/vanilla-host/vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  server: { port: 5179, strictPort: true },
  resolve: {
    alias: {
      '@form-js-designer/designer-tiptap': resolve(__dirname, '../../src/index.ts'),
      '@form-js-designer/designer-tiptap/styles': resolve(__dirname, '../../src/styles/entry.css'),
    },
    dedupe: ['preact'],
  },
});
```

- [ ] **Step 2: Create index.html**

```html
<!-- packages/designer-tiptap/examples/vanilla-host/index.html -->
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>designer-tiptap vanilla host</title>
    <style>
      body { font: 14px/1.5 system-ui, sans-serif; margin: 24px; max-width: 960px; }
      .toolbar { margin-bottom: 12px; display: flex; gap: 8px; }
      .toolbar button { padding: 6px 12px; cursor: pointer; }
      .ProseMirror { border: 1px solid #ddd; padding: 16px; min-height: 400px; }
    </style>
  </head>
  <body>
    <h1>designer-tiptap vanilla host</h1>
    <div class="toolbar">
      <button data-testid="insert-simple">Insert Simple</button>
      <button data-testid="insert-tabs">Insert Tabs</button>
      <button data-testid="insert-modal">Insert Modal</button>
      <button data-testid="dump-html">Dump HTML</button>
      <button data-testid="reload-from-html">Reload</button>
    </div>
    <div id="editor"></div>
    <pre id="dump" data-testid="dump-output" style="background:#f7f7f7; padding:12px"></pre>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: Create main.ts**

```ts
// packages/designer-tiptap/examples/vanilla-host/main.ts
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FormJsBlock } from '@form-js-designer/designer-tiptap';
import '@form-js-designer/designer-tiptap/styles';

import simple from './seed/simple.json';
import tabs from './seed/tabs.json';
import modal from './seed/modal.json';

const editorEl = document.querySelector<HTMLElement>('#editor')!;
const dumpEl = document.querySelector<HTMLElement>('#dump')!;

let txCount = 0;
const editor = new Editor({
  element: editorEl,
  extensions: [StarterKit, FormJsBlock],
  content: '<p>Type here, then insert a form below…</p>',
  onTransaction: () => {
    txCount += 1;
  },
});

(window as unknown as { editor: Editor; __txCount: number }).editor = editor;
Object.defineProperty(window, '__txCount', { get: () => txCount });

document.querySelector('[data-testid="insert-simple"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(simple as Record<string, unknown>, 'simple-1');
});
document.querySelector('[data-testid="insert-tabs"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(tabs as Record<string, unknown>, 'tabs-1');
});
document.querySelector('[data-testid="insert-modal"]')!.addEventListener('click', () => {
  editor.commands.insertFormJsBlock(modal as Record<string, unknown>, 'modal-1');
});
document.querySelector('[data-testid="dump-html"]')!.addEventListener('click', () => {
  dumpEl.textContent = editor.getHTML();
});
document.querySelector('[data-testid="reload-from-html"]')!.addEventListener('click', () => {
  editor.commands.setContent(dumpEl.textContent ?? '');
});
```

- [ ] **Step 4: Create seed schemas**

```jsonc
// packages/designer-tiptap/examples/vanilla-host/seed/simple.json
{
  "type": "default",
  "components": [
    { "type": "textfield", "key": "name", "label": "이름" },
    { "type": "textfield", "key": "email", "label": "이메일" }
  ]
}
```

```jsonc
// packages/designer-tiptap/examples/vanilla-host/seed/tabs.json
{
  "type": "default",
  "components": [
    {
      "type": "tabs",
      "id": "tabs-root",
      "label": "탭 컨테이너",
      "components": [
        {
          "type": "tabPanel",
          "id": "tab-1",
          "label": "기본",
          "components": [
            { "type": "textfield", "key": "name", "label": "이름" }
          ]
        },
        {
          "type": "tabPanel",
          "id": "tab-2",
          "label": "추가",
          "components": [
            {
              "type": "card",
              "id": "card-1",
              "label": "카드",
              "components": [
                { "type": "textfield", "key": "memo", "label": "메모" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

```jsonc
// packages/designer-tiptap/examples/vanilla-host/seed/modal.json
{
  "type": "default",
  "components": [
    {
      "type": "modal",
      "id": "modal-1",
      "label": "모달 컨테이너",
      "components": [
        { "type": "textfield", "key": "code", "label": "코드" }
      ]
    }
  ]
}
```

- [ ] **Step 5: Manually verify dev server boots and renders**

```bash
npm run dev -w @form-js-designer/designer-tiptap
# open http://localhost:5179
# click "Insert Tabs" → expect tab strip with two tabs and a card inside tab 2
# stop with Ctrl+C
```

Expected: page loads, clicking "Insert Tabs" renders our designer Tabs/Card visibly.

- [ ] **Step 6: Commit**

```bash
git add packages/designer-tiptap/examples/
git commit -m "feat(designer-tiptap): examples/vanilla-host with seed schemas"
```

---

## Task 9: Playwright config + 6 e2e scenarios

**Files:**
- Create: `packages/designer-tiptap/playwright.config.ts`
- Create: `packages/designer-tiptap/e2e/tiptap-host.spec.ts`

- [ ] **Step 1: Create playwright.config.ts**

```ts
// packages/designer-tiptap/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5179',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -w @form-js-designer/designer-tiptap',
    url: 'http://localhost:5179',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 2: Create the e2e spec**

```ts
// packages/designer-tiptap/e2e/tiptap-host.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('1. insert simple → input rendered inside form-js-block', async ({ page }) => {
  await page.getByTestId('insert-simple').click();
  const block = page.locator('[data-type="form-js-block"]').first();
  await expect(block).toBeVisible();
  await expect(block.locator('input').first()).toBeVisible();
});

test('2. insert tabs → designer Tabs + Card components render', async ({ page }) => {
  await page.getByTestId('insert-tabs').click();
  const block = page.locator('[data-type="form-js-block"]').first();
  await expect(block.locator('.fjs-tabs [role="tab"]')).toHaveCount(2);
  await block.locator('.fjs-tabs [role="tab"]').nth(1).click();
  await expect(block.locator('.fjs-card')).toBeVisible();
});

test('3. round-trip: HTML serialize → setContent → identical components', async ({ page }) => {
  await page.getByTestId('insert-tabs').click();
  await page.getByTestId('dump-html').click();
  const dump = await page.getByTestId('dump-output').textContent();
  expect(dump).toContain('data-type="form-js-block"');
  expect(dump).toContain('data-form-schema');

  await page.getByTestId('reload-from-html').click();
  await expect(page.locator('.fjs-tabs [role="tab"]')).toHaveCount(2);
});

test('4. event isolation: form-js input does not fire ProseMirror transaction', async ({ page }) => {
  await page.getByTestId('insert-simple').click();
  const beforeTx = await page.evaluate(() => (window as { __txCount?: number }).__txCount ?? 0);
  await page.locator('[data-type="form-js-block"] input').first().fill('hello world');
  // Allow microtasks to flush
  await page.waitForTimeout(100);
  const afterTx = await page.evaluate(() => (window as { __txCount?: number }).__txCount ?? 0);
  expect(afterTx - beforeTx).toBeLessThanOrEqual(1); // tolerate at most 1 spurious tx (selection)
});

test('5. multi-block isolation: input in block A does not appear in block B', async ({ page }) => {
  await page.getByTestId('insert-simple').click();
  await page.getByTestId('insert-simple').click();
  const blocks = page.locator('[data-type="form-js-block"]');
  await expect(blocks).toHaveCount(2);

  await blocks.nth(0).locator('input').first().fill('A-value');
  await blocks.nth(1).locator('input').first().fill('B-value');
  await expect(blocks.nth(0).locator('input').first()).toHaveValue('A-value');
  await expect(blocks.nth(1).locator('input').first()).toHaveValue('B-value');
});

test('6. a11y axe scan on tabs schema → no violations', async ({ page }) => {
  await page.getByTestId('insert-tabs').click();
  await page.locator('[data-type="form-js-block"] .fjs-tabs').waitFor({ state: 'visible' });
  const results = await new AxeBuilder({ page })
    .include('[data-type="form-js-block"]')
    .analyze();
  expect(results.violations).toEqual([]);
});
```

- [ ] **Step 3: Install Playwright browser if not yet installed**

```bash
npx playwright install chromium
```

Expected: chromium downloaded (skipped if already cached).

- [ ] **Step 4: Run e2e**

```bash
npm run test:e2e -w @form-js-designer/designer-tiptap
```

Expected: all 6 tests PASS. If test #6 fails on color-contrast violations, mark them as `disableRules: ['color-contrast']` (form-js base styles tracked as known issue) and re-run.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-tiptap/playwright.config.ts packages/designer-tiptap/e2e/
git commit -m "test(designer-tiptap): Playwright e2e with 6 v0.1 scenarios"
```

---

## Task 10: tsup build pipeline

**Files:**
- Create: `packages/designer-tiptap/tsup.config.ts`

- [ ] **Step 1: Create tsup.config.ts**

```ts
// packages/designer-tiptap/tsup.config.ts
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
    /^@form-js-designer\//, // bundle workspace packages into dist
  ],
  treeshake: true,
});
```

- [ ] **Step 2: Build**

```bash
npm run build -w @form-js-designer/designer-tiptap
```

Expected:
- `dist/viewer.js`, `dist/viewer.d.ts`, `dist/editor.js`, `dist/editor.d.ts`, `dist/designer-tiptap.css` exist
- No errors about missing externals
- Console prints `[copy-css] wrote …`

- [ ] **Step 3: Verify dist contents**

```bash
ls -la packages/designer-tiptap/dist/
node -e "console.log(Object.keys(require('./packages/designer-tiptap/dist/viewer.js')))" 2>&1 | head -5
```

Expected: viewer.js exports include `FormJsBlock`, `mountFormJs`, `VERSION`. (If `require` fails because dist is ESM, run via `node --input-type=module -e "import('./packages/designer-tiptap/dist/viewer.js').then(m=>console.log(Object.keys(m)))"`.)

- [ ] **Step 4: Verify dist size is reasonable**

```bash
du -sh packages/designer-tiptap/dist/
```

Expected: under 500 KB total. If significantly larger, check that `external` is taking effect by inspecting `dist/viewer.js` for embedded `@tiptap/core` source (should not be present).

- [ ] **Step 5: Commit**

```bash
git add packages/designer-tiptap/tsup.config.ts
git commit -m "feat(designer-tiptap): tsup build pipeline (viewer + editor entries)"
```

---

## Task 11: README + consumer guide + LICENSE placeholder

**Files:**
- Create: `packages/designer-tiptap/README.md`
- Create: `packages/designer-tiptap/CHANGELOG.md`

(LICENSE is intentionally not added in v0.1 — the package is private/UNLICENSED. v1.0 public release will add it.)

- [ ] **Step 1: Create README**

```md
<!-- packages/designer-tiptap/README.md -->
# @form-js-designer/designer-tiptap

Tiptap extension that renders form-js-designer schemas (incl. our Tabs/Card/Modal
components) as atomic blocks inside a Tiptap document.

## Status

v0.1 — viewer-only NodeView. Modal designer arrives in v0.2.

## Install (private — GitHub Packages)

Add to your project's `.npmrc`:

```
@form-js-designer:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${YOUR_GITHUB_PAT}
```

Then install:

```sh
npm i @form-js-designer/designer-tiptap \
      @bpmn-io/form-js-viewer \
      @tiptap/core @tiptap/pm preact
```

## Use — viewer-only (v0.1)

```ts
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FormJsBlock } from '@form-js-designer/designer-tiptap';
import '@form-js-designer/designer-tiptap/styles';

const editor = new Editor({
  element: document.querySelector('#editor')!,
  extensions: [StarterKit, FormJsBlock],
});

editor.commands.insertFormJsBlock(mySchema, 'optional-form-id');
```

## Roadmap

| Version | Scope |
|---|---|
| v0.1 | viewer-only NodeView, insertFormJsBlock command, GH Packages |
| v0.2 | `./editor` entry, modal designer, updateFormJsBlock |
| v0.3 (optional) | React wrapper, VS Code webview variant, Tiptap v3 |
| v1.0 (optional) | npm public, OSS license, Yjs collaboration guide |

## Yjs collaboration

The `schema` attribute is plain JSON, so document-level collaboration via
`@tiptap/extension-collaboration` works without any change to this package.

## License

UNLICENSED (private). See `docs/superpowers/specs/2026-04-26-designer-tiptap-design.md`.
```

- [ ] **Step 2: Create CHANGELOG**

```md
<!-- packages/designer-tiptap/CHANGELOG.md -->
# Changelog

## 0.1.0 — unreleased

- Initial release.
- Tiptap atom Node `formJsBlock` with vanilla NodeView.
- `insertFormJsBlock(schema, formId?)` and `updateFormJsBlock(schema)` commands.
- Mounts `@bpmn-io/form-js-viewer` with DesignerContainer/Components/LayoutHeight modules.
- Bundled CSS at `./styles`.
- Built and published via tsup to GitHub Packages.
```

- [ ] **Step 3: Commit**

```bash
git add packages/designer-tiptap/README.md packages/designer-tiptap/CHANGELOG.md
git commit -m "docs(designer-tiptap): README + CHANGELOG for v0.1"
```

---

## Task 12: Root release script + dry-run publish

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add release script to root package.json**

In `/Users/jji/project/form-js-designer/package.json`, add to `"scripts"`:

```jsonc
"release:tiptap": "npm run build -w @form-js-designer/designer-tiptap && npm publish -w @form-js-designer/designer-tiptap"
```

(Place after `release:rc`. Keep alphabetical ordering if the existing scripts follow one — check before placing.)

- [ ] **Step 2: Dry-run publish (no network change)**

```bash
npm publish --dry-run -w @form-js-designer/designer-tiptap
```

Expected: lists files included in the tarball. Verify:
- `dist/viewer.js`, `dist/viewer.d.ts`
- `dist/editor.js`, `dist/editor.d.ts`
- `dist/designer-tiptap.css`
- `README.md`, `CHANGELOG.md`, `package.json`
- **NOT** included: `src/`, `e2e/`, `examples/`, `__tests__/`, `tsconfig.json`

If `src/` shows up, double-check `.npmignore` and the `files` array in package.json.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(release): add release:tiptap workspace script"
```

---

## Task 13: Visible Playwright sanity (memory-mandated)

This is the human-gated check before tagging. Memory mandates: visible browser, plugin_playwright MCP, `pkill chromium` first.

- [ ] **Step 1: Kill any leftover chromium to free profile lock**

```bash
pkill -f chromium 2>/dev/null; true
```

- [ ] **Step 2: Run e2e in headed mode and observe**

```bash
npm run test:e2e:headed -w @form-js-designer/designer-tiptap
```

Watch all 6 scenarios run in a visible Chrome window. Confirm:
- Tabs strip is visually present (not just DOM)
- Card border/padding rendered
- Inputs accept text
- After "Insert Tabs" the second tab actually shows the card

Expected: all 6 PASS, no visual glitches.

- [ ] **Step 3: Save evidence**

```bash
cp -r packages/designer-tiptap/playwright-report/ packages/designer-tiptap/evidence/v0.1-$(date +%Y%m%d)/
```

- [ ] **Step 4: Tag release candidate**

```bash
git add packages/designer-tiptap/evidence/
git commit -m "chore(designer-tiptap): v0.1 visible sanity evidence"
git tag designer-tiptap-v0.1.0
```

(Push tag manually after final review: `git push origin designer-tiptap-v0.1.0`. Do **not** auto-push — tagging triggers downstream and should be a deliberate step.)

---

## Self-Review Notes

- **Spec coverage:** Every section of `2026-04-26-designer-tiptap-design.md` v0.1 scope mapped to a task — Section 2 → Tasks 1, 7, 10; Section 3 → Tasks 2-7; Section 4 → Tasks 10, 11, 12; Section 5 → Tasks 5 (units), 9 (e2e headless), 13 (visible). v0.2 explicitly out of scope (editor stub in Task 7).
- **No designer-* package modifications:** Confirmed — only `packages/designer-tiptap/` and root `package.json` (one script line) change.
- **TDD discipline:** Tasks 2, 3, 4 follow strict failing-test-first. Task 5 is shell logic that's only meaningfully testable via e2e (Task 9) — accepted compromise per spec Section 5.0.
- **Bundle isolation guard:** Task 10 Step 4 size check + dry-run in Task 12 catch any regression where `@tiptap/*` or `@bpmn-io/form-js-*` accidentally gets bundled.
- **Memory rules honored:** form-js-base.css included (Task 6), visible Playwright before tag (Task 13), pkill before browser launch (Task 13 Step 1), evidence saved (Task 13 Step 3).
