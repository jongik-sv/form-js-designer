# @form-js-designer/designer-notion-adapter

form-js viewer/editor를 **Notion 스타일 블록 에디터**(BlockNote 등)에 "form-js 블록"으로 마운트하기 위한 어댑터 라이브러리.

플랫폼 SDK 없이 임의 DOM에 마운트하는 **generic 어댑터**, BlockNote custom block 계약을 따르는 **blocknote 어댑터(stub)**, 호스트 테마 자동 동기화, JSON 스키마 직접 편집 UI를 함께 제공합니다.

---

## 패키지 위치

```
packages/
├── designer-core/
├── designer-editor-host/
├── designer-vscode-extension/      # CSS 자산(form-js-base.css 등) 원본
└── designer-notion-adapter/        ← 본 패키지
```

`designer-vscode-extension/media`의 form-js CSS 자산을 빌드 시점에 `dist/css/`로 복사하여 재사용합니다.

---

## 주요 기능

| 기능 | 진입점 | 설명 |
|---|---|---|
| Vanilla 마운트 | `genericMount` | 임의 DOM에 form-js viewer를 마운트하는 fallback 어댑터 |
| BlockNote 어댑터 | `blockNotePlugin`, `createFormJsBlockSpec`, `createFormJsInsertSpec` | BlockNote v0.x custom block spec 팩토리 (현재 stub) |
| 스키마 편집 UI | `SchemaEditor` | Preact 기반 JSON 직접 편집 textarea + 실시간 검증 |
| 테마 동기화 | `themeSync` | 호스트의 light/dark 속성을 감지해 `theme-light`/`theme-dark` 클래스 부여 |

---

## 설치

### 사전 요구사항

| 항목 | 버전 | 비고 |
|---|---|---|
| Node.js | `>=20` | `package.json` engines 강제 |
| 패키지 매니저 | pnpm 권장 | 모노레포는 pnpm workspace 기준 |
| OS | macOS / Linux / Windows | E2E는 Playwright 브라우저 필요 |

### 1) 모노레포 내부 사용 (현재 권장)

본 패키지는 `private: true`로 npm 레지스트리에 게시되지 않습니다. **`form-js-designer` 모노레포를 클론한 뒤 워크스페이스로 사용**하는 것이 표준 경로입니다.

```bash
# 1. 모노레포 클론
git clone <repo-url> form-js-designer
cd form-js-designer

# 2. 의존성 설치 (루트 1회)
pnpm install

# 3. 본 패키지 빌드
pnpm --filter @form-js-designer/designer-notion-adapter build

# 또는 디렉토리로 직접 이동
cd packages/designer-notion-adapter
pnpm build
```

다른 워크스페이스 패키지에서 의존:

```jsonc
// packages/your-package/package.json
{
  "dependencies": {
    "@form-js-designer/designer-notion-adapter": "workspace:*"
  }
}
```

### 2) 빌드 스크립트

```bash
pnpm build              # CSS 복사 + esbuild ESM/CJS 듀얼 빌드 (sample/main.js 포함)
pnpm build:css          # CSS 자산만 dist/css/ 로 복사
pnpm build:bundle       # esbuild 만 실행

pnpm typecheck          # tsc --noEmit (no emit, 타입만 검사)
```

> 첫 빌드 전에 **반드시 `designer-vscode-extension`의 `media/form-js-base.css` 가 존재**해야 합니다. 누락되면 `copy-css.mjs`가 빌드를 fail-fast로 종료합니다.

### 3) 외부 프로젝트(모노레포 밖)에서 쓰기

private 패키지이므로 임시로 사용하려면 다음 중 하나를 택합니다.

```bash
# (a) 빌드 후 tarball 생성 → 외부 프로젝트에서 설치
cd packages/designer-notion-adapter
pnpm build
npm pack
# → form-js-designer-designer-notion-adapter-0.1.0.tgz

cd /path/to/external-project
pnpm add /abs/path/to/form-js-designer-designer-notion-adapter-0.1.0.tgz

# (b) pnpm link
cd packages/designer-notion-adapter && pnpm link --global
cd /path/to/external-project && pnpm link --global @form-js-designer/designer-notion-adapter

# (c) file: 의존
# external-project/package.json
# "@form-js-designer/designer-notion-adapter": "file:../form-js-designer/packages/designer-notion-adapter"
```

### 4) 런타임 의존성

설치 시 자동으로 함께 설치됩니다.

```jsonc
"dependencies": {
  "@bpmn-io/form-js-viewer": "^1.21.2",
  "preact": "^10.19.3"
}
```

소비 측에서 React를 쓰는 경우 별도 설치 없이도 동작합니다(빌드 시 `react`/`react-dom`이 `preact/compat`으로 alias). 단, **소비 측 번들러도 동일한 alias를 적용**하면 Preact 단일 인스턴스를 보장할 수 있어 권장합니다.

