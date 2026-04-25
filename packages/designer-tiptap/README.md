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
