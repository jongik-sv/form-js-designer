# Inline Label Edit — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Phase 1 dblclick-to-edit feature so it (1) covers form-js buttons, (2) covers TabPanel tab headers, (3) still works when a field's label has been cleared (empty string), and (4) is wired into the VSCode extension (the standalone host and tiptap modal already inherit it from Phase 1).

**Status as of plan creation:** Phase 1 complete on branch `feat/inline-label-edit` (commits `df60c30` → `38f8bc1`). Standalone host + embedded designer modal wired and verified in real browser. Phase 2 has not started — all the work below is greenfield.

**Architecture (host wiring map):**

| Surface | How it instantiates the editor | Phase 1 inherits? | Phase 2 needs? |
|---|---|---|---|
| `designer-editor-host` standalone (`App.tsx`) | own `additionalModules` array | ✅ already wired | nothing extra |
| `designer-editor-host` embedded modal (`embeddedDesigner.tsx`) | own `additionalModules` array | ✅ already wired | nothing extra |
| `designer-tiptap` (form-js block dblclick → modal) | reuses `embeddedDesigner.tsx` via `EmbeddedEditorHandle from '@form-js-designer/designer-editor-host/embedded'` (see `packages/designer-tiptap/src/editor/modalPortal.ts:11`) | ✅ inherits transitively | nothing extra |
| `designer-vscode-extension` Custom Editor (`customEditor.ts`) | own `createFormEditor` call with own `EDITOR_MODULES` constant at `customEditor.ts:61–67` | ❌ does **not** include `InlineLabelEditModule` | explicit wiring + new package export |

**Tech Stack:** TypeScript, form-js editor, Vitest + happy-dom, Playwright, Preact, Radix UI Tabs (custom container).

---

## File Structure

**Modified files:**
- `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts` — refactor `_onDblclick` to use a priority resolver covering 4 anchor strategies; preserve all existing behavior.
- `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts` — add unit tests for button anchor, tab trigger anchor, empty-label fallback.
- `packages/designer-editor-host/package.json` — add `./modules/inline-label-edit` subpath export so cross-package consumers (vscode-ext) can import it without reaching into `src/`.
- `packages/designer-components/src/tabs/Tabs.tsx` — add `data-tab-id={tp.id}` to `<TabsPrimitive.Trigger>` so the dblclick filter can resolve the tab's field id (the trigger sits outside the tab's `[data-id]` wrapper, so without this attribute `target.closest('[data-id]')` resolves the parent tabs container, not the individual tab).
- `packages/designer-vscode-extension/src/editor/customEditor.ts` — import `InlineLabelEditModule` from the new subpath export and add it to the `EDITOR_MODULES` array.
- `packages/designer-editor-host/e2e/editor.inline-label-edit.spec.ts` — add e2e cases for button + tab header + empty label.

**No new files** — Phase 2 is purely an extension to existing files.

---

## Background — DOM Pattern Reference (from Phase 2 investigation)

These were verified during the planning session; relisted here so the implementer doesn't have to rediscover them:

- **form-js label render**: `<label class="fjs-form-field-label">…</label>` is **always** rendered, even when `label === ''`. The collapsed-on-empty behavior is CSS-driven (the `fjs-incollapsible-label` class toggles `collapseOnEmpty`). So the `.fjs-form-field-label` element exists in the DOM but may have **0 height** when label is empty — a real user can't reliably click it.
  - Source: `node_modules/@bpmn-io/form-js-viewer/dist/index.es.js:1813–1837`.

- **form-js button render**: `<button class="fjs-button" disabled>{label}</button>`. The button text **is** the label. There is no separate `.fjs-form-field-label` sibling.
  - Source: `node_modules/@bpmn-io/form-js-viewer/dist/index.es.js:1745`.

- **TabPanel tab triggers**: rendered via Radix UI in the custom `Tabs.tsx` component:
  ```tsx
  <TabsPrimitive.Trigger key={tp.id} class="dc-tabs__trigger" value={tp.id}>
    {tp.label || tp.id}
  </TabsPrimitive.Trigger>
  ```
  - Source: `packages/designer-components/src/tabs/Tabs.tsx:121–147`.
  - **Critical:** the trigger button sits inside the parent `tabs` container's wrapper, NOT inside the individual tab's `[data-id]` wrapper. The tab's wrapper (`<div data-tab-id={tp.id}>` containing the FormField) is inside `<TabsPrimitive.Content>` — only mounted when the tab is active for content but the *trigger* lives outside it. So `target.closest('[data-id]')` from the trigger resolves the parent tabs field, which is the wrong identity. We must read the tab id from a dedicated attribute on the trigger (this is why we add `data-tab-id` to the Trigger in Phase 2).

