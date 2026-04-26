# @form-js-designer/designer-tiptap

Tiptap 에디터에 form-js-designer 스키마(Tabs / Card / Modal 포함)를 **atom block(NodeView)** 으로 끼워 넣는 익스텐션입니다.

- `import { FormJsBlock } from '@form-js-designer/designer-tiptap'` — v0.1 viewer-only 노드(읽기/직렬화)
- `import { withDesigner } from '@form-js-designer/designer-tiptap/editor'` — v0.2 임베디드 디자이너 모달 HOC (더블클릭 → 풀스크린 디자이너)

> 상태: v0.2.0. v0.1 viewer-only 흐름도 그대로 지원합니다.

---

## 1. 사전 요구사항

| 항목 | 버전/조건 |
|------|----------|
| Node.js | 18 이상 |
| Tiptap | **v2.x** (`@tiptap/core`, `@tiptap/pm`) — v3 미지원 |
| 번들러 | Vite / Webpack / Rollup 등 ESM 지원 (`type: module` 빌드) |
| form-js | `@bpmn-io/form-js-viewer ^1.21.2` |
| Preact | `^10.19.3` (form-js 내부에서 사용) |
| GitHub PAT | `read:packages` scope. 비공개 레지스트리(`npm.pkg.github.com`)에서 받기 위함 |

---

## 2. 설치

### 2-1. `.npmrc` 인증 설정

GitHub Packages에 비공개로 게시되어 있으므로 프로젝트 루트의 `.npmrc`에 다음을 추가합니다.

```ini
@form-js-designer:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PAT}
```

그리고 셸 환경에 PAT을 노출:

```sh
export GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxx
```

> CI에서는 `secrets.GITHUB_TOKEN` 또는 별도 발급한 PAT을 환경변수로 주입하세요. PAT은 절대 커밋하지 않습니다.

### 2-2. 패키지 설치

```sh
# Tiptap + designer-tiptap + peer (form-js + preact)
npm i @form-js-designer/designer-tiptap \
      @tiptap/core @tiptap/pm @tiptap/starter-kit \
      @bpmn-io/form-js-viewer preact
```

`pnpm` / `yarn`도 동일한 패키지 셋이면 됩니다.

### 2-3. (선택) 빌드 타겟 — Vite의 경우

별도 설정 없이 ESM `import`로 동작합니다. `optimizeDeps.exclude`나 `ssr.noExternal`은 필요 없습니다.

---

## 3. CSS 한 번에 정리 — **반드시 두 번**

폼 셀이 보이지 않거나 디자이너 모달이 깨진 모습으로 뜬다면 99%는 CSS import 누락입니다.

### viewer만 쓰는 경우 (v0.1)

```ts
import '@form-js-designer/designer-tiptap/styles';
```

### 임베디드 디자이너 모달까지 쓰는 경우 (v0.2)

```ts
import '@form-js-designer/designer-tiptap/styles';
import '@form-js-designer/designer-tiptap/editor.css'; // 추가 필요
```

> `./styles`는 viewer 전용 번들이고, 모달 + form-js 디자이너 레이아웃은 `./editor.css`에 들어 있습니다.
> 둘 다 import 해야 모달이 정상 동작합니다.

---

## 4. 사용 — viewer-only (v0.1)

읽기 전용으로 form-js 블록을 렌더링하기만 할 때 사용합니다.

```ts
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FormJsBlock } from '@form-js-designer/designer-tiptap';
import '@form-js-designer/designer-tiptap/styles';

const editor = new Editor({
  element: document.querySelector('#editor')!,
  extensions: [StarterKit, FormJsBlock],
});

// schema는 form-js JSON. 두번째 인자 formId는 옵션(직렬화 시 data-form-id 속성).
editor.commands.insertFormJsBlock(mySchema, 'optional-form-id');
```

특징:
- `formJsBlock`은 atom 노드 — 한 덩어리로 선택/삭제됩니다(내부 텍스트 편집 불가).
- `editor.getHTML()`은 schema를 `data-schema` 속성에 직렬화하므로 라운드트립 가능.
- `@tiptap/extension-collaboration`(Yjs)과도 그대로 호환.

---

## 5. 사용 — 임베디드 디자이너 모달 (v0.2)

작성자가 블록을 **더블클릭**하면 풀스크린 form-js 디자이너 모달이 떠서 스키마를 편집할 수 있게 합니다.

```ts
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FormJsBlock as RawFormJsBlock } from '@form-js-designer/designer-tiptap';
import { withDesigner } from '@form-js-designer/designer-tiptap/editor';

import '@form-js-designer/designer-tiptap/styles';
import '@form-js-designer/designer-tiptap/editor.css';

const FormJsBlock = withDesigner(RawFormJsBlock);

const editor = new Editor({
  element: document.querySelector('#editor')!,
  extensions: [StarterKit, FormJsBlock],
});

editor.commands.insertFormJsBlock(mySchema, 'optional-form-id');
```

### 5-1. 동작 라이프사이클

| 트리거 | 결과 |
|--------|------|
| 블록 더블클릭 | 풀스크린 모달이 마운트되고 form-js 디자이너가 현재 schema로 초기화 |
| ESC 또는 헤더 `[닫기]` | `editor.saveSchema()` → `onSave(newSchema)` → 닫힘 (자동 저장) |
| `handle.destroy()` (외부 강제 종료) | NodeView가 destroy될 때 호출 — 저장 없이 모달 정리 |
| 모달이 떠 있는 상태에서 또 다른 블록 더블클릭 | 두 번째 모달은 열리지 않고 기존 모달이 포커스됨(single-instance) |

### 5-2. 저장 흐름

