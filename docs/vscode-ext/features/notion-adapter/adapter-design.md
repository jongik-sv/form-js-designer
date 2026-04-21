# 어댑터 설계 문서 — form-js × Notion-style 뷰어

> 작성 태스크: TSK-03-02
> 입력: TSK-03-01 `platform-identification.md` (플랫폼 = BlockNote v0.x)
> 상태: 설계 확정 (PoC 구현은 TSK-03-03)

---

## 1. 목적 및 범위

본 문서는 사내 Notion-style 마크다운 뷰어에 form-js viewer/editor를 custom block으로 삽입하기 위한 어댑터 계층(`adapters/notion-viewer/`)의 **설계·번들·CSS 격리 방안**을 기록한다.

- **플랫폼**: BlockNote v0.x (`createReactBlockSpec` + `BlockNoteSchema.create`)
- **코어 재사용**: `@form-js-designer/designer-core`, `designer-runtime`, `designer-components` + `@bpmn-io/form-js-viewer|editor`
- **설계 계약**: `adapters/shared/FormJsBlockHost.ts` (호스트 비종속 인터페이스)

---

## 2. Viewer 흐름

### 2-1. 사용자 진입 경로

1. 사내 뷰어 페이지 오픈
2. 본문 영역에서 `/form-js` 슬래시 명령 입력 → 블록 메뉴에서 **form-js** 항목 선택 (또는 `+` 버튼 → Embed 그룹 → form-js)
3. 빈 form-js 블록이 본문에 삽입됨 — `.form-js-block` 컨테이너 DOM 등장
4. BlockNote가 `FormJsBlock.render({ block })` 콜백 호출
5. `createNotionAdapter().mount(root, schema, opts)` 실행 → `mountViewer(root, schema, opts)` 위임
6. `@bpmn-io/form-js-viewer`의 `createForm({ container, schema, additionalModules, properties: { readOnly: true } })` 호출
7. form-js viewer가 `.form-js-block` 내부에 렌더됨. 셀렉터: `.fjs-form` 또는 `[role="form"]`

### 2-2. Viewer 마운트 코어 (`mountViewer.ts`)

- 현재 `src/markdown/preview.ts`의 `mountViewers` 루프 1회분을 호스트 비종속으로 추출
- `additionalModules: [DesignerContainerModule, customComponentsModule]` 조합 유지
- LRU 캐시 cap=20 — 어댑터 모듈 스코프에서 공유 (VSCode preview용과 별도)
- 에러 시 `.form-js-block--error` 배너 렌더 (`renderErrorBanner` 재사용)
- `MountOpts.readOnly`가 true이면 `properties: { readOnly: true }` 적용

### 2-3. testBridge 발신 책임 이동

기존 `src/markdown/preview.ts`의 `mountViewers`는 `FORM_JS_TEST_BRIDGE === true` 시 마운트 완료 후 `test-mount-complete` 메시지를 `acquireVsCodeApi().postMessage()`로 발송한다.

이 책임은 **VSCode host 어댑터(`preview.ts` thin wrapper)에 유지**된다. `mountViewer.ts` 코어는 host-agnostic이므로 testBridge 로직을 포함하지 않는다. Notion 어댑터는 `test-mount-complete` 메시지를 발송하지 않는다. (TSK-01-04 회귀 방지)

### 2-4. VSCode 호스트 어댑터 매핑표

| 기존 위치 | 추출 후 위치 | 동작 |
|-----------|-------------|------|
| `preview.ts:mountViewers` | `adapters/shared/mountViewer.ts` | viewer 마운트 코어 |
| `customEditor.ts:saveSchemaController` | `adapters/shared/mountEditor.ts` | editor 마운트 + 저장 |
| `preview.ts` (유지) | VSCode host 어댑터 (thin wrapper) | testBridge 발신 유지 |

### 2-5. 검증 시나리오 (TSK-03-04 E2E 기준)

- Playwright → 사내 뷰어 PoC 환경 접속
- `/form-js` 슬래시 명령 입력 → 블록 메뉴 항목 표시 assert
- 항목 클릭 → 본문에 `.form-js-block` DOM 등장 assert
- form-js viewer `[role="form"]` 또는 `.fjs-form` 렌더 assert