- **VSCode extension EDITOR_MODULES**: hardcoded array at `packages/designer-vscode-extension/src/editor/customEditor.ts:61–67`. Currently includes `DesignerContainerModule, customComponentsModule, PropsPanelModule, LayoutHeightModule, OutlineModule`. Needs `InlineLabelEditModule` appended.

- **Existing subpath export pattern**: `packages/designer-editor-host/package.json` already exports `./modules/outline` (used by the vscode-extension to import OutlineModule). Phase 2 follows the same pattern for `./modules/inline-label-edit`.

---

## Task 1: Refactor `_onDblclick` to a Priority Anchor Resolver

**Files:**
- Modify: `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts`
- Modify: `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts`

The current `_onDblclick` matches only `.fjs-form-field-label`. Phase 2 generalizes it into a priority chain:

1. **Tab trigger** (`target.closest('.dc-tabs__trigger')`) — read `data-tab-id` attribute for the field id, anchor on the trigger button.
2. **Standard label** (`target.closest('.fjs-form-field-label')`) — current behavior, anchor on the label, field id from the closest `[data-id]`.
3. **Button** (`target.closest('.fjs-button')`) — anchor on the button itself, field id from the closest `[data-id]`.
4. **Field row fallback** (`target.closest('[data-id]')`) — anchor on the field row, only if `field.label` is a string. This handles empty labels.

All paths still require:
- ancestor `.fjs-editor-container` (must be inside the canvas)
- `field.label` is a string (excludes spacer/divider/etc. that have no label)

- [ ] **Step 1: Write failing tests for tab trigger anchor**

Append to `packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts`:

```ts
function buildCanvasWithTabTrigger(tabFieldId: string, tabLabelText: string): {
  canvas: HTMLElement;
  triggerEl: HTMLElement;
} {
  const canvas = document.createElement('div');
  canvas.className = 'fjs-editor-container';
  // Outer tabs container has its own [data-id] (the tabPanel/tabs field)
  const tabsContainer = document.createElement('div');
  tabsContainer.setAttribute('data-id', 'tabs-container');
  const triggerEl = document.createElement('button');
  triggerEl.className = 'dc-tabs__trigger';
  triggerEl.setAttribute('data-tab-id', tabFieldId);
  triggerEl.textContent = tabLabelText;
  tabsContainer.appendChild(triggerEl);
  canvas.appendChild(tabsContainer);
  document.body.appendChild(canvas);
  return { canvas, triggerEl };
}

describe('InlineLabelEditModule tab trigger anchor', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => { cleanup = []; });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('mounts overlay on .dc-tabs__trigger dblclick using data-tab-id (not parent [data-id])', () => {
    const fields = {
      'tab-1': { id: 'tab-1', type: 'tabPanel', label: 'My Tab' },
      'tabs-container': { id: 'tabs-container', type: 'tabs', label: 'Tabs' },
    };
    const { service, formFieldRegistry } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());
    const { triggerEl } = buildCanvasWithTabTrigger('tab-1', 'My Tab');
    dispatchDblclick(triggerEl);

    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('My Tab');
    expect(input!.getAttribute('data-field-id')).toBe('tab-1');
    // Must lookup the tab id, NOT the parent tabs-container
    expect(formFieldRegistry.get).toHaveBeenCalledWith('tab-1');
  });

  it('does not mount when trigger has no data-tab-id attribute', () => {
    const { service } = createService();
    cleanup.push(() => service.destroy());
    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const trigger = document.createElement('button');
    trigger.className = 'dc-tabs__trigger';
    trigger.textContent = 'Orphan';
    canvas.appendChild(trigger);
    document.body.appendChild(canvas);
    dispatchDblclick(trigger);
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });
});
```

- [ ] **Step 2: Write failing tests for button anchor**

Append:

