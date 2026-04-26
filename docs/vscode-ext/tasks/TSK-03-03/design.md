# TSK-03-03: 어댑터 PoC 구현 (viewer-only 먼저, 가능하면 편집까지) - 설계

## 요구사항 확인

- form-js-viewer를 사내 Notion-style 뷰어의 custom block 형태로 마운트한다. 플랫폼은 TSK-03-01에서 식별되며 TSK-03-02에서 설계된 계약을 따른다. PoC 단계에서는 플랫폼이 미확정이므로 BlockNote v0.x(유력 후보)를 기준 타겟으로 하되, 어댑터 경계를 명확히 분리하여 다른 플랫폼으로 전환 가능하게 설계한다.
- VSCode extension과 동일한 CSS(form-js.css, form-js-base.css, form-js-block.css)를 npm 패키지 내 static asset으로 재패키징하여 임포트 가능하도록 한다. Preact는 단일 인스턴스 원칙을 적용하며, 사내 뷰어가 React 기반이면 `preact/compat` 경계로 격리한다.
- viewer-only를 먼저 구현하고, 플랫폼 편집 API 존재 여부에 따라 스키마 JSON 직접 편집 UI를 선택적으로 활성화한다.

## 타겟 앱

- **경로**: `packages/designer-notion-adapter` (신규 패키지, 모노레포 workspace에 추가)
- **근거**: VSCode extension(`packages/designer-vscode-extension`)과 어댑터를 분리 배포하려면 별도 패키지가 필요하다. 공유 CSS/컴포넌트는 기존 패키지를 참조하고, 어댑터 진입점만 신규로 작성한다.

## 구현 방향

