# v0.2 visible Playwright evidence — 2026-04-26

Driven via `playwright test --headed` (see `e2e/v0.2-evidence.spec.ts`).
Memory rule `feedback_e2e_browser_verify` requires visible-browser
verification — the headed runner shows a real Chromium window during
the run.

`plugin_playwright` MCP was unavailable at capture time (server
disconnected mid-session). The in-repo headed runner is the
reproducible-from-source equivalent: same Playwright engine, same
DOM operations, real visible browser, no MCP dependency.

## Reproduce

```sh
# pkill chromium 2>/dev/null || true
pnpm --filter @form-js-designer/designer-tiptap dev &
# wait for http://localhost:5179
cd packages/designer-tiptap
../../node_modules/.bin/playwright test --headed --project=chromium e2e/v0.2-evidence.spec.ts
```

## Screenshots

| # | File | What it shows |
|---|---|---|
| 1 | `01-vanilla-host.png` | demo loaded, TipTap rich-text toolbar + insert buttons visible |
| 2 | `02-block-inserted.png` | "+ Tabs form" inserts a form-js NodeView block (atom, .form-js-tiptap-block) |
| 3 | `03-modal-open.png` | double-click opens fullscreen embedded designer modal — header "Form Designer" + [닫기] visible |
| 4 | `04-component-added.png` | designer canvas live — click into form-js field shows it accepts pointer events |
| 5 | `05-block-updated.png` | [닫기] auto-saves; modal hidden; NodeView still in document |
