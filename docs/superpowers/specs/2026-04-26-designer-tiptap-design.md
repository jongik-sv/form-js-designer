# Designer × Tiptap 통합 패키지 설계서

- **작성일**: 2026-04-26
- **범위**: form-js-designer 스택을 Tiptap 에디터 안에 임베드하는 신규 모노레포 패키지의 아키텍처·배포 전략
- **상태**: 초안 (사용자 검토 대기)

---

## 1. 목표 / 비목표

### 목표
- Tiptap(ProseMirror) 도큐먼트 안에 form-js-designer로 작성된 스키마(Tabs/Card/Modal 등 커스텀 컴포넌트 포함)를 **블록 단위로 삽입·뷰잉·편집**할 수 있게 한다.
- 외부 사용자가 **`npm install` 한 줄**로 시작할 수 있는 자기완결형(self-contained) 패키지로 출고한다.
- 모노레포 다른 6개 designer-* 패키지의 기존 상태(`private: true / 0.0.0 / UNLICENSED`)를 **건드리지 않는다**.
- v0.1은 사내·고객사 한정(GitHub Packages), 추후 npm public 공개로 **최소 수정**(라이선스 파일 1개 + `publishConfig.registry` 1줄)으로 전환 가능해야 한다.
- Yjs(Tiptap collaboration) 통합을 **막지 않는** 데이터 형상.

### 비목표 (v0.1)
- Yjs/협업 동시 편집 코드를 직접 포함하지 않음.
- React/Vue/Svelte 별 전용 wrapper 패키지를 v0.1에 출고하지 않음(vanilla NodeView 기본 제공으로 모든 호스트에서 동작).
- 인라인 편집(노드 안에서 ProseMirror 키 입력으로 form-js 필드 편집) 미제공. 편집은 모달 전용.
- 외부 저장소 reference(스키마를 URL/ID로 보관) 미지원 — Tiptap 노드 attr에 JSON 통째 저장.
- VS Code 확장(webview) 호환 변형(CSP/번들)은 v0.3에서 별도 작업으로 분리.

---

## 2. 핵심 결정 요약

| 항목 | 결정 |
|---|---|
| 패키지 | 단일 패키지 `@form-js-designer/designer-tiptap` |
| 진입점 | `.` (viewer-only) / `./editor` (디자이너 모달) / `./styles` |
| 의존 정책 | designer-core/components/runtime은 **빌드 타임 inline**, `@bpmn-io/form-js-*`는 **peer** |
| Tiptap | `peerDependencies: { @tiptap/core: ^2, @tiptap/pm: ^2 }` (v0.1 기준; Tiptap v3 호환은 v0.3에서 별도 검토) |
| 호스트 프레임워크 | vanilla NodeView (React/Vue/Svelte/vanilla 어디서도 동작) |
| 편집 UX | 모달 (NodeView 더블클릭 → designer modal → 저장 시 `updateAttributes({schema})`) |
| 스키마 영속화 | Tiptap 노드 attr `schema: object`, HTML 직렬화 시 `data-form-schema` |
| 협업 | v0.1 미구현, 단 attr 형상이 Yjs CRDT-친화(plain JSON) |
| 레지스트리 | GitHub Packages (private), 미래 npmjs.org 공개 전환 가능 |
| 라이선스 | UNLICENSED (v0.1) → 공개 시 MIT/Apache-2.0 결정 |

---

## 3. 아키텍처

### 3.1 전체 그림

```
Tiptap Document
  ├─ paragraph
  ├─ formJsBlock (atom, draggable)
  │    ├─ attrs: { schema: object, mode: 'view' | 'edit' }
  │    └─ NodeView
  │         └─ container <div class="form-js-tiptap-block">
  │              └─ designer-runtime mount
  │                   └─ form-js Viewer + 우리 커스텀 컴포넌트(Tabs/Card/Modal)
  └─ paragraph
```

### 3.2 패키지 구조

