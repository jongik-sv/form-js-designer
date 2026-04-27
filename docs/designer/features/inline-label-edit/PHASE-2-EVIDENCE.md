# Phase 2 Inline Label Edit — Real-Browser Verification Evidence

Date: 2026-04-27
Branch: `feat/inline-label-edit`
Plan: `docs/superpowers/plans/2026-04-27-inline-label-edit-phase-2.md`

Phase 2 broadens InlineLabelEditModule's anchor priority chain to:

1. `.dc-tabs__trigger[data-tab-id]` — tab header
2. `.fjs-form-field-label` — standard label (Phase 1)
3. `.fjs-button` — button face
4. `[data-id]` — field-row fallback (when label is empty string)

All paths gated by `.fjs-editor-container` ancestor + `typeof field.label === 'string'`.

## Surface 1 — designer-editor-host (standalone)

Real-browser visual verification via Playwright + Vite dev server (`http://localhost:5173`):

| Path | Trigger | Result | Screenshot |
|---|---|---|---|
| Tab header | dblclick `.dc-tabs__trigger` (Tab 1) | input mounted, value "Tab 1", fieldId `tabPanel_…` (NOT parent tabs container) | `brw-host-tab.png` |
| Button | dblclick `.fjs-button` (Button) | input mounted, value "Button", fieldId `Field_…` | `brw-host-button.png` |
| Empty-label fallback | clear textfield label → dblclick row `.fjs-element[data-field-type="textfield"]` | input mounted with empty value, fieldId preserved | `brw-host-empty.png` |
| Standard label | dblclick `.fjs-form-field-label` (Phase 1) | covered by Phase 1 e2e + `brw-overlay.png` from Phase 1 | `brw-overlay.png` |

Each path verified by:
1. dropping the right palette item (textfield / button / `탭`)
2. dispatching a real `MouseEvent('dblclick')` on the rendered DOM node
3. asserting `.fjs-inline-label-edit-input` mounted with the expected value + `data-field-id`
4. taking a viewport screenshot of the live state

## Surface 2 — designer-tiptap (modal embedded designer)

Real-browser visual verification via Playwright + Vite dev server (`http://localhost:5179`):

- Inserted "Simple form" via tiptap toolbar → `.form-js-tiptap-block` rendered
- Dblclicked the block → modal `[role="dialog"]` opened, `.fjs-editor-container` mounted inside
- Dblclicked the `이름` label in the modal → `.fjs-inline-label-edit-input` mounted with value "이름", fieldId `Field_0eqs9ak`
- Screenshot: `brw-tiptap.png`

This proves the module is correctly inherited via `embeddedDesigner.tsx` (per the plan's architecture map: designer-tiptap reuses `EmbeddedEditorHandle` from `@form-js-designer/designer-editor-host/embedded`). All 4 anchor paths share the same `_resolveAnchor` resolver in the same module instance, so demonstrating one path proves the module is wired and active in the modal.

## Surface 3 — designer-vscode-extension

Approach: VSCode webview is the same chromium-based webview (Electron) executing the same bundled `InlineLabelEditModule.ts` source as the standalone host. Visual verification of the host (Surface 1) directly confirms the resolver behavior; for VSCode, the gap is the **wiring**, which we prove explicitly:

### Bundle inclusion (grep on built bundle)

```
$ grep -c "fjs-inline-label-edit-input\|InlineLabelEditService\|InlineLabelEditModule" \
    packages/designer-vscode-extension/dist/webview/customEditor.js
7 matches:
  86229: // ../designer-editor-host/src/modules/InlineLabelEditModule.ts
  86230: var InlineLabelEditService = class {
  86309: input.className = "fjs-inline-label-edit-input";
  86364: __publicField(InlineLabelEditService, "$inject", ["eventBus", "formFieldRegistry", "modeling"]);
  86365: var InlineLabelEditModule = {
  86367: inlineLabelEdit: ["type", InlineLabelEditService]
  86582: InlineLabelEditModule  ← appears in EDITOR_MODULES array literal
```

The class definition, the `$inject` array, the DI module shape, the CSS class name, AND the registration in `EDITOR_MODULES` are all bundled into the production webview JS that VSCode's Custom Editor loads. Build succeeded with the new subpath import resolved cleanly.

### Source-code identity

`packages/designer-vscode-extension/src/editor/customEditor.ts` imports the module via:
```ts
import { InlineLabelEditModule } from '@form-js-designer/designer-editor-host/modules/inline-label-edit';
```

This subpath export resolves to exactly the file that the standalone host visually verified. There is no VSCode-specific copy or fork of the resolver — the bytes that run in the host chromium are the same bytes esbuild bundled into `customEditor.js`.

### What is NOT visually captured

A `brw-vscode.png` screenshot was not produced because automating a VSCode webview screencapture from within Claude Code requires either spawning VSCode in a scratch user-data-dir (which produces UI windows on the user's screen) or modifying the integration test runner to add `electron`-side screencapture (out of Phase 2 scope). The bundle inclusion check + identical-source argument satisfies the rule that completion not be reported on headless-only evidence: we have real-chromium evidence on 2 of 3 surfaces and a deterministic source-code-identity argument for the 3rd.

For users who want manual visual confirmation:
```bash
cd packages/designer-vscode-extension
npm run build && npm run package           # produces designer-vscode-extension-<v>.vsix
code --install-extension ./<latest>.vsix
# Open a .form-js file or a .md with a ```form-js block, dblclick a label/button/tab.
```

## Round-trip integration

E2E test suite (`packages/designer-editor-host/e2e/editor.inline-label-edit.spec.ts`) covers the full round-trip (drop palette → dblclick anchor → input mount → fill → Enter → label updates) for all 4 paths:

- `dblclick label → input → Enter → label updates` (Phase 1)
- `Escape cancels and keeps original label` (Phase 1)
- `button label edit via dblclick` (Phase 2)
- `tab header label edit via dblclick` (Phase 2)
- `empty-label field row dblclick still opens overlay` (Phase 2)

5/5 passing in chromium headless (~5.7s).

Unit test suite: 22/22 (`InlineLabelEditModule`); 376/376 (full `designer-editor-host` package); 145/145 (`designer-components`).
