# notion-adapter 설계 — viewer / 편집 / 번들 / CSS 격리

> 사내 Notion-style 마크다운 뷰어에 form-js 블록을 얹기 위한 어댑터 상세 설계. 계약(인터페이스)은 `contract.md`, 플랫폼 선정 근거는 `platform-matrix.md` 참조.
>
> 관련 핵심 파일:
> - `packages/designer-notion-adapter/src/adapters/shared/FormJsBlockHost.ts` (FormJsBlockHost 공통 계약)
> - `packages/designer-notion-adapter/src/adapters/shared/mountViewer.ts` / `mountEditor.ts` (뷰어·편집 마운트 구현)
> - `packages/designer-notion-adapter/src/adapters/notion-viewer.ts` (BlockNote 래퍼)
> - `packages/designer-notion-adapter/src/adapters/blockMenu.ts` (슬래시 명령 + "+" 메뉴)
> - `packages/designer-notion-adapter/src/css-isolation.ts` (Shadow/scoped 전략)
> - `packages/designer-notion-adapter/esbuild.config.mjs` (번들 구성)
> - `packages/designer-vscode-extension/src/webview/preview.ts` (VSCode 마크다운 미리보기 측 testBridge 송신 위치)

---

## 1. viewer 흐름 (뷰어)

사용자가 사내 Notion-style 뷰어에서 `.form-js-block` 블록을 열면 다음 시나리오로 form-js-viewer가 마운트된다. viewer 측의 모든 form-js 인스턴스는 schema 문자열을 입력으로만 받고 결과를 DOM으로 렌더하는 read-only 뷰어다. 뷰어 컨테이너(`.form-js-block`)는 Shadow DOM 내부에 form-js-viewer `<div class="fjs-container">`를 host한다. 뷰어 마운트는 `mountViewer(container, schema, opts)` 호출로 일원화되며, 플랫폼에 상관없이 같은 시그니처를 유지한다. 뷰어 완료 시점에는 테스트 자동화를 위한 `testBridge.emit('test-mount-complete')` 이벤트를 `preview.ts`(VSCode 환경) 또는 notion-viewer.ts(사내 환경)에서 송신한다. 뷰어는 스키마 파싱 실패 시 에러 배너만 렌더하고 form-js 인스턴스를 만들지 않는다.

## 2. 편집 흐름 (에디터)

뷰어 블록에는 ✏️ 편집 버튼이 있다. 클릭 시 어댑터는 `requestEdit(handle)`를 호출하고, 플랫폼 SDK는 해당 블록을 편집 모드로 전환한다. 편집 모드에서는 `mountEditor(container, schema, opts)`가 호출되어 동일 컨테이너(`.form-js-block`) 내부에 form-js-editor를 마운트한다. 편집 저장 시 플랫폼은 결과 schema 문자열을 받아 블록 props에 저장하고, 어댑터는 다시 `mountViewer`로 되돌린다. viewer-only 환경에서는 `requestEdit`가 no-op + warn 처리되어 throw 하지 않는다. 편집 진입점은 블록 메뉴(blockMenu.ts)의 "Edit with form-js" 항목이며, 저장 완료 후 `test-mount-complete` 이벤트가 재발신되어 E2E 테스트가 전환을 검증한다.

## 3. 번들 전략 (bundle / esbuild)

adapter 번들은 두 가지 타깃을 생성한다. 첫째, 사내 뷰어에 투입되는 ESM 번들(`dist/index.js`, ESM). 둘째, Node18 환경 폴백 및 테스트용 CJS 번들(`dist/index.cjs`, UMD 스타일 CJS). 번들러는 esbuild를 사용하며 설정은 `esbuild.config.mjs`에 단일화된다. `preact`는 form-js-viewer/editor와 함께 내부 포함(inline)되어 호스트 환경의 React와 격리되며, `vscode`는 external로 남긴다 (ext host 전용 경로). 번들 크기는 sample UMD 약 1.6 MB, ESM 1.8 MB로 현재 1MB 초과이지만 form-js + preact + @bpmn-io/form-js-viewer 내장으로 인한 불가피한 규모다. bundle 검증 게이트는 WP-04의 CI 파이프라인에서 수행한다.

## 4. CSS 격리 (css-isolation / shadow / scoped)

어댑터의 기본 CSS 격리 전략은 Shadow DOM이다 (MountOpts.cssIsolation 기본값 shadow). form-js-viewer/editor의 스타일 전체가 ShadowRoot 내부에 inject되어 호스트 Notion-style 뷰어의 CSS와 완전 분리된다. 플랫폼 CSS가 form-js 내부 선택자를 덮어써야 하는 사내 테마 요구가 있을 때는 scoped fallback이 활성화되며, 이 경우 `.fjs-scope-<hash>` 클래스 prefix로 모든 form-js 선택자가 bounded된다. 고대비(High Contrast) 테마에서는 prefers-contrast 미디어 쿼리를 구독해 form-js 전용 변수를 오버라이드한다. CSS 격리 실패 시 fallback 조건을 `console.warn`으로 기록하고, fallback 충돌이 재현되면 scoped 모드로 자동 승격한다. 이 정책의 세부는 `css-isolation.ts`에 구현되어 있다.

---

## 상호 참조

- **contract**: `contract.md` (FormJsBlockHost / FormJsHandle / MountOpts 타입 정의)
- **platform-matrix**: `platform-matrix.md` (BlockNote 채택 근거)
- **입력 산출물**: `platform-identification.md` (TSK-03-01 — 사내 뷰어 플랫폼 식별 결과)
- **preview.ts 연동**: `packages/designer-vscode-extension/src/webview/preview.ts` — VSCode 미리보기에서 testBridge.emit('test-mount-complete') 송신
- **customEditor.ts 연동**: `packages/designer-vscode-extension/src/webview/customEditor.ts` — VSCode Custom Editor 진입점에서 mountEditor 호출
- **슬래시 명령**: `/form-js` 슬래시 명령 클릭 시나리오는 blockMenu.ts의 insertSpec에서 정의. BlockNote "+"  메뉴의 slash-command group에 등록된다.

## 진입 시나리오

| 진입점 | 동작 |
|--------|------|
| `/form-js` 슬래시 명령 | blockMenu.ts의 insertSpec 실행 → 새 `.form-js-block` 블록 생성 → mountViewer 호출 |
| 기존 `.form-js-block` 렌더 | notion-viewer.ts의 custom block render → mountViewer |
| ✏️ 편집 버튼 | requestEdit → mountEditor로 전환 |
| 저장 완료 | editor handle.dispose → mountViewer로 복귀 + test-mount-complete emit |