---

## 3. 편집(Edit) 흐름

### 3-1. 편집 진입

1. Viewer 렌더 상태에서 우상단 ✏️ 버튼 클릭 (편집 지원 호스트인 경우)
2. `FormJsHandle.requestEdit(handler)` 호출 — modal/drawer 형태로 editor 패널 오픈
3. `mountEditor(root, schema, opts, onSave)` 실행 → `@bpmn-io/form-js-editor` 인스턴스 생성
4. 저장 시 `onSave(newSchema)` → `applySchemaUpdate(newSchema)` → viewer 즉시 갱신 + 호스트 저장소 반영

### 3-2. 편집 지원 결정 매트릭스 (v1)

| 호스트 | 편집 지원 | 결정 근거 |
|--------|----------|----------|
| BlockNote v0.x | viewer + modal-edit | `block.props` 갱신 API 존재 |
| Tiptap | viewer + inline-edit (조건부) | `setAttributes` API 버전별 확인 필요 |
| Lexical | viewer-only (v1) | `SerializedLexicalNode` 변환 비용 큼 |
| 기타 / 자체 구현 | viewer-only | API 미확인 시 fallback |

**v1 fallback**: 호스트 미식별 또는 `readOnly: true` 전달 시 viewer-only 강제.

### 3-3. Editor 마운트 코어 (`mountEditor.ts`)

- `@bpmn-io/form-js-editor` 인스턴스 생성 + 저장 콜백 `onSave(schema)` 위임
- VSCode `customEditor.ts:saveSchemaController`와 Notion 어댑터 모달이 동일 함수 사용
- `applySchemaUpdate` 호출 시 viewer LRU 캐시를 통해 재마운트 없이 갱신

---

## 4. 번들 전략

### 4-1. 멀티 entry 구성 (`esbuild.config.mjs` 수정)

| Entry | 출력 경로 | 형식 | 비고 |
|-------|----------|------|------|
| `src/adapters/notion-viewer/index.ts` | `dist/notion-adapter/index.js` | ESM | 신규 |
| `src/adapters/notion-viewer/index.ts` | `dist/notion-adapter/index.umd.js` | IIFE/UMD | 신규 |
| extension host (기존) | `dist/extension.js` | CJS | 유지 |
| webview (기존) | `dist/webview/preview.js` | IIFE | 유지 |

### 4-2. Preact 번들링 정책

- **preact는 bundle 내 포함** (external 금지) — VSCode 웹뷰와 동일 정책
- esbuild alias: `{ react: 'preact/compat', 'react-dom': 'preact/compat' }`
- ShadowRoot 격리 내에서만 preact 인스턴스 활성화 → 호스트 React 18과 충돌 방지

### 4-3. `.vscodeignore` 갱신

`.vsix` 번들에 `dist/notion-adapter/**`를 포함하지 않도록:

```
dist/notion-adapter/**
```

### 4-4. CSS 처리 (esbuild loader)

```js
// esbuild.config.mjs 추가 설정
loader: { '.css': 'text' }
```

form-js base.css를 문자열로 import → `isolateCss` 유틸이 `<style>` inline 주입.

---

## 5. CSS 격리 방안

### 5-1. 격리 전략 결정 트리

```
MountOpts.cssIsolation?
├── 'shadow' (기본값)
│   ├── root.attachShadow({ mode: 'open' })
│   ├── form-js base.css를 string-import → <style> inline 주입
│   └── ShadowRoot 안에서 createForm() 호출
├── 'scoped'
│   ├── 모든 form-js CSS 셀렉터에 .form-js-block prefix 적용
│   └── BlockNote 등 ShadowRoot + React 이벤트 충돌 플랫폼 fallback
└── 'none'
    └── 호스트가 CSS 책임 (placeholder)
```

### 5-2. Shadow 기본값 이유

`form-js-base.css`의 `*`/`html`/`body` global 셀렉터가 호스트 본문 텍스트를 침범할 위험이 있음 (프로젝트 알려진 이슈). ShadowRoot가 가장 강한 격리이나 BlockNote v0.x에서 React 이벤트 위임이 깨질 가능성이 있으므로 **BlockNote 전용 fallback은 scoped**.

