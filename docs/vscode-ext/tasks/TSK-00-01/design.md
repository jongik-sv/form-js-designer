# TSK-00-01: 패키지 스캐폴드 + VSCode manifest + esbuild — 설계

## 요구사항 확인

`packages/designer-vscode-extension/` 패키지를 신규 생성하여 VSCode Extension manifest(`activationEvents`, `contributes.markdown.*`, `contributes.customEditors`)와 npm 패키지 메타를 단일 `package.json`에 통합 선언한다. esbuild로 이중 번들 타깃(`dist/extension.cjs` — Node18/CJS, `dist/webview/*.js` — browser/IIFE)을 빌드하며, `tsconfig.json`을 기존 패키지 규칙(ES2022, Preact JSX)에 맞춰 구성한다. `preact`, `@bpmn-io/form-js-viewer`, `@bpmn-io/form-js-editor`는 번들 내부 포함(external 금지), `vscode`만 external 처리한다.

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: TSK 자체가 이 패키지를 신규 스캐폴드하는 것이 목적이며, 모노레포 `workspaces: ["packages/*"]`에 의해 자동 포함된다.

## 구현 방향

신규 패키지 디렉토리 `packages/designer-vscode-extension/`를 생성하고, (1) VSCode manifest + npm 메타를 결합한 `package.json`, (2) 기존 패키지 규칙과 일치하는 `tsconfig.json`, (3) node/browser 이중 번들을 생성하는 `esbuild.config.mjs`, (4) 진입점 스텁 소스 파일 3개(`src/extension.ts`, `src/markdown/preview.ts`, `src/editor/customEditor.ts`), (5) 빌드 후 CSS를 `media/`로 복사하는 `scripts/copy-media.mjs`를 작성한다. 루트 `scripts/ci/assert-single-preact.mjs`는 이미 존재하므로 그대로 사용한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/package.json` | VSCode Extension manifest + npm 패키지 메타 통합. `activationEvents`, `contributes.markdown.*`, `contributes.customEditors`, `main`, `scripts(build/typecheck/lint/test:unit)` 포함 | 신규 |
| `packages/designer-vscode-extension/tsconfig.json` | TypeScript 컴파일 옵션. 기존 패키지(ES2022, Preact JSX, strict, noEmit)와 동일 설정. extension host용 `lib: ["ES2022"]` + webview용 DOM 포함. `@types/vscode` 추가 | 신규 |
| `packages/designer-vscode-extension/esbuild.config.mjs` | esbuild 이중 타깃 빌드 스크립트. Entry 1: `src/extension.ts` → `dist/extension.cjs`(node18, cjs, external: vscode). Entry 2: `src/markdown/preview.ts`, `src/editor/customEditor.ts` → `dist/webview/`(browser, iife, es2020) | 신규 |
| `packages/designer-vscode-extension/scripts/copy-media.mjs` | 빌드 후 CSS 파일을 `media/`로 복사. 후보 경로를 순서대로 탐색하며 미발견 시 경고만 출력(exit 0 유지) | 신규 |
| `packages/designer-vscode-extension/src/extension.ts` | VSCode extension 진입점 스텁. `activate(ctx)` / `deactivate()` export. 이후 Task가 채울 Custom Editor 등록 플레이스홀더 포함 | 신규 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | webview preview 스크립트 스텁. `dist/webview/preview.js`로 번들되는 브라우저 컨텍스트 진입점 | 신규 |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | Custom Editor webview 스텁. `dist/webview/customEditor.js`로 번들 | 신규 |
| `packages/designer-vscode-extension/media/.gitkeep` | `media/` 디렉토리 유지용 빈 파일. 빌드 시 CSS가 이 디렉토리에 복사됨 | 신규 |
| `packages/designer-vscode-extension/.vscodeignore` | `.vsix` 패키징 제외 목록. `src/`, `esbuild.config.mjs`, `node_modules/`, `*.map` 등 제외 | 신규 |

## 진입점 (Entry Points)

N/A — domain이 `infra`인 인프라 Task로 UI 진입점 없음.

## 주요 구조

### `package.json` — VSCode Manifest 겸 npm 메타

```json
{
  "name": "@form-js-designer/designer-vscode-extension",
  "displayName": "Form.js Designer",
  "version": "0.1.0",
  "publisher": "form-js-designer",
  "engines": { "vscode": "^1.90.0" },
  "main": "./dist/extension.cjs",
  "activationEvents": ["onLanguage:markdown"],
  "contributes": {
    "markdown": {
      "markdownItPlugins": true,
      "previewScripts": ["./dist/webview/preview.js"],
      "previewStyles": ["./media/form-js.css", "./media/form-js-base.css"]
    },
    "customEditors": [...]
  }
}
```

### `esbuild.config.mjs` — 이중 타깃 빌드

두 개의 `build()` 호출을 `Promise.all`로 병렬 실행:

1. **Extension host**: `platform:'node'`, `target:'node18'`, `format:'cjs'`, `external:['vscode']`, `outfile:'dist/extension.cjs'`
2. **Webview**: `platform:'browser'`, `format:'iife'`, `target:'es2020'`, entryPoints 2개, `outdir:'dist/webview'`

두 빌드 모두 `bundle:true`(preact/form-js 내부 포함), `sourcemap:'linked'`, `minify: process.env.NODE_ENV === 'production'`.

### `scripts/copy-media.mjs` — CSS 복사

후보 경로 배열(`node_modules/@bpmn-io/form-js/dist/`, `node_modules/@bpmn-io/form-js-viewer/dist/`, `node_modules/@bpmn-io/form-js-editor/dist/`)을 순서대로 탐색하여 `form-js.css`, `form-js-base.css`를 `media/`로 복사. 파일 미발견 시 `console.warn` 후 계속(exit 0 유지).

### `.vscodeignore` — 패키징 제외 규칙

제외: `src/`, `esbuild.config.mjs`, `scripts/`, `*.ts`, `!*.d.ts`, `tsconfig.json`, `node_modules/`, `.gitignore`, `.eslintrc*`, `vitest.config.*`, `test/`

포함: `dist/`, `media/`, `package.json`, `README.md`

## 데이터 흐름

```
src/**/*.ts → esbuild 번들 → dist/extension.cjs (node18/CJS)
                           → dist/webview/preview.js (browser/IIFE)
                           → dist/webview/customEditor.js (browser/IIFE)