```js
// 소비 측 esbuild/vite 예시
{
  alias: {
    react: 'preact/compat',
    'react-dom': 'preact/compat',
    'react-dom/client': 'preact/compat/client',
  },
}
```

### 5) CSS 적용

런타임에 form-js viewer가 정상 표시되려면 **본 패키지가 export 하는 CSS를 함께 import** 해야 합니다.

```ts
// 필수 — 누락 시 viewer 컨테이너 높이=0
import '@form-js-designer/designer-notion-adapter/css/form-js-base.css';

// 권장 (테마/블록 스타일)
import '@form-js-designer/designer-notion-adapter/css/form-js.css';
import '@form-js-designer/designer-notion-adapter/css/form-js-block.css';
import '@form-js-designer/designer-notion-adapter/css/form-js-components.css';
```

CSS-in-JS/CSS 모듈을 쓰지 않는 환경(예: 정적 HTML)에서는 `<link rel="stylesheet">`로 직접 참조해도 됩니다.

```html
<link rel="stylesheet" href="/path/to/dist/css/form-js-base.css" />
<link rel="stylesheet" href="/path/to/dist/css/form-js.css" />
```

### 6) 설치 확인

```bash
# 빌드 산출물 확인
ls dist/                # index.js / index.cjs / css/
ls dist/css/            # form-js-base.css 가 반드시 존재해야 함

# 단위 테스트
pnpm test:unit

# 샘플 페이지 (브라우저로 확인)
open sample/index.html  # 또는 npx serve sample
```

샘플 페이지에서 "+ 블록 삽입" 버튼을 누르면 form-js viewer가 렌더되어야 합니다. 렌더되지 않으면 (1) `dist/css/form-js-base.css` 존재 여부, (2) 콘솔의 Preact 중복 인스턴스 경고, (3) JSON 스키마 파싱 에러 배너를 차례로 확인하세요.

---

## 빌드 산출물

```
dist/
├── index.js          # ESM
├── index.cjs         # CJS
├── index.{js,cjs}.map
└── css/
    ├── form-js-base.css       # 필수 (누락 시 drop container 높이=0)
    ├── form-js.css
    ├── form-js-block.css
    ├── form-js-components.css
    └── form-js-editor.css
```

> ⚠️ `scripts/copy-css.mjs`는 `form-js-base.css`가 없으면 **빌드를 fail-fast 종료**합니다. form-js의 알려진 함정(베이스 CSS 누락 시 viewer 컨테이너 높이가 0이 되어 사용자가 입력할 수 없게 됨)을 빌드 단계에서 차단합니다.

---

## 사용 예시

### 1. Generic Vanilla 마운트 (PoC / fallback)

```ts
import { genericMount } from '@form-js-designer/designer-notion-adapter';
import '@form-js-designer/designer-notion-adapter/css/form-js-base.css';
import '@form-js-designer/designer-notion-adapter/css/form-js.css';

const container = document.getElementById('my-form')!;
const schemaJson = JSON.stringify({
  type: 'default',
  components: [
    { type: 'textfield', key: 'name',  label: '이름' },
    { type: 'textfield', key: 'email', label: '이메일' },
  ],
});

const unmount = await genericMount(container, schemaJson);

// 컴포넌트가 제거될 때
unmount();   // viewer.destroy() + themeSync disconnect + container.innerHTML = ''
```

JSON 파싱 실패 시 `createForm`은 호출되지 않고 에러 배너 DOM만 렌더됩니다. 반환된 `unmount` 함수는 그래도 안전하게 호출 가능합니다.

### 2. BlockNote 커스텀 블록 (stub)

```ts
import {
  blockNotePlugin,
  createFormJsBlockSpec,
  createFormJsInsertSpec,
} from '@form-js-designer/designer-notion-adapter';

// BlockNote editor 생성 시
const blockSpec = createFormJsBlockSpec();           // type: 'formJs'
const insertSpec = createFormJsInsertSpec(editor);   // "+" 메뉴 → "form-js"
```

> **현재 상태**: `blocknote.ts`는 인터페이스만 정의된 **stub** 입니다. 대상 BlockNote 버전이 확정되면 `createReactBlockSpec`/실제 editor API와 연결할 예정입니다 (TSK-03-01 참조).

### 3. SchemaEditor (Preact)

```tsx
import { h, render } from 'preact';
import { SchemaEditor } from '@form-js-designer/designer-notion-adapter';

render(
  <SchemaEditor
    initialValue={JSON.stringify({ components: [] })}
    onSave={(newJson) => console.log('saved:', newJson)}
    onCancel={() => console.log('canceled')}
  />,
  document.getElementById('editor-panel')!,
);
```

- `onSave`는 `JSON.parse` 검증을 통과한 경우에만 호출됩니다.
- 잘못된 JSON 입력 시 `[role="alert"]` 에러 메시지가 표시되고 콜백은 발생하지 않습니다.

