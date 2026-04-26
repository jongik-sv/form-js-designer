# Changelog

## 0.2.0 — 2026-04-26

### Added
- `./editor` entry: `withDesigner(node)` HOC wraps `FormJsBlock` to add
  double-click → fullscreen embedded designer modal behavior.
- Single-instance modal portal (`modalPortal`) prevents two designers from
  fighting over the prototype-focus patch. Subsequent double-clicks while
  a modal is open focus the existing modal instead of opening a second.
- Auto-save lifecycle: ESC and the [닫기] button funnel through
  `triggerClose` which awaits `editor.saveSchema()` then propagates the
  result to the host's `onSave` callback (which updates the NodeView
  attrs via `editor.chain().setNodeSelection(pos).updateAttributes(...)`).
- Defensive force-close: external teardown via `handle.destroy()` skips
  `onSave` (NodeView destroy path uses this when the block is removed
  while the modal is still open).
- `dist/editor/modal.css` — fullscreen modal styling, configurable via
  CSS variable hooks (`--fjd-modal-bg`, `--fjd-modal-border`,
  `--fjd-modal-header-bg`, `--fjd-modal-title-color`,
  `--fjd-modal-primary-bg`, `--fjd-modal-primary-fg`,
  `--fjd-modal-primary-bg-hover`).
- modal.css also ships in `dist/designer-tiptap.css` (the `./styles`
  bundle) via `scripts/copy-css.mjs`.

### Bundles
- `@form-js-designer/designer-editor-host` `0.1.0` — inlined at build
  time via tsup `noExternal: [/^@form-js-designer\//]`. No runtime peer
  dependency.

### Required by
- (none — terminal package)

## 0.1.0 — 2026-04-26

- Initial release.
- Tiptap atom Node `formJsBlock` with vanilla NodeView.
- `insertFormJsBlock(schema, formId?)` and `updateFormJsBlock(schema)` commands.
- Mounts `@bpmn-io/form-js-viewer` with DesignerContainer/Components/LayoutHeight modules.
- Bundled CSS at `./styles`.
- Built and published via tsup to GitHub Packages.
