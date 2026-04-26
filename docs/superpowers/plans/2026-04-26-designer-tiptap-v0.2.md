# Designer × Tiptap (v0.2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `@form-js-designer/designer-tiptap` v0.1 viewer-only NodeView to a fully editable block via a single-instance fullscreen modal that re-uses `@form-js-designer/designer-editor-host`. Double-click → modal → auto-save on close → NodeView refresh.

**Architecture:** Two PRs.
- **PR#3** extracts a re-usable `mountEmbeddedEditorModal()` API in `designer-editor-host` (1 new file + 1-line BC change in `installPropsPanelFocusGuard`).
- **PR#4** builds the TipTap-side glue: `withDesigner(node)` HOC, single-instance `modalPortal`, real `./editor/index.ts` impl, fullscreen modal CSS, demo update, +6 unit + +3 e2e tests, visible Playwright evidence, and a tagged 0.2.0 release.

**Tech Stack:** TypeScript, Tiptap v2 (`@tiptap/core` + `@tiptap/pm`), `@bpmn-io/form-js-editor` 1.21.x via designer-editor-host, Preact 10.29.x, Vitest + happy-dom (units), Playwright (e2e), tsup (bundler), Vite (examples).

**Spec:** [`docs/superpowers/specs/2026-04-26-designer-tiptap-v0.2-design.md`](../specs/2026-04-26-designer-tiptap-v0.2-design.md)

---

## Spec Adaptation Notes

Two practical departures from the spec, preserved as written below:

1. **Function name** — the spec uses `usePropsPanelFocusGuard()` (React-hook style); the actual code in `packages/designer-editor-host/src/hooks/usePropsPanelFocusGuard.ts` is `installPropsPanelFocusGuard()` (plain function returning a cleanup `() => void`). Plan uses the **actual name**.

2. **Dependency strategy** — spec section 12 prescribes `peerDependencies` for `@form-js-designer/designer-editor-host`. But:
   - host is `private: true` in `package.json` and is not published to GitHub Packages
   - v0.1 already inlines all `@form-js-designer/*` packages via `noExternal: [/^@form-js-designer\//]` in `tsup.config.ts`
   - if peer were used, an external `npm install` would 404 on the private host
   
   Plan continues v0.1's inline strategy:
   - host is added to `dependencies` (workspace `*`), NOT `peerDependencies`
   - `noExternal` regex already covers it — host code is **inlined into `dist/editor.js` at build time**
   - the README compatibility matrix becomes informational ("`v0.2.x` bundles `editor-host vX.Y.Z` at build time")
   - flipping host to `private: false` for true peer is **deferred to v0.3**

---

## File Structure

PR#3 (designer-editor-host extraction):
```
packages/designer-editor-host/
├── package.json                                       Modify — add ./embedded export, bump 0.0.0 → 0.1.0
├── CHANGELOG.md                                       Modify — 0.1.0 entry
└── src/
    ├── embeddedDesigner.tsx                           Create — mountEmbeddedEditorModal()
    ├── hooks/usePropsPanelFocusGuard.ts               Modify (1-line BC) — scope param
    └── __tests__/
        ├── installPropsPanelFocusGuard.test.ts        Create — 4 cases
        └── embeddedDesigner.test.tsx                  Create — 5 cases
```

PR#4 (designer-tiptap v0.2):
```
packages/designer-tiptap/
├── package.json                                       Modify — version 0.2.0, add host workspace dep
├── CHANGELOG.md                                       Modify — 0.2.0 entry
├── README.md                                          Modify — Compatibility section
├── tsup.config.ts                                     Verify only — noExternal regex already covers host
├── evidence/
│   └── v0.2-YYYYMMDD/                                 Create — visible Playwright screenshots
├── src/
│   ├── editor/
│   │   ├── index.ts                                   Modify — re-export real withDesigner
│   │   ├── withDesigner.ts                            Create — TipTap NodeView HOC
│   │   ├── modalPortal.ts                             Create — single-instance state + lifecycle
│   │   └── modal.css                                  Create — fullscreen modal styles
│   └── __tests__/
│       └── withDesigner.test.ts                       Create — 6 cases
├── e2e/
│   └── v0.2-modal.spec.ts                             Create — 3 scenarios
└── examples/vanilla-host/
    └── main.ts                                        Modify — withDesigner(FormJsBlock) + modal CSS
```

No files outside the two packages are modified. Root `package.json` is untouched.

---

## PR#3 — Tasks 1–4 (designer-editor-host extraction)

## Task 1: Add `scope` parameter to `installPropsPanelFocusGuard` (BC)

**Files:**
- Create: `packages/designer-editor-host/src/__tests__/installPropsPanelFocusGuard.test.ts`
- Modify: `packages/designer-editor-host/src/hooks/usePropsPanelFocusGuard.ts:13`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/designer-editor-host/src/__tests__/installPropsPanelFocusGuard.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installPropsPanelFocusGuard } from '../hooks/usePropsPanelFocusGuard';