### 4. 테마 동기화

```ts
import { themeSync } from '@form-js-designer/designer-notion-adapter';

const disconnect = themeSync(myContainer);
// disconnect() 호출 시 MutationObserver 해제
```

감지 우선순위:

1. `document.body[data-theme="light|dark"]`
2. `document.body[data-color-scheme="light|dark"]`
3. `document.body[data-vscode-theme-kind="vscode-dark|vscode-high-contrast|vscode-light"]`
4. `document.body.classList`에 `dark`/`light` 포함 여부

감지된 테마는 컨테이너에 `theme-light` 또는 `theme-dark` 클래스로 적용됩니다.

---

## 샘플 페이지 실행

`sample/`은 빌드 없이 정적 HTML로 동작하는 PoC 데모입니다.

```bash
pnpm build           # sample/main.js 생성
# 임의의 정적 서버
npx serve sample
# 또는 file:// 직접 열기 (build 후)
open sample/index.html
```

샘플에서 확인 가능한 시나리오:

- ➕ **블록 삽입** — `genericMount`로 form-js viewer 새 블록 추가
- ✏️ **스키마 편집** — textarea에서 JSON 직접 수정 → 저장 시 첫 블록 재렌더
- 🌗 **테마 토글** — `data-theme` 속성 토글 → `themeSync`가 자동으로 라이트/다크 적용

---

## 테스트

```bash
pnpm test:unit              # vitest (jsdom + Preact)
pnpm test:unit:watch
pnpm test:coverage          # v8 coverage
pnpm test:e2e:smoke         # Playwright (sample/ 페이지 대상)
```

| 파일 | 대상 | 종류 |
|---|---|---|
| `test/unit/FormJsViewerBlock.test.tsx` | `genericMount` + `themeSync` 통합 | unit (jsdom) |
| `test/unit/SchemaEditor.test.tsx` | `SchemaEditor` 동작 | unit (jsdom) |
| `test/e2e/smoke.spec.ts` | 샘플 페이지 시작-삽입-편집 흐름 | E2E (Playwright) |
| `test/e2e/viewer.spec.ts` | viewer 마운트 + 테마 전환 | E2E (Playwright) |

E2E 진입 규칙: **"블록 삽입" 버튼 클릭으로 reach** 하는 경로만 사용합니다. 초기 진입에 한해 `file://` URL 직접 로드를 허용합니다(`design.md "진입점"` 예외).

---

## 설계 결정 요약

| 결정 | 근거 |
|---|---|
| `react`/`react-dom` → `preact/compat` esbuild alias | React 호스트와의 인스턴스 충돌 방지, Preact 단일 인스턴스 보장 |
| CSS 복사 스크립트가 `form-js-base.css` 누락 시 fail-fast | drop container 높이=0 함정을 빌드 단계에서 차단 |
| ESM + CJS 듀얼 빌드 | Notion-style 호스트(번들러 다양)와 노드 환경 모두 지원 |
| `genericMount` JSON 검증 실패 시 `createForm` 미호출 | 잘못된 스키마로 viewer 내부가 깨지는 것 방지, 에러 배너로 사용자 피드백 |
| `themeSync` MutationObserver | 폴링 없이 호스트 테마 속성 변경에 즉시 반응 |
| BlockNote 어댑터 stub 유지 | 대상 BlockNote 버전 확정 전까지는 인터페이스만 노출, generic으로 fallback |

---

## 의존성

```jsonc
"dependencies": {
  "@bpmn-io/form-js-viewer": "^1.21.2",
  "preact": "^10.19.3"
},
"overrides": {
  "preact": "10.29.x"          // Preact 단일 인스턴스 강제
}
```

런타임은 `@bpmn-io/form-js-viewer`와 Preact만 요구합니다. BlockNote/Notion SDK는 stub 단계이므로 peer dependency로 강제하지 않습니다.

---

## 알려진 제약

- **BlockNote 어댑터는 stub** — `createFormJsBlockSpec`은 비동기로 `genericMount`를 호출하는 PoC 형태이며 BlockNote의 동기 `render` 계약을 완전히 준수하지 않습니다. 실제 SDK 연동은 TSK-03-01 이후.
- **VSCode 웹뷰 CSP**(`unsafe-eval` 미허용) — 본 패키지를 VSCode extension에 사용할 때는 `designer-vscode-extension`의 esbuild 설정(Ajv lazy-init, `process` 폴리필 banner 등)을 준용해야 합니다.
- **form-js editor host** — 본 패키지는 viewer 전용입니다. editor(palette/properties panel)를 띄우려면 `designer-editor-host`와 함께 사용하고 한국어 `name`, vite `define.global` 등 추가 설정이 필요합니다.

---

## 라이선스

UNLICENSED (private workspace)