```
packages/designer-tiptap/
├── package.json              # name, exports, peer, publishConfig (GH Packages)
├── tsup.config.ts            # 두 진입점 빌드 (viewer / editor), bundle inline
├── tsconfig.json
├── README.md                 # 설치·사용·.npmrc 가이드
├── LICENSE                   # 추후 공개 전환 시 추가
├── src/
│   ├── index.ts              # main: FormJsBlock node + viewer NodeView
│   ├── node.ts               # Tiptap Node 정의 (atom, attrs, parseHTML, renderHTML, addCommands)
│   ├── nodeview/
│   │   ├── viewer.ts         # designer-runtime 마운트 NodeView
│   │   └── shared.ts         # 컨테이너 라이프사이클, 이벤트 격리
│   ├── editor/
│   │   ├── index.ts          # subpath: editor entry — withDesigner() helper
│   │   └── modal.ts          # 디자이너 모달 (designer-editor-host primitives 재사용)
│   ├── styles/
│   │   └── designer-tiptap.css  # form-js-base.css + designer-* css 재export
│   └── __tests__/
│       ├── node.test.ts      # Node spec, parseHTML/renderHTML round-trip
│       └── nodeview.test.ts  # 마운트/언마운트, schema 갱신 시 재렌더
├── e2e/
│   └── tiptap-host.spec.ts   # Playwright visible — 더블클릭 → 모달 → 저장 → 반영
└── examples/
    └── vanilla-host/         # 외부 사용자가 따라할 수 있는 데모
```

### 3.3 두 진입점 (subpath exports)

```jsonc
"exports": {
  ".":         { "import": "./dist/viewer.js",  "types": "./dist/viewer.d.ts" },
  "./editor":  { "import": "./dist/editor.js",  "types": "./dist/editor.d.ts" },
  "./styles":  "./dist/designer-tiptap.css"
}
```

- `import { FormJsBlock } from '@form-js-designer/designer-tiptap'` — viewer만 (가벼움)
- `import { withDesigner } from '@form-js-designer/designer-tiptap/editor'` — 모달 designer 옵트인
- 사용처가 viewer만 필요하면 designer-editor 의존 코드는 트리쉐이킹으로 빠짐

### 3.4 Node 명세

```ts
Node.create({
  name: 'formJsBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes: () => ({
    schema: { default: null, parseHTML: el => JSON.parse(el.getAttribute('data-form-schema') || 'null') },
    formId: { default: null }
  }),
  parseHTML: () => [{ tag: 'div[data-type="form-js-block"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, {
    'data-type': 'form-js-block',
    'data-form-schema': JSON.stringify(HTMLAttributes.schema)
  })],
  addCommands: () => ({
    insertFormJsBlock: schema => ({ commands }) => commands.insertContent({ type: 'formJsBlock', attrs: { schema } }),
    updateFormJsBlock: schema => ({ commands }) => commands.updateAttributes('formJsBlock', { schema })
  }),
  addNodeView: () => makeViewerNodeView()
});
```

### 3.5 NodeView 라이프사이클

| 단계 | 동작 |
|---|---|
| **mount** | wrapper div 생성 → designer-runtime의 `mountForm({ container, schema, mode: 'viewer' })` 호출 |
| **update** | Tiptap이 attr 변경 통지 → schema 동등성 비교 → 다르면 viewer의 `importSchema(newSchema)` (전체 재마운트 X) |
| **destroy** | viewer.destroy() |
| **stopEvent** | viewer 내부 이벤트는 ProseMirror로 전파 차단 (입력값이 doc 트랜잭션을 트리거하지 않게) |
| **ignoreMutation** | viewer가 일으키는 DOM mutation은 ProseMirror가 무시 |

### 3.6 편집 흐름 (`./editor`)

```
사용자: NodeView 더블클릭
  → onDoubleClick → openDesignerModal({ initialSchema: attrs.schema })
  → 모달이 designer-editor-host의 마운트 함수 호출 (재구현 X, 재사용)
  → 사용자 편집
  → '저장' 버튼 → resolve(newSchema) → editor.commands.updateFormJsBlock(newSchema)
  → Tiptap이 attr 변경 → NodeView.update가 호출 → form-js Viewer가 새 스키마 렌더
```

핵심: **모달 designer는 `designer-editor-host`의 마운트 로직을 함수로 추출해 재사용**. 새로 짜지 않음(form-js의 escapeGridRender / ChildrenSlot / FormLayouter override 등 기존 계약 보존).

### 3.7 CSS 정책