```ts
describe('InlineLabelEditModule button anchor', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => { cleanup = []; });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('mounts overlay on .fjs-button dblclick (anchor=button, label=button text)', () => {
    const fields = { 'btn-1': { id: 'btn-1', type: 'button', label: 'Submit' } };
    const { service } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());

    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const fieldEl = document.createElement('div');
    fieldEl.setAttribute('data-id', 'btn-1');
    const buttonEl = document.createElement('button');
    buttonEl.className = 'fjs-button';
    buttonEl.textContent = 'Submit';
    fieldEl.appendChild(buttonEl);
    canvas.appendChild(fieldEl);
    document.body.appendChild(canvas);

    dispatchDblclick(buttonEl);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('Submit');
    expect(input!.getAttribute('data-field-id')).toBe('btn-1');
  });
});
```

- [ ] **Step 3: Write failing tests for empty-label field-row fallback**

Append:

```ts
describe('InlineLabelEditModule empty-label fallback', () => {
  let cleanup: Array<() => void> = [];
  beforeEach(() => { cleanup = []; });
  afterEach(() => {
    cleanup.forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  it('mounts overlay on field row dblclick when label is empty string', () => {
    const fields = { 'f1': { id: 'f1', type: 'textfield', label: '' } };
    const { service } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());

    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const fieldEl = document.createElement('div');
    fieldEl.setAttribute('data-id', 'f1');
    fieldEl.className = 'fjs-form-field';
    // No label element rendered (or rendered with 0 height); user clicks field body
    const inner = document.createElement('div');
    inner.textContent = 'click here';
    fieldEl.appendChild(inner);
    canvas.appendChild(fieldEl);
    document.body.appendChild(canvas);

    dispatchDblclick(inner);
    const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('');
    expect(input!.getAttribute('data-field-id')).toBe('f1');
  });

  it('does not mount when field has no label property at all (e.g., spacer)', () => {
    const fields = { 'sp1': { id: 'sp1', type: 'spacer' } };
    const { service } = createService({
      formFieldRegistry: createMockFormFieldRegistry(fields),
    });
    cleanup.push(() => service.destroy());

    const canvas = document.createElement('div');
    canvas.className = 'fjs-editor-container';
    const fieldEl = document.createElement('div');
    fieldEl.setAttribute('data-id', 'sp1');
    canvas.appendChild(fieldEl);
    document.body.appendChild(canvas);

    dispatchDblclick(fieldEl);
    expect(document.querySelector('.fjs-inline-label-edit-input')).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests, confirm new tests fail**

Run: `cd packages/designer-editor-host && npm run test:unit -- InlineLabelEditModule`
Expected: 17 prior pass, 5 new fail (the 4 mount/positive tests + the spacer guard if it currently bails on a different code path — verify which).

- [ ] **Step 5: Refactor `_onDblclick` and add `_resolveAnchor` helper**

Edit `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts`. Replace the current `_onDblclick` with:

```ts
  private _onDblclick(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (!target || typeof target.closest !== 'function') return;
    if (!target.closest('.fjs-editor-container')) return;

    const resolved = this._resolveAnchor(target);
    if (!resolved) return;

    const { fieldId, anchor } = resolved;
    const field = this._formFieldRegistry.get(fieldId);
    if (!field) return;
    if (typeof field.label !== 'string') return;

    e.preventDefault();
    e.stopPropagation();
    this._activate(fieldId, anchor, field.label);
  }

  /**
   * Priority chain for finding the (fieldId, anchor) pair from a dblclick target.
   * - Tab triggers sit OUTSIDE their tab's [data-id] wrapper, so we read data-tab-id.
   * - Buttons render their label as their own text node; anchor is the button itself.
   * - Standard labels follow the original closest-label/closest-data-id pattern.
   * - Field-row fallback handles empty labels (label DOM may be 0-height).
   */
  private _resolveAnchor(target: HTMLElement): { fieldId: string; anchor: HTMLElement } | null {
    const tabTrigger = target.closest('.dc-tabs__trigger') as HTMLElement | null;
    if (tabTrigger) {
      const tabId = tabTrigger.getAttribute('data-tab-id');
      if (tabId) return { fieldId: tabId, anchor: tabTrigger };
      return null;
    }

    const labelEl = target.closest('.fjs-form-field-label') as HTMLElement | null;
    if (labelEl) {
      const fieldEl = labelEl.closest('[data-id]') as HTMLElement | null;
      const fieldId = fieldEl?.getAttribute('data-id');
      if (fieldId) return { fieldId, anchor: labelEl };
      return null;
    }

    const buttonEl = target.closest('.fjs-button') as HTMLElement | null;
    if (buttonEl) {
      const fieldEl = buttonEl.closest('[data-id]') as HTMLElement | null;
      const fieldId = fieldEl?.getAttribute('data-id');
      if (fieldId) return { fieldId, anchor: buttonEl };
      return null;
    }

    const fieldEl = target.closest('[data-id]') as HTMLElement | null;
    if (fieldEl) {
      const fieldId = fieldEl.getAttribute('data-id');
      if (fieldId) return { fieldId, anchor: fieldEl };
    }
    return null;
  }