`onSave`는 내부에서 `editor.chain().setNodeSelection(pos).updateAttributes('formJsBlock', { schema })`로 **같은 NodeView**의 schema 속성만 갱신합니다. ProseMirror 트랜잭션이므로 undo/redo, Yjs 동기화, `getHTML()` 라운드트립 모두 자동.

### 5-3. 필요 시 직접 닫기 / 외부 제어

`mountEmbeddedEditorModal`은 `designer-tiptap`이 내부적으로 호출하므로 일반 사용자는 건드릴 필요가 없지만, 모달 단독 사용을 원할 경우 `@form-js-designer/designer-editor-host/embedded`를 직접 마운트할 수 있습니다(고급 시나리오).

---

## 6. 스키마 형식

`insertFormJsBlock(schema, formId?)`의 `schema`는 **form-js JSON 그대로**입니다. 예:

```json
{
  "schemaVersion": 16,
  "components": [
    { "type": "textfield", "key": "name", "label": "이름" },
    { "type": "checkbox",  "key": "agree", "label": "약관 동의" }
  ],
  "type": "default"
}
```

Tabs / Card / Modal 같은 form-js-designer 확장 컴포넌트도 동일한 schema 안에 그대로 넣으면 viewer/디자이너 양쪽 모두 인식합니다.

---

## 7. 직렬화(Serialization)

```ts
const html = editor.getHTML();
// <div data-form-id="modal-1" data-schema='{"components":[...]}' />

editor.commands.setContent(html); // 라운드트립 OK
```

`data-schema` 속성은 JSON.stringify된 결과이므로 HTML 한 번에 저장/복원할 수 있습니다. 별도 sidecar 저장소 불필요.

---

## 8. 모달 스타일 커스터마이징

`./editor.css` 안의 모달은 CSS 변수로 색을 바꿀 수 있습니다.

```css
:root {
  --fjd-modal-bg: #fff;
  --fjd-modal-border: #e5e7eb;
  --fjd-modal-header-bg: #f9fafb;
  --fjd-modal-title-color: #111827;
  --fjd-modal-primary-bg: #2563eb;
  --fjd-modal-primary-fg: #ffffff;
  --fjd-modal-primary-bg-hover: #1d4ed8;
}
```

---

## 9. 트러블슈팅

| 증상 | 원인 / 해결 |
|------|------------|
| 블록은 보이는데 폼 입력 칸이 비어있음 / 높이 0 | `@form-js-designer/designer-tiptap/styles` 미import. form-js-base.css가 빠지면 drop container 높이가 0이 됨. |
| 더블클릭해도 모달이 안 뜸 | `withDesigner` 미적용 또는 `./editor.css` 미import. v0.1 노드만 등록한 상태. |
| 모달이 떴는데 사이드패널이 회색 박스 | `./editor.css` 미import. host App layout(3-column) CSS가 함께 들어가야 정상. |
| `npm install`이 401 | `.npmrc`의 `_authToken` 또는 `$GITHUB_PAT` 미설정. `read:packages` scope 확인. |
| `vite` dev에서 `process is not defined` | form-js 내부에서 `process.env`를 참조 — `define: { 'process.env.NODE_ENV': JSON.stringify('development') }` 추가. |
| Yjs 협업 시 두 명이 동시에 디자이너를 열어도 충돌 | 모달은 각 클라이언트별로 single-instance지만 schema 자체는 Yjs로 동기화. 마지막 저장이 우선(LWW). |

---

## 10. 호환성

| `@form-js-designer/designer-tiptap` | bundled `@form-js-designer/designer-editor-host` |
|--------------------------------------|---------------------------------------------------|
| `0.1.x`                              | (독립 — viewer-only, host 불필요)                  |
| `0.2.x`                              | `0.1.x` (tsup `noExternal`로 빌드 타임 인라이닝)   |

> `designer-editor-host`는 비공개 워크스페이스 패키지(`"private": true`)입니다.
> 소스가 published designer-tiptap dist에 인라이닝되어 들어가므로 **런타임 peer 의존성이 없습니다**.
> 포크해서 host를 진짜 peer로 분리하려면 `package.json`을 `"private": false`로 바꾸고 tsup `external` 목록을 조정하세요.

---

## 11. 로드맵

| 버전 | 범위 |
|------|------|
| v0.1 | viewer-only NodeView, `insertFormJsBlock` 명령, GitHub Packages 게시 |
| v0.2 | `./editor` 엔트리, `withDesigner` HOC, 풀스크린 임베디드 디자이너 모달, single-instance + auto-save 라이프사이클 |
| v0.3 (예정) | React wrapper, VS Code webview 변형, **Tiptap v3** ([업그레이드 절차](./UPGRADE-tiptap-v3.md)) |
| v1.0 (예정) | 공개 npm, OSS 라이선스, Yjs 협업 가이드 |

---

## 12. 로컬에서 데모 실행

이 패키지에는 vanilla(html + Vite) 데모가 포함되어 있습니다.

```sh
cd packages/designer-tiptap
npm install
npm run dev
# → http://localhost:5173
```

데모에는 다음이 포함됩니다.
- Tiptap rich-text 툴바
- `+ Simple / + Tabs / + Modal form` 버튼으로 schema seed 삽입
- `Dump HTML` / `Reload from HTML`로 직렬화 라운드트립 확인
- 삽입된 블록을 더블클릭하면 디자이너 모달

---

## 13. Yjs 협업

`schema` 속성이 그냥 JSON이므로 `@tiptap/extension-collaboration`을 추가하면 별도 변경 없이 문서 단위 협업이 됩니다. 다만 위 트러블슈팅에 적은 것처럼 동시에 같은 블록을 편집할 때는 LWW 동작을 합니다.

---

## License

UNLICENSED (private). 설계 문서: `docs/superpowers/specs/2026-04-26-designer-tiptap-design.md`.