- 자동 주입 안 함. 사용자가 명시적으로 `import '@form-js-designer/designer-tiptap/styles'` 또는 직접 CSS 링크.
- 빌드 산출물 `dist/designer-tiptap.css`는 form-js-base.css + designer-components css를 정해진 순서로 concat (빌드 타임 결정).
- VS Code webview 같은 CSP 강한 환경의 사용자 가이드는 README의 "Restricted CSP environments" 섹션에 정리.

---

## 4. 빌드·배포 파이프라인

### 4.1 빌드 (tsup)

```ts
// tsup.config.ts
export default defineConfig({
  entry: { viewer: 'src/index.ts', editor: 'src/editor/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  splitting: true,
  external: ['@tiptap/core', '@tiptap/pm', '@bpmn-io/form-js-viewer', '@bpmn-io/form-js-editor', 'preact'],
  noExternal: [
    '@form-js-designer/designer-core',
    '@form-js-designer/designer-components',
    '@form-js-designer/designer-runtime'
  ],
  onSuccess: 'node scripts/copy-css.mjs && node scripts/copy-licenses.mjs'
});
```

- `external`: 사용자가 자기 버전을 가져오는 라이브러리 (peer로 선언)
- `noExternal`: 모노레포 designer-* 패키지를 빌드 결과물에 inline (외부 사용자가 접근 못 하므로 필수)
- 산출물: `dist/viewer.js`, `dist/editor.js`, `dist/designer-tiptap.css`, `dist/THIRD_PARTY_LICENSES`

### 4.2 publishConfig

```jsonc
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"]
}
```

### 4.3 릴리스 명령

```sh
# 1) 버전 올리기 (semver)
npm version 0.1.0 -w @form-js-designer/designer-tiptap

# 2) 빌드
npm run build -w @form-js-designer/designer-tiptap

# 3) 게시 (GitHub Packages)
npm publish -w @form-js-designer/designer-tiptap
```

루트 package.json에 한 줄로 wrap:
```jsonc
"scripts": { "release:tiptap": "npm run build -w @form-js-designer/designer-tiptap && npm publish -w @form-js-designer/designer-tiptap" }
```

### 4.4 소비자 가이드 (README의 핵심 섹션)

```sh
# 1) ~/.npmrc 또는 프로젝트 .npmrc
@form-js-designer:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=GITHUB_PAT_WITH_READ_PACKAGES

# 2) 설치 (peer)
npm i @form-js-designer/designer-tiptap \
      @bpmn-io/form-js-viewer @bpmn-io/form-js-editor \
      @tiptap/core @tiptap/pm preact
```

```ts
// 3) 사용 — viewer-only
import { FormJsBlock } from '@form-js-designer/designer-tiptap';
import '@form-js-designer/designer-tiptap/styles';

const editor = new Editor({ extensions: [StarterKit, FormJsBlock] });
editor.commands.insertFormJsBlock(mySchema);

// 3') 사용 — 디자이너 모달 포함
import { FormJsBlock, withDesigner } from '@form-js-designer/designer-tiptap/editor';
const editor = new Editor({ extensions: [StarterKit, withDesigner(FormJsBlock)] });
// withDesigner: NodeView 더블클릭 시 모달 designer를 열고 저장 시 updateFormJsBlock 자동 호출
```

API 디테일(`withDesigner` 옵션, 커스텀 트리거, i18n 등)은 v0.2 README에서 확정.

### 4.5 미래 공개 전환 비용 (참고)

| 작업 | 변경 위치 |
|---|---|
| 라이선스 결정 | `LICENSE` 파일 추가 + `package.json` `"license"` 필드 |
| 레지스트리 변경 | `publishConfig.registry` 한 줄 |
| npm org 등록 | npmjs.org 1회 (무료, 1분) |
| 코드 수정 | **없음** |
| 소비자 측 수정 | `.npmrc`에서 GH 토큰 라인 삭제 |

---

## 5. 테스트·품질

### 5.0 검증 레이어 4단