```

Note: the spacer test passes through path 4 (field row fallback) but is rejected by `if (typeof field.label !== 'string') return;` in `_onDblclick`.

- [ ] **Step 6: Run tests, confirm all pass**

Run: `cd packages/designer-editor-host && npm run test:unit -- InlineLabelEditModule`
Expected: 22/22 pass (17 prior + 5 new).

- [ ] **Step 7: Commit**

```bash
git add packages/designer-editor-host/src/modules/InlineLabelEditModule.ts \
        packages/designer-editor-host/src/__tests__/InlineLabelEditModule.test.ts
git commit -m "feat(editor-host): InlineLabelEdit anchor priority chain (tab/label/button/field-row)"
```

---

## Task 2: Wire `data-tab-id` on TabPanel Trigger

**Files:**
- Modify: `packages/designer-components/src/tabs/Tabs.tsx`

- [ ] **Step 1: Add `data-tab-id` to the Trigger**

In `packages/designer-components/src/tabs/Tabs.tsx`, find lines 122–146 (the `<TabsPrimitive.Trigger>` block). Add `data-tab-id={tp.id}` immediately after `value={tp.id}`:

```tsx
            <TabsPrimitive.Trigger
              key={tp.id}
              class="dc-tabs__trigger"
              value={tp.id}
              data-tab-id={tp.id}
              onClick={...}
            >
              {tp.label || tp.id}
            </TabsPrimitive.Trigger>
```

- [ ] **Step 2: Run designer-components tests**

Run: `cd packages/designer-components && npm run test:unit`
Expected: all tests pass; if there's a snapshot test for the tabs DOM, update it via `--update`.

- [ ] **Step 3: Commit**

```bash
git add packages/designer-components/src/tabs/Tabs.tsx
git commit -m "feat(components): expose data-tab-id on TabPanel triggers for inline label edit"
```

---

## Task 3: Export `InlineLabelEditModule` as Subpath from `designer-editor-host`

**Files:**
- Modify: `packages/designer-editor-host/package.json`

- [ ] **Step 1: Inspect current exports**

Run: `cat packages/designer-editor-host/package.json | head -20`
Note the existing block:
```json
  "exports": {
    "./embedded": "./src/embeddedDesigner.tsx",
    "./modules/outline": "./src/modules/OutlineModule.ts"
  }
```

- [ ] **Step 2: Add `./modules/inline-label-edit` export**

Edit `packages/designer-editor-host/package.json`. Replace the `exports` block with:

```json
  "exports": {
    "./embedded": "./src/embeddedDesigner.tsx",
    "./modules/outline": "./src/modules/OutlineModule.ts",
    "./modules/inline-label-edit": "./src/modules/InlineLabelEditModule.ts"
  },
