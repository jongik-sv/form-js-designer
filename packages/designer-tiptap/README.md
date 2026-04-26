# @form-js-designer/designer-tiptap

Tiptap extension that renders form-js-designer schemas (incl. our Tabs/Card/Modal
components) as atomic blocks inside a Tiptap document.

## Status

v0.2 — `./editor` entry adds the embedded designer modal. v0.1 viewer-only flow remains supported.

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

## Use — editor (v0.2)

```ts
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FormJsBlock as RawFormJsBlock } from '@form-js-designer/designer-tiptap';
import { withDesigner } from '@form-js-designer/designer-tiptap/editor';
import '@form-js-designer/designer-tiptap/styles';
// v0.2 추가 — 임베디드 디자이너 모달 + form-js editor 레이아웃 CSS.
// ./styles는 viewer 전용이므로 editor 사용자는 이 줄을 추가로 import.
import '@form-js-designer/designer-tiptap/editor.css';

const FormJsBlock = withDesigner(RawFormJsBlock);

const editor = new Editor({
  element: document.querySelector('#editor')!,
  extensions: [StarterKit, FormJsBlock],
});

// Double-click any inserted form-js block to open the fullscreen designer modal.
// ESC or the [닫기] button auto-saves and closes (single-instance modal).
editor.commands.insertFormJsBlock(mySchema, 'optional-form-id');
```

## Roadmap

| Version | Scope |
|---|---|
| v0.1 | viewer-only NodeView, insertFormJsBlock command, GH Packages |
| v0.2 | ✅ `./editor` entry with `withDesigner` HOC, fullscreen embedded designer modal, single-instance + auto-save lifecycle |
| v0.3 (optional) | React wrapper, VS Code webview variant, Tiptap v3 |
| v1.0 (optional) | npm public, OSS license, Yjs collaboration guide |

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

## Yjs collaboration

The `schema` attribute is plain JSON, so document-level collaboration via
`@tiptap/extension-collaboration` works without any change to this package.

## License

UNLICENSED (private). See `docs/superpowers/specs/2026-04-26-designer-tiptap-design.md`.
