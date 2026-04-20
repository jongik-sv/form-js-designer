# Test Report — outline-dnd-copy-paste

Date: 2026-04-18

## Unit Tests

All 110 unit tests pass across 5 test files.

| File | Tests |
|---|---|
| outlineUtils.test.ts | 22 passed |
| schemaToOutline.test.ts | 5 passed |
| OutlineModule.test.ts | 35 passed |
| OutlinePanel.test.tsx | 45 passed |
| PaletteModule.test.ts | 3 passed |
| **Total** | **110 / 110** |

Runner: `npx vitest run packages/designer-editor-host/src/__tests__/`

## E2E Tests (Playwright / Chromium)

27 / 27 total E2E tests pass (outline-dnd: 9, dragdrop: 13, tabs-tabpanel: 5).

| Suite | Tests |
|---|---|
| Outline DnD — 드래그앤드롭 이동 | 5 passed |
| Outline Clipboard — 복사/붙여넣기 | 3 passed |
| Outline DnD — 통합: collapsible과 공존 | 1 passed |
| Editor Drag & Drop | 13 passed |
| Tabs-TabPanel refactor | 5 passed |
| **Total** | **27 / 27** |

Runner: `npm --prefix packages/designer-editor-host run test:e2e -- --project=chromium`

## Real Browser Test (brw-test)

Headed Chromium via Playwright Node script. Dev server: `http://localhost:5173`.

### Scenario (a) — Outline DnD

1. Dropped 2 button fields from palette to canvas → outline shows 2 nodes (Field_03ek42e, Field_1w31ljm)
2. Dragged first outline node (Field_03ek42e) to after-position of second node (Field_1w31ljm)
3. Result: order reversed to [Field_1w31ljm, Field_03ek42e] — **PASS**

Screenshot: `/Users/jji/project/form-js-designer/brw-test-outline-dnd.png`

### Scenario (b) — Copy-Paste (Cmd+C / Cmd+V)

1. Selected outline node (Field_1w31ljm) by click
2. Pressed Cmd+C → node stored in in-memory clipboard
3. Pressed Cmd+V → new node with fresh ID added to form
4. Node count: 2 → 3 — **PASS**

Screenshot: `/Users/jji/project/form-js-designer/brw-test-outline-copypaste.png`

### Console Errors

One pre-existing 404 (failed resource load unrelated to this feature — no URL exposed, pre-existed before feature implementation). No JavaScript errors. No pageerrors.

## Key Bugs Fixed During Testing

### Bug 1: `sourceIndex: null` crash in moveFormField
- **Symptom**: `Cannot read properties of undefined (reading 'layout')` on outline DnD drop
- **Root cause**: `OutlineModule._handleDrop` passed `sourceIndex: null` to `modeling.moveFormField`. The form-js handler uses `get(schema, [...sourcePath, sourceIndex])` to retrieve the field — `null` index returns `undefined`, crashing `updateRow(undefined, rowId)`.
- **Fix**: Compute `sourceIndex = dragSiblings.findIndex(c => c.id === dragField.id)` and inject `formLayouter` service to get `sourceRow = this._formLayouter.getRowForField(dragField)`.

### Bug 2: Missing `formLayouter` DI injection
- **Fix**: Added `FormJsFormLayouter` interface, updated `static inject` array to include `'formLayouter'`, added constructor param.

### Previously Fixed Bugs (earlier in session)
- `_parent` is string ID in form-js runtime (not object reference) → `_getParent()` helper added
- `deepCloneWithNewIds` must exclude `_parent`/`_path` internal keys (avoids `_path is not iterable` error in `addFormField`)
- `_handlePaste` root fallback must use `formFieldRegistry.get(schema.id)` not raw `getSchema()` result
- Playwright palette item at y=1050 (outside viewport) → `scrollIntoViewIfNeeded()` added in E2E spec
- Double-paste: Preact re-render loses focus → `outlinePanel.focus()` before second Cmd+V in E2E spec