1. `packages/designer-notion-adapter/` 신규 패키지를 생성한다. esbuild로 브라우저 IIFE + ESM 듀얼 빌드.
2. 어댑터 코어(`src/FormJsViewerBlock.tsx`)는 플랫폼-agnostic한 Preact 컴포넌트로 구현한다. 컨테이너 div에 form-js-viewer를 마운트하고 높이 auto로 설정한다.
3. 플랫폼 플러그인 레이어(`src/adapters/blocknote.ts`)는 BlockNote SDK의 custom block 계약에 맞춰 `FormJsViewerBlock`을 래핑한다. 플랫폼 미확정 시 제네릭 HTML embed fallback(`src/adapters/generic.ts`)도 제공한다.
4. CSS는 `packages/designer-vscode-extension/media/` 파일을 빌드 스크립트로 `dist/css/`에 복사한다. form-js-base.css 누락 시 빌드 실패 처리(높이=0 문제 방지).
5. Preact 단일 인스턴스: 어댑터 패키지 `package.json`에 `overrides: { preact: "10.29.x" }`를 명시한다. 플랫폼이 React 18+이면 react→preact/compat 별칭을 esbuild alias로 적용한다(VSCode extension과 동일 전략).
6. 스키마 편집 UI는 최소 구현으로 `<textarea>` 기반 JSON 에디터를 제공한다. 플랫폼 사이드패널/설정 API가 없으면 블록 내부 토글 UI로 대체한다.
7. 샘플 페이지(`packages/designer-notion-adapter/sample/`)를 제공하여 브라우저에서 직접 확인 가능하도록 한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-notion-adapter/package.json` | 패키지 매니페스트 (name: `@form-js-designer/designer-notion-adapter`, dependencies: form-js-viewer, preact 10.29.x) | 신규 |
| `packages/designer-notion-adapter/tsconfig.json` | TypeScript 설정 (target ES2020, jsx preact) | 신규 |
| `packages/designer-notion-adapter/esbuild.config.mjs` | 브라우저 IIFE + ESM 듀얼 빌드, react→preact/compat alias, CSS 복사 포함 | 신규 |
| `packages/designer-notion-adapter/scripts/copy-css.mjs` | `packages/designer-vscode-extension/media/*.css`를 `dist/css/`로 복사, 파일 미존재 시 process.exit(1) | 신규 |
| `packages/designer-notion-adapter/src/FormJsViewerBlock.tsx` | 플랫폼-agnostic Preact 컴포넌트. form-js-viewer 마운트, 테마 동기화, 에러 배너, JSON 편집 토글 | 신규 |
| `packages/designer-notion-adapter/src/SchemaEditor.tsx` | `<textarea>` 기반 스키마 JSON 직접 편집 UI. 저장/취소 버튼 포함 | 신규 |
| `packages/designer-notion-adapter/src/themeSync.ts` | 호스트의 다크/라이트 테마 속성을 감지하여 form-js 컨테이너에 클래스 적용 (MutationObserver) | 신규 |
| `packages/designer-notion-adapter/src/adapters/blocknote.ts` | BlockNote v0.x custom block 플러그인 계약 구현. `createReactBlockSpec` 래퍼, insertSpec으로 "+" 메뉴 등록 | 신규 |
| `packages/designer-notion-adapter/src/adapters/generic.ts` | 플랫폼 SDK 없이 일반 HTML `<div>`에 Preact render로 `FormJsViewerBlock`을 마운트하는 Vanilla JS 어댑터 (fallback / PoC 테스트용) | 신규 |
| `packages/designer-notion-adapter/src/index.ts` | 패키지 public entry: `FormJsViewerBlock`, `genericMount`, `blockNotePlugin` re-export | 신규 |
| `packages/designer-notion-adapter/sample/index.html` | 정적 샘플 페이지. generic 어댑터 사용, 라이트/다크 테마 토글 버튼 + "블록 삽입" 버튼 포함 | 신규 |
| `packages/designer-notion-adapter/sample/main.ts` | 샘플 진입 스크립트. `genericMount()` 호출 | 신규 |
| `packages/designer-notion-adapter/test/unit/FormJsViewerBlock.test.tsx` | Preact + vitest: 마운트, 에러 배너, 테마 클래스 전환 단위 테스트 | 신규 |
| `packages/designer-notion-adapter/test/unit/SchemaEditor.test.tsx` | 유효 JSON 저장/잘못된 JSON 에러 표시 단위 테스트 | 신규 |
| `packages/designer-notion-adapter/test/e2e/viewer.spec.ts` | Playwright: sample/index.html에서 "블록 삽입" 버튼 클릭 → viewer 렌더 성공 + 다크/라이트 테마 전환 E2E | 신규 |
| `package.json` (루트) | `workspaces`에 `packages/designer-notion-adapter` 추가 | 수정 |

> 이 Task는 플랫폼-agnostic 어댑터 패키지 신설이다. 사내 뷰어의 라우터 파일은 이 패키지 배포 후 별도 배선 작업에서 수정된다(TSK-03-04 이후). 현재 PoC 범위에서 "라우터 파일"은 `packages/designer-notion-adapter/sample/main.ts`가, "메뉴·네비게이션 파일"은 `src/adapters/blocknote.ts`의 `insertSpec` 객체가 담당한다.

## 진입점 (Entry Points)

**사용자 진입 경로**: 사내 Notion-style 뷰어에서 `+` 블록 추가 버튼 클릭 → 블록 타입 메뉴에서 "form-js" 항목 선택 → 블록이 삽입되며 기본 스키마로 viewer 렌더 → 블록 내 "스키마 편집" 버튼 클릭 → `SchemaEditor` textarea에서 JSON 수정 후 저장

**URL / 라우트**: 사내 뷰어 자체 라우팅에 종속 (어댑터 레벨에서는 독립적인 라우트 없음). PoC 샘플 페이지는 `packages/designer-notion-adapter/sample/index.html` (정적 파일, 별도 서버 불필요, `file://` 직접 열기 가능).

**수정할 라우터 파일**: `packages/designer-notion-adapter/sample/main.ts` — `genericMount(container, defaultSchema)` 호출로 샘플 페이지 초기 렌더 진입점 역할. "블록 삽입" 버튼의 click 핸들러에서 `genericMount` 재호출. (실제 사내 뷰어 배선은 TSK-03-01 식별 후 결정, 현재 PoC 범위 외.)

**수정할 메뉴·네비게이션 파일**: `packages/designer-notion-adapter/src/adapters/blocknote.ts`의 `insertSpec` 객체 — BlockNote "+" 메뉴에 "form-js" 항목을 추가하는 `group`/`name`/`execute` 필드. 샘플 페이지에서는 `sample/index.html`의 "블록 삽입" 버튼이 동등 역할.

**연결 확인 방법**: Playwright E2E에서 `sample/index.html`을 열고 → 페이지 내 "블록 삽입" 버튼을 클릭하여 → `.form-js-block` 요소가 DOM에 나타나며 form-js viewer가 렌더됨을 확인 → "스키마 편집" 버튼 클릭으로 `SchemaEditor` textarea 표시 확인. (`page.goto` 직접 입력만으로 끝내지 않고 클릭 시퀀스 필수.)

## 주요 구조

- **`FormJsViewerBlock` (Preact FC)**: 외부 props(`schema: string`, `onSave?: (json: string) => void`, `theme?: 'light'|'dark'|'auto'`)를 받아 form-js-viewer를 마운트하고 `SchemaEditor` 토글을 포함. `useEffect`로 viewer 생성/소멸을 관리.
- **`SchemaEditor` (Preact FC)**: `textarea` + 저장/취소 버튼. JSON 파싱 실패 시 인라인 에러 메시지. `onSave` 콜백으로 부모에 유효 JSON 전달.
- **`themeSync(container, strategy)` (유틸 함수)**: `MutationObserver`로 `document.body`의 `data-theme`/`data-color-scheme`/`class` 변화를 감지하여 컨테이너에 `theme-light`/`theme-dark` 클래스 적용. VSCode의 `data-vscode-theme-kind` 전략과 동일 패턴.
- **`blockNotePlugin` (BlockNote 어댑터)**: `createReactBlockSpec`으로 `FormJsViewerBlock`을 BlockNote custom block으로 래핑. 블록 데이터 `schema` 필드와 Preact props를 바인딩. `insertSpec`으로 "+" 메뉴에 "form-js" 항목 추가.
- **`genericMount(container, schema)` (Vanilla JS 어댑터)**: 플랫폼 SDK 없이 임의 DOM 요소에 Preact `render()`로 `FormJsViewerBlock`을 마운트. PoC 샘플 및 단위 테스트에 사용.

## 데이터 흐름

입력: 사내 뷰어 블록 데이터의 `schema` 필드(JSON 문자열) 또는 사용자 `SchemaEditor` textarea 입력 → 처리: `FormJsViewerBlock`이 `createForm({ container, schema })` 호출로 viewer 마운트, 편집 시 `onSave` 콜백이 플랫폼 블록 데이터 업데이트 → 출력: 브라우저 DOM에 form-js 폼 렌더링 + (편집 시) 플랫폼 블록 persistedData 갱신.

## 설계 결정 (대안이 있는 경우만)

- **결정**: CSS를 `packages/designer-vscode-extension/media/`에서 `dist/css/`로 복사하는 빌드 스크립트 방식 채택
- **대안**: VSCode extension 패키지에서 `exports["./css/*"]` 필드로 직접 re-export
- **근거**: npm exports re-export는 번들러 설정에 따라 지원이 불균일하며, 파일 복사가 가장 단순하고 안정적이다. form-js-base.css 누락 시 빌드 실패로 조기 감지 가능.

- **결정**: Preact 단일 인스턴스 유지 (번들에 Preact 포함, external 처리 안 함)
- **대안**: 사내 뷰어의 Preact/React를 외부 peer로 공유
- **근거**: 사내 뷰어가 React 18+일 가능성이 높고, Preact를 external로 두면 버전 충돌로 크래시할 수 있다. VSCode extension과 동일하게 내부 포함 + react→preact/compat alias 전략을 적용한다.

- **결정**: viewer-only 먼저 구현, 편집 UI는 `<textarea>` 기반 최소 구현
- **대안**: form-js-editor 전체 임베드
- **근거**: form-js-editor는 번들 크기가 크고 플랫폼 모달/드로어 API 연동이 필요하다. PoC 단계에서는 textarea JSON 편집이 가장 빠른 검증 경로다.

## 선행 조건

- TSK-03-01: 사내 뷰어 플랫폼 식별 완료 (BlockNote/Tiptap/자체 등 결정). `src/adapters/blocknote.ts` 구현은 이 식별 결과에 의존.
- TSK-03-02: 어댑터 설계 + 계약 정의 완료 (`docs/vscode-ext/features/notion-adapter/adapter-design.md` 존재).
- `@bpmn-io/form-js-viewer` 패키지가 모노레포 또는 npm에서 접근 가능해야 한다.
- `packages/designer-vscode-extension/media/` CSS 파일이 최신 상태 (form-js.css, form-js-base.css, form-js-block.css).

## 리스크

- **HIGH**: TSK-03-01/TSK-03-02가 미완료이므로 실제 플랫폼 SDK 계약을 알 수 없다. `src/adapters/blocknote.ts`는 추정 기반으로 작성하며, 실제 플랫폼 확인 후 수정이 필요할 수 있다. PoC 목표를 "generic 어댑터로 viewer 렌더 성공"으로 제한하고, BlockNote 어댑터는 stub 상태로 둔다.
- **HIGH**: 사내 뷰어가 Preact를 이미 내장하고 있으면 두 Preact 인스턴스 충돌 가능. 완화: 번들에 Preact를 포함하되, IIFE 스코프로 global 네임스페이스 오염 차단.
- **MEDIUM**: form-js-viewer의 CSS 변수가 사내 뷰어의 글로벌 스타일과 충돌할 수 있다. 완화: 컨테이너 클래스 스코프 격리 또는 Shadow DOM (PoC는 클래스 스코프로 우선 시도).
- **MEDIUM**: form-js-base.css 누락 시 drop container 높이=0 문제. 완화: copy-css 빌드 스크립트에서 파일 존재 여부를 검증하고 누락 시 빌드 실패로 처리.
- **LOW**: BlockNote v0.x와 v1.x의 `createReactBlockSpec` API 차이. PoC는 v0.x 기준으로 작성하고 버전 명시.

## QA 체크리스트

- [ ] (정상) `genericMount(container, validSchema)`를 호출하면 컨테이너 내에 form-js viewer가 렌더링되어 폼 필드가 표시된다.
- [ ] (정상) 라이트 테마 환경(`data-theme="light"`)에서 `FormJsViewerBlock`을 렌더하면 컨테이너에 `theme-light` 클래스가 적용된다.
- [ ] (정상) 다크 테마 환경(`data-theme="dark"`)에서 `FormJsViewerBlock`을 렌더하면 컨테이너에 `theme-dark` 클래스가 적용된다.
- [ ] (정상) `SchemaEditor`에서 유효한 JSON 스키마를 입력하고 저장하면 `onSave` 콜백이 해당 JSON 문자열로 호출된다.
- [ ] (엣지) 빈 스키마(`{}`)를 전달해도 viewer가 에러 배너 없이 렌더된다 (빈 폼).
- [ ] (에러) 유효하지 않은 JSON 문자열을 `SchemaEditor`에 입력하고 저장 시 파싱 에러 메시지가 표시되고 `onSave`는 호출되지 않는다.
- [ ] (에러) `genericMount`에 잘못된 스키마(JSON 파싱 실패)를 전달하면 에러 배너가 렌더되고 다른 블록은 정상 렌더된다.
- [ ] (통합) CSS 파일(`form-js.css`, `form-js-base.css`)이 `dist/css/`에 복사되고 샘플 페이지에서 스타일이 적용된 상태로 viewer가 렌더된다.
- [ ] (통합) Preact 인스턴스가 단일임을 확인한다 (동일 페이지에서 두 개의 `FormJsViewerBlock` 마운트 시 각자 독립 동작하며 충돌 없음).

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 샘플 페이지에서 "블록 삽입" 버튼을 클릭하여 form-js viewer 블록에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 핵심 UI 요소(폼 필드, viewer 컨테이너)가 브라우저에서 실제 표시되고 "스키마 편집" 버튼 클릭 시 SchemaEditor textarea가 나타난다