node_modules CSS → copy-media.mjs → media/
dist/ + media/ → vsce package → .vsix 아카이브
```

## 설계 결정

- **결정**: `tsconfig.json`에 `"lib": ["ES2022", "DOM", "DOM.Iterable"]` 모두 포함
  - **대안**: extension host용 tsconfig + webview용 tsconfig 분리
  - **근거**: 현재 스텁 수준에서는 DOM 타입 충돌 없음. 단일 tsconfig로 `tsc --noEmit` 1회 실행으로 전체 검증 가능해 CI 단순화. 후속 Task에서 충돌 발생 시 분리 리팩토링.

- **결정**: `package.json`의 `publisher` 필드에 `"form-js-designer"`로 고정
  - **근거**: `vsce package`를 추가 플래그 없이 실행 가능하여 CI 스크립트 단순화.

- **결정**: `esbuild.config.mjs`에서 `minify` 조건을 `process.env.NODE_ENV === 'production'`으로 분기
  - **근거**: 개발 중 sourcemap + non-minify로 디버깅 편의성 확보, CI는 `NODE_ENV=production`으로 크기 최적화.

## 선행 조건

- 루트 `package.json`의 `workspaces: ["packages/*"]` 이미 설정됨 → 자동 인식
- `@bpmn-io/form-js-viewer`, `@bpmn-io/form-js-editor`가 루트 `dependencies`에 이미 선언됨 (`^1.21.2`)
- `scripts/ci/assert-single-preact.mjs` 이미 존재

## 리스크

- **HIGH**: `@bpmn-io/form-js/dist/` CSS 경로 불확실 — `copy-media.mjs`에서 복수 후보 경로 방어 탐색. `form-js-base.css` 누락 시 webview container h=0 버그 발생(프로젝트 메모리 참조).
- **MEDIUM**: `vsce package` 실행 시 `node_modules/` 포함으로 `.vsix` 크기 폭발 — `.vscodeignore`에 명시 제외 + `vsce package --no-dependencies` 플래그.
- **MEDIUM**: `preact` single-instance 게이트 실패 — 루트 `overrides: { "preact": "10.29.x" }` 이미 적용됨.
- **LOW**: TypeScript `lib`에 DOM 타입 노출 — 스텁 수준에서 무해, 후속 Task에서 재검토.

## QA 체크리스트

- [ ] `npm -w @form-js-designer/designer-vscode-extension run build` 성공 (exit code 0)
- [ ] `dist/extension.cjs` 파일 존재
- [ ] `dist/webview/preview.js` 파일 존재
- [ ] `dist/webview/customEditor.js` 파일 존재
- [ ] `dist/extension.cjs`가 CJS 형식 (`"use strict"` 또는 `Object.defineProperty(exports`)
- [ ] `dist/webview/preview.js`가 IIFE 형식
- [ ] `dist/extension.cjs` 내 `vscode`가 external 처리됨 (`require('vscode')` 남아있음)
- [ ] `dist/webview/preview.js`에 `preact` 코드 번들 포함됨 (크기 > 10KB)
- [ ] `npm -w @form-js-designer/designer-vscode-extension run typecheck` 성공
- [ ] `npx vsce package --no-dependencies` 성공 + `.vsix` 파일 생성
- [ ] `node scripts/ci/assert-single-preact.mjs` → `OK` (exit code 0)
- [ ] `package.json`에 `contributes.markdown.previewScripts`, `contributes.markdown.previewStyles`, `contributes.customEditors` 존재
- [ ] `package.json`에 `activationEvents` 존재
- [ ] 빌드 재실행 idempotent
- [ ] `media/`에 CSS 복사 완료 (미존재 시 경고만 출력, exit 0 유지)