### 5-3. form-js base.css 인라인 주입

```ts
// css-isolation.ts
import baseCss from '@bpmn-io/form-js-viewer/dist/assets/form-js-base.css?raw';

export function isolateCss(root: HTMLElement, mode: 'shadow' | 'scoped' | 'none') {
  if (mode === 'shadow') {
    const shadow = root.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = baseCss;
    shadow.appendChild(style);
    return shadow;
  }
  // scoped / none: root 그대로 반환
  return root;
}
```

---

## 6. 파일 계획 요약

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `docs/vscode-ext/features/notion-adapter/adapter-design.md` | 본 문서 (acceptance 산출물) | 신규 |
| `docs/vscode-ext/features/notion-adapter/contract.md` | 호스트 비종속 계약 명세 | 신규 |
| `docs/vscode-ext/features/notion-adapter/platform-matrix.md` | 후보 플랫폼 비교 매트릭스 | 신규 |
| `packages/designer-vscode-extension/src/adapters/shared/FormJsBlockHost.ts` | 인터페이스 (타입 only) | 신규 (TSK-03-03) |
| `packages/designer-vscode-extension/src/adapters/shared/mountViewer.ts` | viewer 마운트 코어 | 신규 (TSK-03-03) |
| `packages/designer-vscode-extension/src/adapters/shared/mountEditor.ts` | editor 마운트 코어 | 신규 (TSK-03-03) |
| `packages/designer-vscode-extension/src/adapters/notion-viewer/index.ts` | BlockNote 어댑터 entry | 신규 (TSK-03-03) |
| `packages/designer-vscode-extension/src/adapters/notion-viewer/blockMenu.ts` | 블록 메뉴 메타데이터 export | 신규 (TSK-03-03) |
| `packages/designer-vscode-extension/src/adapters/notion-viewer/css-isolation.ts` | CSS 격리 유틸 | 신규 (TSK-03-03) |
| `packages/designer-vscode-extension/esbuild.config.mjs` | 멀티 entry 추가 | 수정 (TSK-03-03) |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | thin wrapper로 축소 | 수정 (TSK-03-03) |

> `.ts` 파일 코드 생성은 TSK-03-03(PoC)에서 수행. 본 문서는 시그니처와 계약을 확정한다.

---

## 7. 데이터 흐름

```
호스트 블록 메뉴
  └─ /form-js 슬래시 명령 → BlockNote "form-js" 블록 삽입
        └─ FormJsBlock.render({ block })
              └─ createNotionAdapter().mount(root, schema, opts)
                    ├─ mountViewer(root, schema, opts)
                    │     └─ createForm({ container, schema, additionalModules, readOnly })
                    │           └─ form-js viewer 렌더 (.fjs-form / .form-js-block)
                    └─ requestEdit 핸들러 등록 (✏️ 버튼)
                          └─ mountEditor(modal-root, schema, opts, onSave)
                                └─ form-js-editor 인스턴스 생성
                                      └─ onSave(newSchema)
                                            ├─ applySchemaUpdate(viewer, newSchema)
                                            └─ BlockNote block.props.schema = JSON.stringify(newSchema)
```

---

## 8. 위험 요소 요약

| 위험 | 레벨 | 완화 방안 |
|------|------|----------|
| preact ↔ React 충돌 | HIGH | ShadowRoot 격리 + preact internal bundle |
| form-js CSS 호스트 침범 | HIGH | shadow 기본값 + base.css inline 주입 |
| TSK-03-01 미완 시 플랫폼 결정 차단 | HIGH | contract.md/mountViewer 플랫폼 무관 확정으로 흡수 |
| 번들 크기 (.vsix 5MB 한도) | MEDIUM | .vscodeignore에 `dist/notion-adapter/**` 추가 |
| schema 저장 형식 불일치 | MEDIUM | 호스트 entry에서 변환 책임 |
| single-editor lock 의미 차이 | MEDIUM | 블록당 독립 lock — contract.md에 명시 |

---

*본 문서는 TSK-03-02의 acceptance 산출물이다. PoC 구현(TSK-03-03)과 E2E 검증(TSK-03-04)이 이어진다.*