```

- [ ] **Step 3: Verify resolution**

Run: `cd packages/designer-editor-host && npx tsc --noEmit`
Expected: no NEW errors (any pre-existing errors remain — see Phase 1 notes).

- [ ] **Step 4: Commit**

```bash
git add packages/designer-editor-host/package.json
git commit -m "chore(editor-host): export InlineLabelEditModule subpath for cross-package use"
```

---

## Task 4: Wire `InlineLabelEditModule` into VSCode Extension Custom Editor

**Files:**
- Modify: `packages/designer-vscode-extension/src/editor/customEditor.ts`

- [ ] **Step 1: Add the import**

Find the line:
```ts
import { OutlineModule } from '@form-js-designer/designer-editor-host/modules/outline';
```

Add immediately after:
```ts
import { InlineLabelEditModule } from '@form-js-designer/designer-editor-host/modules/inline-label-edit';
```

- [ ] **Step 2: Add to EDITOR_MODULES array**

Find:
```ts
const EDITOR_MODULES = [
  DesignerContainerModule,
  customComponentsModule,
  PropsPanelModule,
  LayoutHeightModule,
  OutlineModule,
];
```

Replace with:
```ts
const EDITOR_MODULES = [
  DesignerContainerModule,
  customComponentsModule,
  PropsPanelModule,
  LayoutHeightModule,
  OutlineModule,
  InlineLabelEditModule,
];
```

- [ ] **Step 3: Build the extension to verify imports resolve**

Run: `cd packages/designer-vscode-extension && npm run build`
Expected: build succeeds. esbuild may need to find the new subpath — confirm via the build log.

- [ ] **Step 4: Commit**

```bash
git add packages/designer-vscode-extension/src/editor/customEditor.ts
git commit -m "feat(vscode-ext): register InlineLabelEditModule in custom editor"
```

---

## Task 5: Add E2E Cases for Phase 2 Anchors

**Files:**
- Modify: `packages/designer-editor-host/e2e/editor.inline-label-edit.spec.ts`

- [ ] **Step 1: Append three new tests**

Add to the existing `test.describe('Inline label edit (dblclick)', ...)` block:

```ts
  test('button label edit via dblclick', async ({ page }) => {
    const paletteItem = page.locator('[data-field-type="button"]').first();
    await expect(paletteItem).toBeVisible({ timeout: 10000 });
    const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
    const paletteBox = await paletteItem.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!paletteBox || !canvasBox) throw new Error('boundingBox unavailable');
    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
    await page.mouse.up();

    const button = page.locator('.fjs-editor-container .fjs-button').first();
    await expect(button).toBeVisible({ timeout: 5000 });
    await button.dblclick({ force: true });

    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill('Save');
    await input.press('Enter');
    await expect(page.locator('.fjs-editor-container .fjs-button', { hasText: 'Save' })).toBeVisible({ timeout: 3000 });
  });

  test('tab header label edit via dblclick', async ({ page }) => {
    // Drop a tabs container, then dblclick a tab trigger.
    const paletteItem = page.locator('[data-field-type="tabs"]').first();
    await expect(paletteItem).toBeVisible({ timeout: 10000 });
    const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
    const paletteBox = await paletteItem.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!paletteBox || !canvasBox) throw new Error('boundingBox unavailable');
    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
    await page.mouse.up();

    const trigger = page.locator('.dc-tabs__trigger').first();
    await expect(trigger).toBeVisible({ timeout: 5000 });
    await trigger.dblclick({ force: true });

    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill('First Tab');
    await input.press('Enter');
    await expect(page.locator('.dc-tabs__trigger', { hasText: 'First Tab' }).first()).toBeVisible({ timeout: 3000 });
  });

  test('empty-label field row dblclick still opens overlay', async ({ page }) => {
    // Drop textfield, clear its label via the props panel, then dblclick the field row.
    const paletteItem = page.locator('[data-field-type="textfield"]').first();
    await expect(paletteItem).toBeVisible({ timeout: 10000 });
    const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
    const paletteBox = await paletteItem.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!paletteBox || !canvasBox) throw new Error('boundingBox unavailable');
    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
    await page.mouse.up();

    // First: dblclick the existing label and clear it via the input
    const label = page.locator('.fjs-editor-container .fjs-form-field-label').first();
    await label.dblclick({ force: true });
    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill('');
    await input.press('Enter');

    // Now: label is empty; dblclick the field row should still activate the overlay.
    const fieldRow = page.locator('.fjs-editor-container [data-id]').first();
    await fieldRow.dblclick({ force: true });
    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill('Reborn');
    await input.press('Enter');
    await expect(page.locator('.fjs-editor-container .fjs-form-field-label', { hasText: 'Reborn' })).toBeVisible({ timeout: 3000 });
  });