| 레이어 | 도구 | 책임 | 한계 |
|---|---|---|---|
| 1. 단위 | vitest + happy-dom | Tiptap Node spec(attrs/parseHTML/renderHTML), 커맨드 시그니처 | form-js 실제 렌더는 happy-dom에서 미흡(DOM 측정 의존) |
| 2. 통합 headless | Playwright headless + vite dev(`examples/vanilla-host`) | NodeView가 실 designer 스키마 렌더, round-trip, 이벤트 격리 | 시각·layout 회귀 못 잡음 |
| 3. 시각 회귀 | Playwright **headed** + 스크린샷 비교 | layout/FormLayouter/CSS·a11y 회귀 | CI 비용 — chromium 1개만 |
| 4. WP 완료 직전 visible 시연 | plugin_playwright MCP (visible) | 메모리 의무 — 사용자 앞 1회 수동 검증 | 자동화 X, 휴먼 게이트 |

### 5.1 단위 (vitest + happy-dom)
- `node.test.ts`: Node attrs default, parseHTML/renderHTML round-trip, command 시그니처
- 비포함: NodeView 실제 마운트는 통합 e2e로 위임 (form-js DOM 측정 한계)

### 5.2 통합 e2e — `examples/vanilla-host` 단일 진실 소스

개발·자동화·시연을 같은 데모 페이지로 묶음:

```
packages/designer-tiptap/examples/vanilla-host/
├── index.html
├── main.ts           # Tiptap Editor + FormJsBlock + 시드 스키마 삽입 버튼
├── seed/
│   ├── simple.json   # 텍스트필드 기본
│   ├── tabs.json     # Tabs/Card 포함 (designer 컴포넌트 검증)
│   └── modal.json    # Modal 컴포넌트
└── vite.config.ts    # 포트 5179 고정
```

용도:
- 개발 중 수동: `npm run dev -w @form-js-designer/designer-tiptap`
- Playwright `webServer`가 동일 명령으로 띄워 자동 e2e
- WP 완료 직전 visible 시연도 같은 URL

### 5.3 v0.1 e2e 시나리오 (6개)

1. **insert simple**: insertFormJsBlock 커맨드 → input 노드 표시
2. **insert tabs**: Tabs/Card 포함 스키마 → `.fjs-tabs [role="tab"]` 정확히 N개, `.fjs-card` 표시 (designer 컴포넌트 정상 작동)
3. **round-trip**: editor.getHTML() → setContent(html) → 동일 컴포넌트 재현
4. **이벤트 격리**: form-js 입력이 ProseMirror 트랜잭션 카운트를 증가시키지 않음
5. **블록 격리**: 두 블록 동시 존재 시 입력값/포커스 누수 없음
6. **a11y**: `@axe-core/playwright`로 violations === 0

v0.2 추가 +3: 더블클릭 → 모달 / 모달 저장 → 본문 반영 / ESC 취소 무영향

### 5.4 visible 시연 운영 (메모리 의무)

- **언제**: WP.done 직전, 커밋 전. 시그널 파일에 `brw-test` 한 줄.
- **무엇으로**: `mcp__plugin_playwright_playwright__*` (ecc playwright는 extension 필수라 현재 불가).
- **선행**: `pkill -f chromium 2>/dev/null; true` (profile lock 방지).
- **산출물**: `playwright-report/` 스크린샷·동영상을 evidence로 보존.

### 5.5 CI 정책

- PR마다: 레이어 1 + 2 (vitest + headless e2e)
- main 머지 전: 레이어 3 (시각 회귀, chromium만)
- 릴리스 직전: 레이어 4 (사용자 앞 visible 시연, 휴먼 게이트)

### 5.6 모노레포 lint 호환
- 기존 `lint:no-css-modules`, `lint:single-preact`, `lint:watermark-hash`, `lint:watermark-scss`, `lint:license` 통과
- preact override(`10.29.x`)와 충돌 없음을 vite/tsup 빌드에서 검증

### 5.7 라이선스 게이트
- 빌드 시 `gen-third-party-licenses.mjs` 실행해 `dist/THIRD_PARTY_LICENSES` 동봉
- form-js, Radix, Tailwind 등 inline된 라이브러리 NOTICE 누락 방지

---

## 6. 마이그레이션 영향