describe('installPropsPanelFocusGuard scope', () => {
  let canvas: HTMLElement;
  let propsPanel: HTMLElement;
  let propsInput: HTMLInputElement;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    canvas = document.createElement('div');
    canvas.classList.add('fjs-editor-selected');
    propsPanel = document.createElement('div');
    propsPanel.classList.add('props-panel');
    propsInput = document.createElement('input');
    propsPanel.appendChild(propsInput);
    document.body.append(canvas, propsPanel);
    propsInput.focus(); // activeElement = propsInput
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it('default scope (document) — patches all canvas focus calls', () => {
    cleanup = installPropsPanelFocusGuard();
    canvas.focus();
    // patch should suppress focus-steal: activeElement stays on propsInput
    expect(document.activeElement).toBe(propsInput);
  });

  it('scope=Element — does NOT patch focus calls outside scope', () => {
    const modalRoot = document.createElement('div');
    document.body.appendChild(modalRoot);
    cleanup = installPropsPanelFocusGuard(modalRoot);
    canvas.focus(); // outside modalRoot — patch should not suppress
    expect(document.activeElement).toBe(canvas);
  });

  it('scope=Element — DOES patch focus calls inside scope', () => {
    const modalRoot = document.createElement('div');
    const scopedCanvas = document.createElement('div');
    scopedCanvas.classList.add('fjs-editor-selected');
    const scopedPropsPanel = document.createElement('div');
    scopedPropsPanel.classList.add('props-panel');
    const scopedInput = document.createElement('input');
    scopedPropsPanel.appendChild(scopedInput);
    modalRoot.append(scopedCanvas, scopedPropsPanel);
    document.body.appendChild(modalRoot);
    scopedInput.focus();
    cleanup = installPropsPanelFocusGuard(modalRoot);
    scopedCanvas.focus(); // inside scope — patch should suppress
    expect(document.activeElement).toBe(scopedInput);
  });

  it('cleanup restores original prototype.focus', () => {
    const native = HTMLElement.prototype.focus;
    cleanup = installPropsPanelFocusGuard();
    expect(HTMLElement.prototype.focus).not.toBe(native);
    cleanup();
    cleanup = null;
    expect(HTMLElement.prototype.focus).toBe(native);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- installPropsPanelFocusGuard.test.ts`
Expected: 2 failing (scope param not yet supported), 2 passing (default-scope cases happen to pass against old impl).

- [ ] **Step 3: Implement scope param**

Replace the body of `packages/designer-editor-host/src/hooks/usePropsPanelFocusGuard.ts`:

```ts
/**
 * usePropsPanelFocusGuard
 *
 * form-js-editor는 선택된 canvas 필드에 `useEffect(() => ref.current.focus(), [selection, field])`
 * 를 설치한다. 이 때문에 사용자가 props-panel 안의 input/select 에 포커스를 두고 타이핑하는 중에도
 * 필드가 re-render 될 때마다 canvas 요소가 focus 를 훔쳐간다.
 *
 * 우회책: 전역 HTMLElement.prototype.focus 를 래핑하여, 대상이 .fjs-editor-selected 이고
 * 현재 활성 요소가 .props-panel 내부에 있을 때 focus 호출을 무시한다.
 *
 * @param scope (v0.2 추가) — 기본 document. Element를 넘기면 그 element 안의
 *              fjs-editor-selected 요소에만 패치를 적용한다. 외부 요소의 focus
 *              호출은 원본 동작 그대로. 사용처: 임베디드 디자이너 모달이 자기
 *              스코프 내부 패치만 활성화.
 */
export function installPropsPanelFocusGuard(
  scope: Element | Document = document,
): () => void {
  const orig = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (this: HTMLElement, ...args: unknown[]) {
    const inScope = scope === document || (scope as Element).contains(this);
    if (inScope && this.classList && this.classList.contains('fjs-editor-selected')) {
      const active = document.activeElement;
      if (active && (active as HTMLElement).closest?.('.props-panel')) {
        // props-panel input 에서 타이핑 중 — canvas 가 focus 를 훔치려는 시도 차단
        return;
      }
    }
    return orig.apply(this, args as []);
  } as typeof HTMLElement.prototype.focus;

  return () => {
    HTMLElement.prototype.focus = orig;
  };
}
```

- [ ] **Step 4: Run tests, verify PASS + regression check**

```bash
pnpm --filter @form-js-designer/designer-editor-host test:unit -- installPropsPanelFocusGuard.test.ts
pnpm --filter @form-js-designer/designer-editor-host typecheck
pnpm --filter @form-js-designer/designer-editor-host test:unit
```

Expected:
- `installPropsPanelFocusGuard.test.ts` — 4/4 PASS
- `typecheck` — 0 errors (App.tsx still works with default `document`)
- Full suite — no regressions

- [ ] **Step 5: Commit**

```bash
git add packages/designer-editor-host/src/hooks/usePropsPanelFocusGuard.ts \
        packages/designer-editor-host/src/__tests__/installPropsPanelFocusGuard.test.ts
git commit -m "feat(designer-editor-host): add scope param to installPropsPanelFocusGuard

BC: default value 'document' preserves existing App.tsx behavior.
Scope param enables modal-scoped focus guard for v0.2 designer-tiptap
embedded usage — modal patch only suppresses focus-steal inside the
modal subtree.
"
```

---

## Task 2: Create `embeddedDesigner.tsx` mount API

**Files:**
- Create: `packages/designer-editor-host/src/embeddedDesigner.tsx`
- Create: `packages/designer-editor-host/src/__tests__/embeddedDesigner.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// packages/designer-editor-host/src/__tests__/embeddedDesigner.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Stub form-js-editor BEFORE importing embeddedDesigner — happy-dom can't run
// the real form-js-editor (no SVG layout), so we verify only the modal shell
// + lifecycle. Real form-js integration is covered by e2e tests.
vi.mock('@bpmn-io/form-js-editor', () => ({
  FormEditor: class {
    importSchema = vi.fn().mockResolvedValue(undefined);
    saveSchema = vi.fn().mockResolvedValue({ schema: { type: 'default', components: [] } });
    destroy = vi.fn();
    get = vi.fn();
  },
}));

import { mountEmbeddedEditorModal } from '../embeddedDesigner';

describe('mountEmbeddedEditorModal', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('mount returns handle + appends wrapper to container', async () => {
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave: () => {},
    });
    expect(handle.destroy).toBeTypeOf('function');
    expect(handle.getSchema).toBeTypeOf('function');
    expect(container.querySelector('.fjd-embedded-designer-root')).toBeTruthy();
    handle.destroy();
  });

  it('destroy removes wrapper, restores prototype.focus, restores body overflow', async () => {
    const native = HTMLElement.prototype.focus;
    const prevOverflow = document.body.style.overflow;
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave: () => {},
    });
    expect(HTMLElement.prototype.focus).not.toBe(native);
    expect(document.body.style.overflow).toBe('hidden');
    handle.destroy();
    expect(container.querySelector('.fjd-embedded-designer-root')).toBeNull();
    expect(HTMLElement.prototype.focus).toBe(native);
    expect(document.body.style.overflow).toBe(prevOverflow);
  });

  it('getSchema returns initial schema before any edits', async () => {
    const initial = { type: 'default', components: [{ type: 'textfield', key: 'a' }] };
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: initial,
      onSave: () => {},
    });
    expect(handle.getSchema()).toEqual(initial);
    handle.destroy();
  });

  it('triggerClose path (Esc) — onSave called once with current schema, onClose fires once', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave,
      onClose,
    });
    const wrapper = container.querySelector('.fjd-embedded-designer-root') as HTMLElement;
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    // wait for async onSave + finishClose
    await Promise.resolve();
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('destroy path (external force-close) — onSave NOT called, onClose fires once', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave,
      onClose,
    });
    handle.destroy();
    await Promise.resolve();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run, verify FAIL (file doesn't exist)**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- embeddedDesigner.test.tsx`
Expected: import error (`Cannot find module '../embeddedDesigner'`).

- [ ] **Step 3: Implement embeddedDesigner.tsx**

```tsx
// packages/designer-editor-host/src/embeddedDesigner.tsx
import { h, render } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
// @ts-ignore — form-js-editor has no bundled type declarations
import { FormEditor } from '@bpmn-io/form-js-editor';
import { DesignerContainerModule } from '@form-js-designer/designer-core';
import { DesignerComponentsModule, migrateLegacyTabsSchema } from '@form-js-designer/designer-components';
import { LayoutHeightModule } from '@form-js-designer/designer-runtime';
import { PaletteModule } from './modules/PaletteModule';
import { OutlineModule } from './modules/OutlineModule';
import { MarqueeModule } from './modules/MarqueeModule';
import { ShortcutModule } from './modules/ShortcutModule';
import { PropsPanelModule } from './modules/PropsPanelModule';
import { LivePreviewModule } from './modules/LivePreviewModule';
import { ValidateModule } from './modules/ValidateModule';
import { ExportModule } from './modules/ExportModule';
import { installPropsPanelFocusGuard } from './hooks/usePropsPanelFocusGuard';

export type FormSchema = { type: string; components: unknown[]; [k: string]: unknown };

export interface MountEmbeddedEditorModalOptions {
  /** 모달 wrapper가 마운트될 부모. 기본 document.body */
  container?: HTMLElement;
  /** 디자이너 초기 스키마 */
  initialSchema: FormSchema;
  /** 자동저장 콜백. close 시 항상 호출. async OK. 실패(reject/throw) 시 모달 유지 */
  onSave: (schema: FormSchema) => void | Promise<void>;
  /** 모달 unmount 직후 호출. triggerClose / destroy 양쪽 경로 모두에서 fire (정확히 1회) */
  onClose?: () => void;
}

export interface EmbeddedEditorHandle {
  /** 외부 강제 종료 — onSave 호출 없이 즉시 cleanup. onClose는 fire */
  destroy(): void;
  /** 현재(미저장) schema 조회 */
  getSchema(): FormSchema;
}

interface FormEditorInstance {
  importSchema: (schema: FormSchema) => Promise<void>;
  saveSchema: () => Promise<{ schema: FormSchema }>;
  destroy: () => void;
}

const ROOT_CLASS = 'fjd-embedded-designer-root';
const HEADER_CLASS = 'fjd-embedded-designer-header';
const CONTENT_CLASS = 'fjd-embedded-designer-content';
const CLOSE_BTN_CLASS = 'fjd-embedded-designer-close';
const CANVAS_CLASS = 'fjd-embedded-designer-canvas';

/**
 * Imperative mount of the form-js editor inside a fullscreen modal shell.
 *
 * The modal shell is a vanilla DOM wrapper (header + content); the designer
 * canvas is a Preact <App /> mounted inside the content area. ESC and the
 * [닫기] button both funnel into triggerClose, which awaits onSave then
 * cleans up. handle.destroy() is for external force-close (e.g. tiptap
 * editor.destroy()) and skips onSave but still fires onClose.
 */
export async function mountEmbeddedEditorModal(
  opts: MountEmbeddedEditorModalOptions,
): Promise<EmbeddedEditorHandle> {
  const { container = document.body, initialSchema, onSave, onClose } = opts;

  // 1. Build modal shell
  const wrapper = document.createElement('div');
  wrapper.className = ROOT_CLASS;
  wrapper.tabIndex = -1;
  const header = document.createElement('div');
  header.className = HEADER_CLASS;
  const title = document.createElement('h2');
  title.textContent = 'Form Designer';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = CLOSE_BTN_CLASS;
  closeBtn.textContent = '닫기';
  header.append(title, closeBtn);
  const content = document.createElement('div');
  content.className = CONTENT_CLASS;
  wrapper.append(header, content);
  container.appendChild(wrapper);

  // 2. Lock body scroll
  const prevBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  // 3. Mount Preact app + form-js editor
  let editorInstance: FormEditorInstance | null = null;
  let currentSchema: FormSchema = initialSchema;
  let closing = false;

  const App = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      const additionalModules: unknown[] = [
        DesignerContainerModule,
        DesignerComponentsModule,
        PaletteModule,
        OutlineModule,
        MarqueeModule,
        ShortcutModule,
        PropsPanelModule,
        LivePreviewModule,
        ValidateModule,
        ExportModule,
        LayoutHeightModule,
      ];
      const offscreenPropsParent = document.createElement('div');
      try {
        const editor = new FormEditor({
          container: el,
          additionalModules,
          propertiesPanel: { parent: offscreenPropsParent },
        } as ConstructorParameters<typeof FormEditor>[0]) as unknown as FormEditorInstance;
        editorInstance = editor;
        editor.importSchema(migrateLegacyTabsSchema(initialSchema)).catch((err: Error) => {
          console.error('[embedded-designer] importSchema failed:', err);
        });
      } catch (err) {
        console.error('[embedded-designer] FormEditor construction failed:', err);
      }
      return () => {
        try { editorInstance?.destroy(); } catch { /* ignore */ }
        editorInstance = null;
      };
    }, []);
    return h('div', { class: CANVAS_CLASS, ref: editorRef });
  };

  render(h(App, {}), content);

  // 4. Install focus guard scoped to this modal
  const uninstallFocusGuard = installPropsPanelFocusGuard(wrapper);

  // 5. Schema accessor — returns last-known schema (sync)
  //    triggerClose path awaits saveSchema before onSave for accurate snapshot
  const getSchema = (): FormSchema => currentSchema;

  // 6. finishClose — common cleanup, called by both triggerClose and destroy
  const finishClose = () => {
    if (closing) return;
    closing = true;
    render(null, content); // unmount Preact (also runs editor cleanup)
    wrapper.removeEventListener('keydown', keyHandler, true);
    closeBtn.removeEventListener('click', closeBtnHandler);
    uninstallFocusGuard();
    wrapper.remove();
    document.body.style.overflow = prevBodyOverflow;
    onClose?.();
  };

  // 7. triggerClose — auto-save then cleanup
  const triggerClose = async () => {
    if (closing) return;
    try {
      let schemaToSave: FormSchema = currentSchema;
      if (editorInstance && typeof editorInstance.saveSchema === 'function') {
        const saved = await editorInstance.saveSchema();
        schemaToSave = saved?.schema ?? currentSchema;
        currentSchema = schemaToSave;
      }
      await onSave(schemaToSave);
    } catch (err) {
      console.error('[embedded-designer] onSave failed:', err);
      return; // keep modal open
    }
    finishClose();
  };

  // 8. Listeners
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      void triggerClose();
    }
  };
  const closeBtnHandler = () => {
    void triggerClose();
  };
  wrapper.addEventListener('keydown', keyHandler, true);
  closeBtn.addEventListener('click', closeBtnHandler);

  // 9. Focus the wrapper so ESC works immediately
  wrapper.focus();

  return {
    destroy() {
      finishClose();
    },
    getSchema,
  };
}
```

- [ ] **Step 4: Run tests, verify PASS**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- embeddedDesigner.test.tsx`
Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/designer-editor-host/src/embeddedDesigner.tsx \
        packages/designer-editor-host/src/__tests__/embeddedDesigner.test.tsx
git commit -m "feat(designer-editor-host): add embeddedDesigner.tsx with mountEmbeddedEditorModal API

Imperative entry for hosting the form-js designer inside a modal.
Handles modal shell, focus guard scoping, ESC/close button, auto-save-
on-close lifecycle, and external force-close via handle.destroy().
Used by designer-tiptap v0.2.
"
```

---

## Task 3: Add `./embedded` exports + bump host to 0.1.0

**Files:**
- Modify: `packages/designer-editor-host/package.json`
- Modify: `packages/designer-editor-host/CHANGELOG.md`

- [ ] **Step 1: Update package.json — add exports, bump version**

Edit `packages/designer-editor-host/package.json`:

```jsonc
{
  "name": "@form-js-designer/designer-editor-host",
  "version": "0.1.0",
  "private": true,
  "description": "form-js editor host app with Palette + Outline modules",
  "type": "module",
  "exports": {
    "./embedded": "./src/embeddedDesigner.tsx"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test --config playwright.config.ts",
    "test:a11y": "playwright test --config playwright.config.ts --project=chromium e2e/editor.a11y.spec.ts"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.10.0",
    "@bpmn-io/form-js-editor": "^1.21.2",
    "@form-js-designer/designer-components": "*",
    "@form-js-designer/designer-core": "*",
    "@form-js-designer/designer-runtime": "*",
    "@playwright/test": "^1.47.2",
    "@preact/preset-vite": "^2.9.1",
    "@testing-library/preact": "^3.2.4",
    "@types/node": "^20.16.10",
    "happy-dom": "^15.7.4",
    "preact": "^10.19.3",
    "typescript": "^5.6.0",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
```

Diff vs current: add top-level `"version": "0.1.0"`, add `"exports"` block. Keep `"private": true`.

- [ ] **Step 2: Update CHANGELOG**

Replace `packages/designer-editor-host/CHANGELOG.md` content (or append) with:

```markdown
# Changelog

## 0.1.0 — 2026-04-XX

### Added
- `./embedded` entry point exposing `mountEmbeddedEditorModal()` for hosting
  the form-js designer in a modal context (used by designer-tiptap v0.2).
- `installPropsPanelFocusGuard` accepts an optional `scope` parameter
  (default `document`) for restricting the prototype focus patch to a
  subtree (BC — existing call sites continue to work unchanged).

### Required by
- `@form-js-designer/designer-tiptap` >=0.2.0 (consumes the inlined
  `./embedded` entry via tsup `noExternal` at build time)

## 0.0.0 — initial

- Internal monorepo demo app for the form-js editor host (private).
```

(Replace `2026-04-XX` with the actual release date when PR#3 merges.)

- [ ] **Step 3: Verify package resolves**

```bash
pnpm --filter @form-js-designer/designer-editor-host typecheck
pnpm install  # refresh workspace symlinks if needed
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add packages/designer-editor-host/package.json packages/designer-editor-host/CHANGELOG.md
git commit -m "chore(designer-editor-host): release 0.1.0 — ./embedded export + focus guard scope BC"
```

---

## Task 4: Open PR#3 (host extraction)

- [ ] **Step 1: Run all host tests + build**

```bash
pnpm --filter @form-js-designer/designer-editor-host test:unit
pnpm --filter @form-js-designer/designer-editor-host typecheck
pnpm --filter @form-js-designer/designer-editor-host build
```

Expected: all PASS, build succeeds.

- [ ] **Step 2: Push branch + open PR**

```bash
git push -u origin HEAD
gh pr create --base main --title "feat(designer-editor-host): release 0.1.0 — ./embedded export" --body "$(cat <<'EOF'
## Summary
- Extract reusable `mountEmbeddedEditorModal()` API for hosting the form-js
  designer in a modal (consumed by designer-tiptap v0.2).
- BC change: `installPropsPanelFocusGuard` accepts optional `scope` parameter
  (default `document` preserves existing App.tsx behavior).
- Bump host package to 0.1.0.

## Test plan
- [x] Unit: `installPropsPanelFocusGuard.test.ts` — 4 cases (default scope / scoped patch / cleanup)
- [x] Unit: `embeddedDesigner.test.tsx` — 5 cases (mount / destroy / triggerClose / onClose paths)
- [x] Existing host suite passes (no regressions in App.tsx)
- [x] `pnpm build` succeeds

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for CI green + merge**

After PR merges, capture host version (`0.1.0`) for use in PR#4 README compat matrix and CHANGELOG entry.

---

## PR#4 — Tasks 5–14 (designer-tiptap v0.2)

(Begin from a fresh branch off `main` post-PR#3 merge.)

## Task 5: Bump designer-tiptap to 0.2.0 + add host workspace dep

**Files:**
- Modify: `packages/designer-tiptap/package.json`

- [ ] **Step 1: Update package.json**

Edit `packages/designer-tiptap/package.json` — change `"version"` and append `@form-js-designer/designer-editor-host` to `dependencies`:

```jsonc
{
  "name": "@form-js-designer/designer-tiptap",
  "version": "0.2.0",
  // ...
  "dependencies": {
    "@form-js-designer/designer-core": "*",
    "@form-js-designer/designer-components": "*",
    "@form-js-designer/designer-runtime": "*",
    "@form-js-designer/designer-editor-host": "*"
  },
  // ... peerDependencies and rest unchanged
}
```

(Note: `peerDependencies` for host is **NOT** added per Spec Adaptation Note #2.)

- [ ] **Step 2: Verify workspace resolution**

```bash
pnpm install
pnpm --filter @form-js-designer/designer-tiptap typecheck
```

Expected: workspace symlink for `designer-editor-host` exists at `packages/designer-tiptap/node_modules/@form-js-designer/designer-editor-host` and points to the host package.

- [ ] **Step 3: Commit**

```bash
git add packages/designer-tiptap/package.json pnpm-lock.yaml
git commit -m "chore(designer-tiptap): bump to 0.2.0 + add designer-editor-host workspace dep

Host is bundled at build time via tsup noExternal — see plan section
'Spec Adaptation Notes' for rationale (host is private, peer would 404).
"
```

---

## Task 6: Create `modal.css` (fullscreen modal styles)

**Files:**
- Create: `packages/designer-tiptap/src/editor/modal.css`

- [ ] **Step 1: Write CSS**

```css
/* packages/designer-tiptap/src/editor/modal.css
 *
 * Fullscreen modal shell for the embedded form-js designer.
 * Wrapper element: .fjd-embedded-designer-root (created by host's
 * mountEmbeddedEditorModal). Header, content, close-btn classes match
 * what host emits.
 */

.fjd-embedded-designer-root {
  position: fixed;
  inset: 0;
  z-index: 2147483000;            /* TipTap floating menus typically <= 1000 */
  background: var(--fjd-modal-bg, #fff);
  display: flex;
  flex-direction: column;
  isolation: isolate;             /* establish stacking context */
}

.fjd-embedded-designer-header {
  flex: 0 0 auto;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--fjd-modal-border, #e5e7eb);
  background: var(--fjd-modal-header-bg, #fafafa);
}
.fjd-embedded-designer-header h2 {
  font-size: 14px;
  margin: 0;
  font-weight: 600;
  color: var(--fjd-modal-title-color, #111);
}

.fjd-embedded-designer-close {
  background: var(--fjd-modal-primary-bg, #111);
  color: var(--fjd-modal-primary-fg, #fff);
  border: 0;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}
.fjd-embedded-designer-close:hover {
  background: var(--fjd-modal-primary-bg-hover, #333);
}

.fjd-embedded-designer-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;               /* host designer handles its own scroll */
  position: relative;
}

/* host's app.css uses height: 100vh; the modal provides its own height
 * via flex layout, so override the descendants to fill the content area. */
.fjd-embedded-designer-content > .fjd-embedded-designer-canvas,
.fjd-embedded-designer-content .app-layout {
  height: 100% !important;
}
```

- [ ] **Step 2: Wire CSS into the editor entry build**

Update `packages/designer-tiptap/scripts/copy-css.mjs` (if it aggregates source CSS) OR add an explicit import in `src/editor/index.ts` (Task 8) — depends on existing v0.1 pattern. Verify by inspecting:

```bash
cat packages/designer-tiptap/scripts/copy-css.mjs
```

If the script picks up `src/styles/entry.css` only, add a line to include `src/editor/modal.css` into the editor bundle output. Document the chosen approach in the commit message.

- [ ] **Step 3: Commit**

```bash
git add packages/designer-tiptap/src/editor/modal.css packages/designer-tiptap/scripts/copy-css.mjs
git commit -m "feat(designer-tiptap): add modal.css for v0.2 fullscreen embedded designer"
```

---

## Task 7: Create `modalPortal.ts` (single-instance state)

**Files:**
- Create: `packages/designer-tiptap/src/editor/modalPortal.ts`

- [ ] **Step 1: Implement modalPortal**

```ts
// packages/designer-tiptap/src/editor/modalPortal.ts
//
// Single-instance enforcement for the embedded designer modal.
// withDesigner.onDoubleClick checks `getActiveModal()` before mounting;
// if non-null, focuses the existing modal root instead of opening a second.
//
// The modal handle and root element are tracked at module scope (singleton).
// This is intentional — the spec selected single-instance to avoid focus
// guard prototype-patch conflicts (see spec section 11.4 / 15).

import type { EmbeddedEditorHandle } from '@form-js-designer/designer-editor-host/embedded';

let activeModal: EmbeddedEditorHandle | null = null;
let activeModalRootEl: HTMLElement | null = null;

export function getActiveModal(): EmbeddedEditorHandle | null {
  return activeModal;
}

export function getActiveModalRoot(): HTMLElement | null {
  return activeModalRootEl;
}

export function setActiveModal(handle: EmbeddedEditorHandle, rootEl: HTMLElement): void {
  if (activeModal !== null) {
    throw new Error(
      '[designer-tiptap] setActiveModal called while another modal is active. ' +
      'Single-instance constraint violated.',
    );
  }
  activeModal = handle;
  activeModalRootEl = rootEl;
}

export function clearActiveModal(): void {
  activeModal = null;
  activeModalRootEl = null;
}

/**
 * Attempt to focus the existing modal (used when user double-clicks a second
 * form block while a modal is already open). Returns true if a modal was
 * focused, false if no modal is active.
 */
export function focusActiveModal(): boolean {
  if (activeModalRootEl) {
    activeModalRootEl.focus();
    return true;
  }
  return false;
}
```

- [ ] **Step 2: Sanity typecheck**

```bash
pnpm --filter @form-js-designer/designer-tiptap typecheck
```

Expected: 0 errors. (No runtime tests for modalPortal directly — it's exercised by withDesigner.test.ts in Task 9.)

- [ ] **Step 3: Commit**

```bash
git add packages/designer-tiptap/src/editor/modalPortal.ts
git commit -m "feat(designer-tiptap): add modalPortal — single-instance enforcement for embedded designer"
```

---

## Task 8: Update `editor/index.ts` to re-export real `withDesigner`

**Files:**
- Modify: `packages/designer-tiptap/src/editor/index.ts`

- [ ] **Step 1: Replace placeholder export**

Current content of `packages/designer-tiptap/src/editor/index.ts`:

```ts
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

Replace with:

```ts
// packages/designer-tiptap/src/editor/index.ts
//
// v0.2 editor entry — provides withDesigner(FormJsBlock) HOC that adds
// double-click → embedded designer modal behavior to the FormJsBlock node.

import './modal.css';

export { FormJsBlock } from '../node';
export { withDesigner } from './withDesigner';
export type { FormJsBlockAttrs } from '../node';
```

- [ ] **Step 2: Commit (after Task 9 lands withDesigner.ts — defer commit)**

Hold this commit until Task 9 completes. Run typecheck for now to confirm import path resolves once withDesigner.ts exists:

```bash
pnpm --filter @form-js-designer/designer-tiptap typecheck
# Expected: error — Cannot find './withDesigner' until Task 9
```

(Hold staging until Task 9 lands.)

---

## Task 9: Create `withDesigner.ts` HOC + unit tests

**Files:**
- Create: `packages/designer-tiptap/src/editor/withDesigner.ts`
- Create: `packages/designer-tiptap/src/__tests__/withDesigner.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/designer-tiptap/src/__tests__/withDesigner.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mountSpy = vi.fn();
vi.mock('@form-js-designer/designer-editor-host/embedded', () => ({
  mountEmbeddedEditorModal: (...args: unknown[]) => {
    mountSpy(...args);
    return Promise.resolve({
      destroy: vi.fn(),
      getSchema: () => ({ type: 'default', components: [] }),
    });
  },
}));

import { FormJsBlock } from '../node';
import { withDesigner } from '../editor/withDesigner';
import { clearActiveModal, setActiveModal } from '../editor/modalPortal';

describe('withDesigner', () => {
  beforeEach(() => {
    mountSpy.mockClear();
    clearActiveModal();
  });

  afterEach(() => {
    clearActiveModal();
  });

  it('returns a node that retains FormJsBlock metadata (name preserved)', () => {
    const wrapped = withDesigner(FormJsBlock);
    expect(wrapped.name).toBe(FormJsBlock.name);
  });

  it('double-click on NodeView dom triggers mountEmbeddedEditorModal once', async () => {
    const wrapped = withDesigner(FormJsBlock);
    const { dom, fakeContext } = simulateNodeView(wrapped);
    dom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(mountSpy.mock.calls[0][0]).toMatchObject({
      initialSchema: fakeContext.node.attrs.schema,
    });
  });

  it('second double-click while modal is active does NOT remount', async () => {
    setActiveModal(
      { destroy: vi.fn(), getSchema: () => ({ type: 'default', components: [] }) },
      document.createElement('div'),
    );
    const wrapped = withDesigner(FormJsBlock);
    const { dom } = simulateNodeView(wrapped);
    dom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    expect(mountSpy).not.toHaveBeenCalled();
  });

  it('onSave callback updates node attrs via editor.commands chain', async () => {
    const wrapped = withDesigner(FormJsBlock);
    const { dom, fakeContext } = simulateNodeView(wrapped);
    dom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    const onSave = mountSpy.mock.calls[0][0].onSave;
    const newSchema = { type: 'default', components: [{ type: 'textfield', key: 'a' }] };
    onSave(newSchema);
    expect(fakeContext.editor.chain().setNodeSelection).toHaveBeenCalledWith(0);
    expect(fakeContext.editor.chain().updateAttributes).toHaveBeenCalledWith(
      'formJsBlock',
      { schema: newSchema },
    );
    expect(fakeContext.editor.chain().run).toHaveBeenCalled();
  });

  it('getPos() returning null causes onSave to noop without throwing', async () => {
    const wrapped = withDesigner(FormJsBlock);
    const { dom, fakeContext } = simulateNodeView(wrapped, { getPosReturn: null });
    dom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    const onSave = mountSpy.mock.calls[0][0].onSave;
    expect(() => onSave({ type: 'default', components: [] })).not.toThrow();
    expect(fakeContext.editor.chain().run).not.toHaveBeenCalled();
  });

  it('NodeView destroy hook calls activeModal.destroy if present', async () => {
    const destroySpy = vi.fn();
    setActiveModal(
      { destroy: destroySpy, getSchema: () => ({ type: 'default', components: [] }) },
      document.createElement('div'),
    );
    const wrapped = withDesigner(FormJsBlock);
    const { destroyHook } = simulateNodeView(wrapped);
    destroyHook();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});

// ----- Test helpers -----
function simulateNodeView(
  nodeExtension: typeof FormJsBlock,
  opts: { getPosReturn?: number | null } = {},
) {
  const dom = document.createElement('div');
  dom.classList.add('form-js-block');
  document.body.appendChild(dom);

  const chainObj = {
    setNodeSelection: vi.fn().mockReturnThis(),
    updateAttributes: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnValue(true),
  };
  const fakeContext = {
    node: {
      attrs: { schema: { type: 'default', components: [] }, formId: 'test' },
      type: { name: 'formJsBlock' },
    },
    getPos: () => (opts.getPosReturn === undefined ? 0 : opts.getPosReturn),
    editor: { chain: () => chainObj },
  };

  // Pull addNodeView from the node extension config and invoke it
  const config = (nodeExtension as unknown as { config: { addNodeView: () => unknown } }).config;
  const addNodeViewFn = (config as { addNodeView?: () => () => unknown }).addNodeView;
  if (!addNodeViewFn) throw new Error('addNodeView not configured on extended node');
  const factory = addNodeViewFn();
  const view = (factory as (ctx: typeof fakeContext) => { dom: HTMLElement; destroy?: () => void })(fakeContext);
  // Replace returned dom with our prepared dom so dispatchEvent works in tests
  // (the real factory creates its own dom; we need the listener attached to ours.
  //  In practice the factory should attach to the dom it returns.)
  return {
    dom: view.dom,
    destroyHook: view.destroy ?? (() => {}),
    fakeContext,
  };
}
```

- [ ] **Step 2: Run, verify FAIL (file doesn't exist)**

Run: `pnpm --filter @form-js-designer/designer-tiptap test:unit -- withDesigner.test.ts`
Expected: import error.

- [ ] **Step 3: Implement withDesigner.ts**

```ts
// packages/designer-tiptap/src/editor/withDesigner.ts
//
// HOC that wraps the v0.1 FormJsBlock node with a double-click handler that
// opens the embedded designer modal. The wrapped node returns a NodeView
// which (a) renders the v0.1 viewer DOM, and (b) installs a dblclick
// listener that mounts mountEmbeddedEditorModal — single-instance gated.

import { mountEmbeddedEditorModal } from '@form-js-designer/designer-editor-host/embedded';
import type { EmbeddedEditorHandle, FormSchema } from '@form-js-designer/designer-editor-host/embedded';
import { FormJsBlock } from '../node';
import { mountFormJs } from '../mount/mountFormJs';
import {
  getActiveModal,
  setActiveModal,
  clearActiveModal,
  focusActiveModal,
} from './modalPortal';

interface NodeViewContext {
  node: { attrs: { schema: FormSchema; formId?: string }; type: { name: string } };
  getPos: () => number | null;
  editor: {
    chain: () => {
      setNodeSelection: (pos: number) => unknown;
      updateAttributes: (typeName: string, attrs: Record<string, unknown>) => unknown;
      run: () => boolean;
    };
  };
}

export function withDesigner(node: typeof FormJsBlock): typeof FormJsBlock {
  return node.extend({
    addNodeView() {
      return ((ctx: NodeViewContext) => {
        const { node: pmNode, getPos, editor } = ctx;
        const dom = document.createElement('div');
        dom.classList.add('form-js-block');
        dom.dataset.formId = pmNode.attrs.formId ?? '';
        dom.contentEditable = 'false';

        // Mount v0.1 viewer (read-only) — re-uses existing mount path
        let viewerHandle: { destroy: () => void } | null = null;
        try {
          viewerHandle = mountFormJs({
            container: dom,
            schema: pmNode.attrs.schema,
          });
        } catch (err) {
          console.error('[designer-tiptap] viewer mount failed:', err);
        }

        const onDblClick = async (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (getActiveModal() !== null) {
            focusActiveModal();
            return;
          }
          let handle: EmbeddedEditorHandle | null = null;
          try {
            handle = await mountEmbeddedEditorModal({
              initialSchema: pmNode.attrs.schema,
              onSave: (newSchema: FormSchema) => {
                const pos = getPos();
                if (pos == null) {
                  console.warn('[designer-tiptap] getPos() returned null, skipping update');
                  return;
                }
                editor
                  .chain()
                  .setNodeSelection(pos)
                  .updateAttributes(pmNode.type.name, { schema: newSchema })
                  .run();
              },
              onClose: () => {
                clearActiveModal();
              },
            });
            const rootEl = document.querySelector<HTMLElement>('.fjd-embedded-designer-root');
            if (handle && rootEl) {
              setActiveModal(handle, rootEl);
            }
          } catch (err) {
            console.error('[designer-tiptap] mountEmbeddedEditorModal failed:', err);
            // activeModal stays null — user can retry
          }
        };
        dom.addEventListener('dblclick', onDblClick);

        return {
          dom,
          destroy() {
            dom.removeEventListener('dblclick', onDblClick);
            try { viewerHandle?.destroy(); } catch { /* ignore */ }
            const active = getActiveModal();
            if (active) {
              try { active.destroy(); } catch { /* ignore */ }
            }
          },
        };
      }) as unknown as Parameters<typeof node.extend>[0]['addNodeView'];
    },
  });
}
```

- [ ] **Step 4: Run tests, verify PASS**

Run: `pnpm --filter @form-js-designer/designer-tiptap test:unit -- withDesigner.test.ts`
Expected: 6/6 PASS.

If tests fail because the test helper's `simulateNodeView` doesn't match the actual `addNodeView` factory signature, adjust the helper to call the factory the same way TipTap does (passing `{node, getPos, editor, ...}`). The shape above matches `@tiptap/core` v2.6 NodeView contract.

- [ ] **Step 5: Commit (now staging Task 8 too)**

```bash
git add packages/designer-tiptap/src/editor/index.ts \
        packages/designer-tiptap/src/editor/withDesigner.ts \
        packages/designer-tiptap/src/__tests__/withDesigner.test.ts
git commit -m "feat(designer-tiptap): add withDesigner HOC with embedded designer modal

Double-click on a FormJsBlock NodeView opens the designer in a fullscreen
modal (single-instance, auto-save on close). Resolves the v0.1 './editor'
placeholder.

Closes spec items 4.3, 5, 8, 9.
"
```

---

## Task 10: Update `examples/vanilla-host` to demo v0.2

**Files:**
- Modify: `packages/designer-tiptap/examples/vanilla-host/main.ts`

- [ ] **Step 1: Wrap FormJsBlock with withDesigner**

Edit `packages/designer-tiptap/examples/vanilla-host/main.ts`:

Change the import:

```ts
// before
import { FormJsBlock } from '@form-js-designer/designer-tiptap';
import '@form-js-designer/designer-tiptap/styles';

// after
import { FormJsBlock as RawFormJsBlock } from '@form-js-designer/designer-tiptap';
import { withDesigner } from '@form-js-designer/designer-tiptap/editor';
import '@form-js-designer/designer-tiptap/styles';

const FormJsBlock = withDesigner(RawFormJsBlock);
```

(`@form-js-designer/designer-tiptap/editor` resolves to `./src/editor/index.ts` per package.json `exports`.)

The rest of the file is unchanged — the existing toolbar code, seed schemas, transaction count, etc. all keep working since `withDesigner` returns the same node spec, just with an enhanced NodeView.

- [ ] **Step 2: Smoke run**

```bash
pnpm --filter @form-js-designer/designer-tiptap dev
```

Visit `http://localhost:5173`, click "+ Tabs form" to insert a block, then **double-click the inserted block**. The fullscreen modal should appear with header "Form Designer" and a [닫기] button. ESC or [닫기] should close the modal and update the block's content.

- [ ] **Step 3: Commit**

```bash
git add packages/designer-tiptap/examples/vanilla-host/main.ts
git commit -m "feat(designer-tiptap): vanilla-host demo uses withDesigner for v0.2 modal flow"
```

---

## Task 11: E2E tests +3 (modal scenarios)

**Files:**
- Create: `packages/designer-tiptap/e2e/v0.2-modal.spec.ts`

- [ ] **Step 1: Write e2e tests**

```ts
// packages/designer-tiptap/e2e/v0.2-modal.spec.ts
import { test, expect } from '@playwright/test';

test.describe('v0.2 — embedded designer modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#editor', { state: 'visible' });
  });

  test('1. double-click form block opens modal with header + close button', async ({ page }) => {
    await page.getByRole('button', { name: /Tabs form/i }).click();
    const block = page.locator('.form-js-block').first();
    await expect(block).toBeVisible();
    await block.dblclick();
    const modal = page.locator('.fjd-embedded-designer-root');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('Form Designer');
    await expect(modal.locator('.fjd-embedded-designer-close')).toBeVisible();
  });

  test('2. modal close updates the underlying NodeView (auto-save)', async ({ page }) => {
    await page.getByRole('button', { name: /Tabs form/i }).click();
    const block = page.locator('.form-js-block').first();
    await block.dblclick();
    const modal = page.locator('.fjd-embedded-designer-root');
    await expect(modal).toBeVisible();
    // wait for designer to be interactive
    await page.waitForSelector('.fjd-editor-container', { timeout: 5000 });
    // close via [닫기]
    await modal.locator('.fjd-embedded-designer-close').click();
    await expect(modal).toBeHidden();
    // block remains in document
    await expect(block).toBeVisible();
  });

  test('3. ESC closes modal, second double-click reopens', async ({ page }) => {
    await page.getByRole('button', { name: /Tabs form/i }).click();
    const block = page.locator('.form-js-block').first();
    await block.dblclick();
    const modal = page.locator('.fjd-embedded-designer-root');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    // re-open
    await block.dblclick();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
```

- [ ] **Step 2: Run e2e, verify PASS**

Pre-flight: kill any orphaned chromium profiles (memory rule):
```bash
pkill -f chromium 2>/dev/null || true
```

Run:
```bash
pnpm --filter @form-js-designer/designer-tiptap test:e2e -- v0.2-modal.spec.ts
```
Expected: 3/3 PASS.

If a test times out waiting for `.fjd-editor-container` (form-js editor canvas), inspect with the headed runner:
```bash
pnpm --filter @form-js-designer/designer-tiptap test:e2e:headed -- v0.2-modal.spec.ts
```

- [ ] **Step 3: Verify v0.1 e2e still PASS (regression gate)**

```bash
pnpm --filter @form-js-designer/designer-tiptap test:e2e -- tiptap-host.spec.ts
```
Expected: 6/6 PASS (no regressions).

- [ ] **Step 4: Commit**

```bash
git add packages/designer-tiptap/e2e/v0.2-modal.spec.ts
git commit -m "test(designer-tiptap): add 3 e2e scenarios for v0.2 embedded designer modal"
```

---

## Task 12: README compatibility section + CHANGELOG entry

**Files:**
- Modify: `packages/designer-tiptap/README.md`
- Modify: `packages/designer-tiptap/CHANGELOG.md`

- [ ] **Step 1: Add Compatibility section to README**

Append to `packages/designer-tiptap/README.md` (or insert after the Installation section):

```markdown
## Compatibility

| `@form-js-designer/designer-tiptap` | bundled `@form-js-designer/designer-editor-host` |
|--------------------------------------|---------------------------------------------------|
| `0.1.x`                              | (independent — viewer-only, no host needed)      |
| `0.2.x`                              | `0.1.x` (bundled at build time via tsup `noExternal`) |

> Note: `designer-editor-host` is currently a private workspace package
> (`"private": true`). Its source is **inlined into the published
> designer-tiptap dist** at build time — there is no runtime peer
> dependency. If you fork the project and want the host as a true peer,
> flip its `package.json` to `"private": false` and adjust the tsup
> `external` list.

## Editor entry usage

```ts
import { FormJsBlock as RawFormJsBlock } from '@form-js-designer/designer-tiptap';
import { withDesigner } from '@form-js-designer/designer-tiptap/editor';
import '@form-js-designer/designer-tiptap/styles';

const FormJsBlock = withDesigner(RawFormJsBlock);
// use FormJsBlock in your tiptap extensions array — double-click any
// inserted block to open the designer modal.
```
```

- [ ] **Step 2: Update CHANGELOG**

Replace the `## 0.1.0 — unreleased` line in `packages/designer-tiptap/CHANGELOG.md` with `## 0.1.0 — 2026-04-XX` (use the actual v0.1 release date, recorded in git tag `designer-tiptap-v0.1.0`).

Then prepend the v0.2.0 section:

```markdown
# Changelog

## 0.2.0 — 2026-04-XX

### Added
- `./editor` entry: `withDesigner(node)` HOC adds double-click → fullscreen
  embedded designer modal to FormJsBlock NodeView.
- Single-instance modal portal with auto-save on close (ESC / [닫기] button).
- `dist/editor/modal.css` — fullscreen modal styling, configurable via
  CSS variable hooks (`--fjd-modal-bg`, `--fjd-modal-primary-bg`, etc.).

### Bundles
- `@form-js-designer/designer-editor-host` `0.1.0` — inlined at build time
  via tsup `noExternal` (no runtime peer dependency required).

### Required by
- (none — terminal package)

## 0.1.0 — 2026-04-XX
- (existing v0.1 entry preserved)
```

- [ ] **Step 3: Commit**

```bash
git add packages/designer-tiptap/README.md packages/designer-tiptap/CHANGELOG.md
git commit -m "docs(designer-tiptap): README Compatibility section + CHANGELOG 0.2.0"
```

---

## Task 13: Visible Playwright evidence (memory rule)

**Files:**
- Create: `packages/designer-tiptap/evidence/v0.2-YYYYMMDD/` (replace `YYYYMMDD` with today)

The user memory `feedback_e2e_browser_verify.md` requires visible browser
verification before claiming "WP done". The user memory
`feedback_playwright_mcp_env.md` mandates `plugin_playwright` MCP (not
`ecc playwright`) and `pkill -f chromium` first.

- [ ] **Step 1: Pre-flight + start dev server**

```bash
pkill -f chromium 2>/dev/null || true
pnpm --filter @form-js-designer/designer-tiptap dev &
# wait for http://localhost:5173
sleep 3
```

- [ ] **Step 2: Drive browser via plugin_playwright MCP**

Using the `mcp__plugin_playwright__browser_*` tool family in **headed/visible mode**:

1. `browser_navigate http://localhost:5173`
2. `browser_take_screenshot evidence/v0.2-<date>/01-vanilla-host.png` — vanilla-host loaded with TipTap toolbar visible
3. `browser_click` the "+ Tabs form" button
4. `browser_take_screenshot evidence/v0.2-<date>/02-block-inserted.png` — form block visible inside doc
5. `browser_evaluate` to fire a `dblclick` event on `.form-js-block` (Playwright `dblclick` API)
6. `browser_take_screenshot evidence/v0.2-<date>/03-modal-open.png` — fullscreen modal with header + designer canvas
7. Add a component inside the designer (palette → drag a textfield)
8. `browser_take_screenshot evidence/v0.2-<date>/04-component-added.png` — component visible in designer
9. `browser_click` the `.fjd-embedded-designer-close` [닫기] button
10. `browser_take_screenshot evidence/v0.2-<date>/05-block-updated.png` — modal closed, NodeView reflects new component

- [ ] **Step 3: Save evidence index**

Create `packages/designer-tiptap/evidence/v0.2-<date>/README.md`:

```markdown
# v0.2 visible Playwright evidence — <date>

Driven via plugin_playwright MCP (headed mode). pkill chromium pre-flight.

| # | Screenshot | What it shows |
|---|---|---|
| 1 | 01-vanilla-host.png | demo loaded, TipTap rich-text toolbar visible |
| 2 | 02-block-inserted.png | "+ Tabs form" inserts a form-js NodeView block |
| 3 | 03-modal-open.png | double-click opens fullscreen embedded designer modal |
| 4 | 04-component-added.png | textfield added inside the embedded designer |
| 5 | 05-block-updated.png | [닫기] auto-saves; NodeView reflects new schema |
```

- [ ] **Step 4: Commit**

```bash
git add packages/designer-tiptap/evidence/v0.2-*/
git commit -m "chore(designer-tiptap): v0.2 visible Playwright evidence"
```

---

## Task 14: Tag 0.2.0 + dry-run publish + open PR#4

**Files:**
- (no file changes — git tag + remote ops)

- [ ] **Step 1: Final pre-flight gate**

Run all of:
```bash
pnpm --filter @form-js-designer/designer-tiptap typecheck
pnpm --filter @form-js-designer/designer-tiptap test:unit
pnpm --filter @form-js-designer/designer-tiptap test:e2e
pnpm --filter @form-js-designer/designer-tiptap build
```
Expected:
- typecheck: 0 errors
- test:unit: v0.1 8 + v0.2 6 = 14 PASS
- test:e2e: v0.1 6 + v0.2 3 = 9 PASS
- build: succeeds, `dist/editor.js`, `dist/editor.d.ts`, `dist/editor/modal.css` all present

If any gate fails, fix before proceeding — do not tag a broken release.

- [ ] **Step 2: Dry-run publish**

```bash
pnpm --filter @form-js-designer/designer-tiptap publish --dry-run
```
Expected: lists files to publish (`dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`), no errors. Verify the printed file list does **not** contain test files, `examples/`, or `evidence/` (controlled by `"files"` in package.json + `.npmignore`).

- [ ] **Step 3: Push branch + open PR**

```bash
git push -u origin HEAD
gh pr create --base main --title "feat(designer-tiptap): release 0.2.0 — embedded designer modal" --body "$(cat <<'EOF'
## Summary
- `./editor` entry now provides `withDesigner(node)` HOC that adds
  double-click → fullscreen embedded designer modal to FormJsBlock.
- Single-instance modal, auto-save on close (ESC / [닫기]).
- Bundles `designer-editor-host@0.1.0` via tsup `noExternal`.

## Test plan
- [x] Unit: 14 cases (v0.1 8 + v0.2 6) — withDesigner HOC, modal portal, single-instance gate, getPos null path
- [x] E2E: 9 cases (v0.1 6 + v0.2 3) — modal open / close / re-open / ESC
- [x] Visible Playwright evidence at `packages/designer-tiptap/evidence/v0.2-<date>/`
- [x] `pnpm publish --dry-run` clean
- [x] No regressions in v0.1 viewer-only tests

## Compat
- Requires `designer-editor-host` 0.1.0 (PR#3) bundled at build time.
- README Compatibility section updated.
- CHANGELOG 0.2.0 entry added.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: After CI green + merge — tag 0.2.0**

```bash
git checkout main
git pull
git tag designer-tiptap-v0.2.0
git push origin designer-tiptap-v0.2.0
```

- [ ] **Step 5: Verify tag pushed**

```bash
git ls-remote --tags origin | grep designer-tiptap
```
Expected: shows `designer-tiptap-v0.1.0` and `designer-tiptap-v0.2.0` refs.

---

## Self-Review Checklist (after all 14 tasks ship)

- [ ] **v0.1 regression**: 8 unit + 6 e2e all PASS unchanged
- [ ] **v0.2 coverage**: 6 unit + 3 e2e all PASS (Tasks 9, 11)
- [ ] **Visible evidence**: `packages/designer-tiptap/evidence/v0.2-<date>/` exists with 5 screenshots + README
- [ ] **Tag**: `designer-tiptap-v0.2.0` pushed to origin
- [ ] **Host package**: 0.1.0 with `./embedded` export, `installPropsPanelFocusGuard` scope BC test PASS
- [ ] **Compat matrix**: README has table, CHANGELOG has 0.2.0 entry, both reference host 0.1.0
- [ ] **No host App.tsx changes**: `git diff main packages/designer-editor-host/src/App.tsx` shows no diff
- [ ] **No designer-* src/ touched** outside the host extraction:
      `git diff main packages/designer-{core,components,runtime}/src/` shows no diff
- [ ] **Root package.json untouched**: `git diff main package.json` shows no diff