```

- [ ] **Step 2: Run e2e**

Run: `cd packages/designer-editor-host && npm run test:e2e -- editor.inline-label-edit.spec.ts`
Expected: all 5 tests pass (2 from Phase 1 + 3 new). If a `[data-field-type=...]` selector doesn't exist for one of these palette items, inspect the live palette (run `npm run dev`, open DevTools) and adjust the selector — record the actual attribute used.

- [ ] **Step 3: Commit**

```bash
git add packages/designer-editor-host/e2e/editor.inline-label-edit.spec.ts
git commit -m "test(editor-host): e2e for button + tab header + empty-label inline edit"
```

---

## Task 6: Real-Browser Verification Across All Three Surfaces

Per memory rule "headless 측정만으로 완료 보고 금지, 실제 브라우저·visible Playwright 병행". Verification matrix below MUST be completed before declaring Phase 2 done.

For each surface, verify all four anchor paths: standard label, button, tab trigger, empty-label fallback.

- [ ] **Step 1: Designer-editor-host (standalone)**

Run: `cd packages/designer-editor-host && npm run dev`
Open `http://localhost:5173`. Drop textfield, button, tabs onto canvas. Verify:
- dblclick textfield label → edit
- dblclick button → edit
- dblclick tab trigger → edit
- clear textfield label, dblclick field row → edit

- [ ] **Step 2: Designer-tiptap (modal embedded designer)**

Run: `cd packages/designer-tiptap && npm run dev` (or use the e2e harness: `cd packages/designer-tiptap && npx playwright test --headed tiptap-host.spec.ts`).
In a tiptap document, dblclick a `<form-js>` node to open the modal. Inside the modal, repeat the four checks. Confirm Phase 2 wiring inherits via `embeddedDesigner.tsx`.

- [ ] **Step 3: Designer-vscode-extension**

Build + install the VSIX:
```
cd packages/designer-vscode-extension && npm run build && npm run package:vsix
code --install-extension ./<latest>.vsix
```
Open a `.form-js` file in VS Code. Drop textfield/button/tabs. Repeat the four checks.

- [ ] **Step 4: Capture evidence and commit**

Save one screenshot per surface to `docs/designer/features/inline-label-edit/`:
- `brw-host-button.png` / `brw-host-tab.png` / `brw-host-empty.png`
- `brw-tiptap.png`
- `brw-vscode.png`

Commit:
```bash
git add docs/designer/features/inline-label-edit/*.png
git commit -m "docs(inline-label-edit): Phase 2 real-browser evidence (host + tiptap + vscode)"
```

---

## Self-Review

**1. Spec coverage:**
- Empty/cleared label edit — Task 1 (filter) + Task 5/6 (e2e + manual). ✓
- Tab header edit — Task 1 (filter) + Task 2 (data-tab-id) + Task 5/6 (e2e + manual). ✓
- Button edit — Task 1 (filter) + Task 5/6 (e2e + manual). ✓
- Wiring everywhere — Task 3 (export) + Task 4 (vscode-ext). designer-tiptap inherits from embeddedDesigner.tsx (verified during planning). ✓

**2. Placeholder scan:** All snippets are concrete; no TBD/TODO; commit messages explicit.

**3. Type consistency:** `_resolveAnchor` returns `{ fieldId: string; anchor: HTMLElement } | null`; `_activate(fieldId, anchor, currentLabel)` matches Phase 1 signature; `_onDblclick` consumes both unchanged.

**4. Risk notes for the next session:**
- The spacer test uses `field.label === undefined`. If the form-js spacer field actually carries an empty label (`''`), the field-row fallback would activate. This is intentional — "any field with a label property" is the rule. Re-confirm spacer schema in form-js if a real-browser session shows a spacer activating unexpectedly.
- Radix Tabs may pass `data-tab-id` through to the rendered DOM, but verify in real browser snapshot. If Radix swallows custom attributes, switch to `aria-label` matching or expose tab id via `data-state` patterns.
- The VSCode extension uses esbuild bundling. The new subpath import must be resolvable by esbuild's resolver — package.json `exports` is the right mechanism, but if esbuild config has `resolve.alias` overriding, adjust there as well.

---

## Execution Handoff

Per project memory ("superpowers 기본 실행은 subagent-driven"), proceed with **subagent-driven-development**: dispatch a fresh subagent per task, two-stage review per task. Phase 1 used the same harness on this branch and produced 8 clean commits.

Branch: `feat/inline-label-edit` already exists; commit Phase 2 on top of it. Final PR will bundle both phases.