| 패키지 | 영향 |
|---|---|
| `designer-core` | 변경 없음 |
| `designer-components` | 변경 없음 |
| `designer-runtime` | v0.1 구현 첫 단계로 **공개 마운트 함수 점검**. 이미 노출돼 있으면 무수정, 없으면 함수 1개 추가 (기존 export 보존) |
| `designer-editor-host` | 모달에서 재사용할 디자이너 부트 함수가 export되어 있어야 함. 현재 앱 형태라면 **마운트 로직을 함수로 추출**(파일 1개 추가, 기존 app entry는 그 함수 호출만으로 단순화 — 외부 동작 동일). 변경분은 별도 PR로 분리 |
| `designer-cli` / `designer-i18n` / `designer-notion-adapter` / `designer-vscode-extension` | 변경 없음 |
| 루트 `package.json` | `release:tiptap` 스크립트 1줄 추가 (선택) |

---

## 7. 위험 / 알려진 이슈

| 위험 | 완화책 |
|---|---|
| 번들 크기 — designer 스택 inline | 트리쉐이킹 + subpath exports로 viewer-only 사용처는 editor 코드 미포함 |
| Preact 인스턴스 중복 (호스트가 이미 Preact를 쓰면) | `external: ['preact']` + peer 선언, README의 호환성 매트릭스에 명시 |
| `@bpmn-io/form-js-*` 마이너 불일치 | peer range `^1.21.2`, 호환성 매트릭스 README에 명기 |
| 모달 designer가 Tiptap 키 이벤트와 충돌 | 모달은 portal로 ProseMirror 영역 외부에 렌더, NodeView `stopEvent: () => true` |
| 협업(Yjs) 도입 시 attr 충돌 | 스키마는 plain JSON으로만 저장, NodeView는 attr 변경에 idempotent |
| VS Code webview CSP에서 디자이너 모드 동작 안 할 가능성 | v0.2 직전 별도 검증 작업으로 분리 (메모리 webview CSP 항목 참조) |

---

## 7-bis. Yjs 통합 비용 (참고)

| 시나리오 | 추가 작업 | 비용 |
|---|---|---|
| **A. 도큐먼트 레벨 협업** — 여러 사용자가 같은 Tiptap 문서를 동시 편집, 폼블록 추가/이동/스키마 변경이 자동 동기화. 모달 디자이너는 같은 시점에 1명만 사용. | 우리 패키지 변경 **없음**. 호스트가 `@tiptap/extension-collaboration` + provider 추가만. | 0 |
| **B. 모달 디자이너 안 실시간 동시 편집** — 두 사용자가 같은 폼블록의 모달을 동시에 열고 같이 편집. | 스키마를 plain JSON에서 `Y.Map` 트리로 재모델링. designer-runtime에 Yjs adapter 레이어 신설. 모달이 Y.Map을 source of truth로 사용. | 큼 (1~2주, v1.x 별도 기능) |

**디자인 결정**: v0.1은 Case A를 즉시 지원하도록 attr 형상을 plain JSON으로 유지 → Yjs replicate 자동. Case B는 의도적으로 미구현·미차단 (스키마 형상만 잘 지키면 미래 기능으로 추가 가능).

---

## 8. 마일스톤

| 버전 | 범위 |
|---|---|
| **v0.1.0** | viewer-only NodeView, `insertFormJsBlock` 커맨드, parseHTML/renderHTML, 단위·E2E 테스트, GH Packages 배포 |
| v0.2.0 | `./editor` 진입점, 모달 designer, `updateFormJsBlock` 커맨드, README 호환성 매트릭스 |
| v0.3.0 (선택) | React wrapper 헬퍼, VS Code webview 호환 변형, Tiptap v3 호환 검토 |
| v1.0.0 (선택) | npm public 전환, OSS 라이선스, Yjs 통합 가이드/예제 |

---

## 9. 결정·합의 로그

| 일자 | 결정 | 근거 |
|---|---|---|
| 2026-04-26 | 단일 패키지 + subpath exports 채택 | A→B 진화 시 v0.1 소비자 번들 회귀 방지 |
| 2026-04-26 | designer-* inline, `@bpmn-io/form-js-*` peer | 다른 6개 패키지 private 유지하면서 외부 설치 가능 |
| 2026-04-26 | GitHub Packages, scoped name 유지 | 미래 공개 전환 시 코드 변경 0 |
| 2026-04-26 | vanilla NodeView 디폴트, 모달 편집 | 호스트 framework 무관 + ProseMirror 키 충돌 회피 |
| 2026-04-26 | Yjs 미구현·미차단 | plain JSON attr 형상으로 추후 통합 가능 |
