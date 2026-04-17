# TRD — form-js 기반 전문 화면 디자이너

> **상위 문서**
> - 제품 요구: [`docs/PRD.md`](./PRD.md)
> - 설계 원본: [`docs/idea.md`](./idea.md)
> - 라이선스: [`LICENSE`](../LICENSE)
>
> **본 문서 목적**
> PRD에서 정의한 1차 릴리스 범위(§4 Acceptance Criteria 10항목)를 **어떻게 구현할지**를 코드·패키지·인터페이스 단위로 명세한다. 전략·후보 비교는 idea.md, 사업 의사결정은 PRD에 둔다.

---

## 0. 제약 (변경 불가)

- form-js 본체 유지 (포크/리라이트 X). 신규 기능은 `additionalModules` 또는 별도 `designer-*` 패키지로 추가.
- **Preact 단일 스택**. React 라이브러리는 `preact/compat` alias로 통합.
- bpmn.io 워터마크(`packages/form-js-viewer/src/render/components/PoweredBy.js`)는 모든 폼 출력에 자동 렌더되어야 하며 CSS 숨김·overlap 금지. E2E 테스트로 가시성 회귀를 차단한다.
- 신규 의존성은 permissive(MIT/Apache-2.0/ISC/BSD/MPL-2.0/0BSD)만 허용. CI license-gate로 강제.
- 한국어(ko) 1차. 모든 사용자 가시 문자열은 `t('key.path')` 패턴으로 분리.
- AI 디자인 진입점은 Claude Code CLI. 디자이너 내장 AI 패널 없음. AI는 JSON 파일만 산출, 디자이너는 import.

---

## 1. 시스템 컨텍스트

```
┌─────────────────────────────────────────────────────────────────┐
│                        Author 작업 환경                          │
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────────────────┐  │
│  │  Claude Code CLI │ ──────▶ │ schemas/drafts/*.schema.json │  │
│  │  (Skills/Commands)│        └──────────────────────────────┘  │
│  └──────────────────┘                       │                    │
│                                              ▼                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ form-js-editor (확장)                                       │ │
│  │ - propsSchema 기반 자동 패널                                │ │
│  │ - Live Preview (designer-runtime 임베드)                    │ │
│  │ - Outline · Validate · Export                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │  publish (JSON)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       JSON 배포 채널 (둘 다 지원)                │
│   (a) 정적 파일 번들           (b) API endpoint                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│            운영 환경 — form-js-viewer + designer-runtime         │
│         (스키마 받아 즉시 렌더링, 워터마크 자동 노출)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 패키지 구조 (모노레포 그대로 사용)

기존 `packages/`는 변경하지 않고, 1차 릴리스에 필요한 신규 패키지만 추가한다.

| 패키지 | 책임 | 1차 포함 |
|---|---|---|
| `form-js-viewer` *(기존)* | 런타임 렌더 코어. PoweredBy 포함. | ✅ |
| `form-js-editor` *(기존)* | 디자이너 코어. Palette/Properties/Drag. | ✅ |
| `form-js-playground` *(기존)* | 데모용. 변경 없음. | — |
| `form-js-carbon-styles` *(기존)* | 카본 테마. 변경 없음. | — |
| `form-json-schema` *(기존)* | JSON 스키마 정의. 신규 컴포넌트 추가에 따라 확장. | ✅ |
| **`designer-core`** ★ | 신규 컴포넌트의 공통 타입·`defineComponent`·propsSchema 정의. | ✅ |
| **`designer-components`** ★ | Card/Stack/Tabs/Modal/Button 등 신규 컴포넌트. form-js `additionalModules`로 등록. | ✅ |
| **`designer-table`** ★ | TanStack Table 래퍼. 편집·필터·멀티헤더·컬럼이동. | ✅ |
| **`designer-i18n`** ★ | `t()` 함수 + ko 번들 + `Intl` 어댑터. | ✅ |
| **`designer-cli`** ★ | `validate` / `import` / `publish` CLI. | ✅ |
| `designer-theme` | 디자인 토큰 + Tailwind preset. | P1 |
| `designer-data` | 데이터소스 프로바이더 (TanStack Query). | P1 |
| `designer-actions` | 액션 디스패처. | P1 |
| `designer-codegen` | JSON → JSX eject. | **Future (PRD §7)** |

---

## 3. 기술 스택

### 런타임 코어
| 항목 | 선택 | 라이선스 | 비고 |
|---|---|---|---|
| UI 프레임워크 | Preact (form-js 기본) | MIT | preact/compat로 React 라이브러리 호환 |
| DI | didi (form-js 기본) | MIT | 변경 없음 |
| 표현식 | FEEL (form-js 기본) | MIT | 폼·조건 |
| 스키마 검증 | Ajv | MIT | 운영 부팅 시 검증 |

### UI 라이브러리 (1차)
| 항목 | 선택 | 라이선스 | 비고 |
|---|---|---|---|
| 헤드리스 프리미티브 | Radix UI Primitives (preact/compat) | MIT | 접근성 표준 |
| 스타일 | Tailwind CSS | MIT | |
| variant 패턴 | CVA + tailwind-merge | Apache-2.0 / MIT | shadcn 표준 |
| 컴포넌트 카탈로그 | shadcn/ui (코드 복사) | MIT | 패키지 X, 본인 코드화 |
| 아이콘 | Lucide | ISC | |

> **Q1·Q2 결정 게이트**: 위 조합은 idea.md 권장안 기반의 *기본값*이다. Phase 1 시작 시점에 1주 spike로 (a) Radix vs Ark UI, (b) TanStack Table vs Glide Data Grid 를 실측 비교 후 확정. 결정은 본 TRD §3을 갱신.

### 테이블
| 항목 | 선택 | 라이선스 |
|---|---|---|
| 헤드리스 테이블 | TanStack Table v8 | MIT |
| 컬럼 드래그 | dnd-kit | MIT |
| 가상화 | TanStack Virtual | MIT |

### 빌드·테스트·DX (신규 패키지에만 적용. 기존 패키지는 그대로 유지)
| 항목 | 선택 | 비고 |
|---|---|---|
| 번들러 | Rollup *(기존 form-js와 동일)* | 통일성 우선 |
| 모노레포 | Lerna *(기존 유지)* | pnpm/Turborepo는 별도 ADR 후 결정 |
| 단위 테스트 | Vitest *(신규 패키지만)* | 기존 form-js 패키지의 Karma는 손대지 않음 |
| E2E | Playwright *(기존 사용 중)* | 워터마크 가시성 테스트 추가 |
| 타입 | TypeScript | |
| 린트 | ESLint *(기존)* | |

### CI 게이트
- `license-checker-rseidelsohn --onlyAllow "MIT;Apache-2.0;ISC;BSD-2-Clause;BSD-3-Clause;MPL-2.0;0BSD"`
- `@cyclonedx/cdxgen` SBOM 생성
- `oss-attribution-generator` THIRD_PARTY_LICENSES 자동 동봉

---

## 4. 스키마 모델

### 4.1 호환성 원칙
- **하위 호환**: 기존 form-js 스키마(현재 `schemaVersion = 19`)를 수정 없이 그대로 받아야 한다.
- **상위 확장**: 신규 컴포넌트(`type: "table"` 등)는 form-js `FormFieldRegistry`에 `additionalModules`로 등록되며 스키마에 자연 등장.
- **스키마 버전**: form-js 본체의 `schemaVersion`을 유지. 신규 컴포넌트는 form-js의 `keyed: false` / `pathed: true` 메커니즘에 올라타 별도 메이저 버전 변경 없이 도입.

### 4.2 컴포넌트 정의 매니페스트
신규 컴포넌트는 단일 파일에 viewer 렌더·에디터 메타·propsSchema를 모두 선언한다.

```ts
// designer-core/src/defineComponent.ts
export interface ComponentDefinition {
  type: string;                       // 스키마 type 값
  name: string;                       // Palette 표시명 (i18n key)
  group: 'container' | 'data' | 'input' | 'presentation' | 'action';
  icon?: ComponentType;
  keyed?: boolean;                    // form-js와 동일
  pathed?: boolean;                   // form-js와 동일
  propsSchema: PropsSchema;           // 패널 자동 생성용
  create(options?: object): object;   // 기본 스키마 객체
  render(props: RenderProps): preact.JSX.Element;
}
```

### 4.3 propsSchema → 패널 자동 생성
프로퍼티 패널은 컴포넌트가 선언한 `propsSchema`만으로 자동 생성된다. 위젯 레지스트리:

| 위젯 type | 입력 컴포넌트 |
|---|---|
| `string` | TextField |
| `number` | NumberField (min/max/step) |
| `boolean` | Toggle |
| `enum` | Select |
| `color` | ColorPicker |
| `spacing` | SpacingInput |
| `expression` | FEEL editor |
| `i18n` | i18n key + ko 입력 |

메타: `group`, `collapsed`, `showIf`(FEEL), `label`(i18n), `description`(i18n).

### 4.4 i18n 패턴
```ts
// designer-i18n/src/t.ts
export type LocaleKey = string;          // 'designer.palette.table' 등
export function t(key: LocaleKey, params?: Record<string, unknown>): string;
```

- **수집**: 모든 `t('...')` 호출의 키를 빌드 시 정적 추출 → `locales/ko.json`과 diff. 누락된 키는 **빌드 실패**.
- **사전 위치**: `packages/designer-i18n/locales/ko.json`. 신규 패키지의 키는 패키지별 네임스페이스(`designer-table.column.add` 등)로 분리.
- **포맷**: 숫자/날짜는 `Intl.NumberFormat`, `Intl.DateTimeFormat` 어댑터 (ko-KR 기본).
- **검증 메시지**: form-js 기본 검증 메시지의 ko 번들을 `designer-i18n`이 함께 제공.

---

## 5. 컴포넌트 스펙 (1차 범위)

PRD §4 Acceptance Criteria #1·#8을 충족하기 위한 1차 컴포넌트 세트.

| type | 패키지 | 핵심 기능 |
|---|---|---|
| `card` | designer-components | 컨테이너, padding/elevation/header |
| `stack` | designer-components | 수직/수평 배치, gap/align/justify |
| `tabs` | designer-components | Radix Tabs 래퍼 |
| `modal` | designer-components | Radix Dialog 래퍼 |
| `button` | designer-components | variant(primary/secondary/ghost), action 바인딩 |
| `table` | designer-table | TanStack Table v8 — 편집·필터·멀티헤더·컬럼이동 |

### 5.1 Table 상세 (Acceptance Criteria #9 직결)
```ts
// designer-table/src/types.ts
export interface TableSchema {
  type: 'table';
  columns: ColumnDef[];        // 트리 구조 → 멀티헤더 자동 colspan
  data: string;                // FEEL/binding 표현식
  features: {
    editing?: boolean;         // 셀 편집
    filtering?: boolean;       // 컬럼 필터
    sorting?: boolean;
    columnReorder?: boolean;   // dnd-kit
    pagination?: { pageSize: number };
    virtualization?: boolean;
  };
}

export interface ColumnDef {
  id: string;
  header: LocaleKey;           // i18n
  accessor?: string;           // path 표현식
  type?: 'text'|'number'|'date'|'boolean'|'enum';
  editable?: boolean;
  filter?: 'text'|'select'|'range';
  columns?: ColumnDef[];       // 그룹 헤더용 자식
}
```

---

## 6. 인터페이스

### 6.1 form-js 통합 (additionalModules)
```js
// 운영 환경 부트스트랩
import { Form } from '@bpmn-io/form-js-viewer';
import { DesignerComponentsModule } from '@your-org/designer-components';
import { DesignerTableModule } from '@your-org/designer-table';

const form = new Form({
  container: '#app',
  additionalModules: [DesignerComponentsModule, DesignerTableModule],
});

await form.importSchema(schema, data);
```

각 모듈은 form-js `FormFieldRegistry`의 `register(type, definition)` 패턴을 그대로 사용 — form-js 본체 수정 없음.

### 6.2 JSON 배포 채널 (Acceptance Criteria #9)

**(a) 정적 번들** — 빌드 산출물에 JSON 포함, `import schema from './page.schema.json'`.

**(b) API endpoint** — 운영 서버가 fetch:
```
GET /api/schemas/{schemaId}?env={dev|staging|prod}
→ 200 application/json
   ETag: <hash>
   Cache-Control: no-cache, must-revalidate
```
- ETag 기반 클라이언트 캐시
- `env` 파라미터로 환경 분기 (PRD 외 항목이지만 인터페이스만 미리 마련)
- 운영 부팅 시 Ajv 스키마 검증 실패 → 캐시된 마지막 정상 스키마로 fallback + 알림

> Q5 결정에 따라 **양쪽 다** 1차에 포함. 어느 쪽을 쓸지는 호스트 앱이 선택.

### 6.3 designer-cli
```
designer-cli validate <file>
  - Ajv 검증 + 컴포넌트 type 등록 여부 + 누락 i18n 키 검사
  - exit 0 / 1

designer-cli import <file> --to <project-path>
  - AI가 만든 스키마를 디자이너의 schemas/drafts/ 로 이동
  - 중복 방지·이름 정규화

designer-cli publish <file> --target <static|api> [--url URL]
  - static: 지정 디렉토리에 복사
  - api: PUT /api/schemas/{id}
```

### 6.4 AI Skill 진입점 (Claude Code)
```
.claude/
├── skills/designer/SKILL.md
└── commands/
    ├── design-page.md       # 새 페이지 스키마 생성 → schemas/drafts/
    ├── design-add.md        # 컴포넌트 추가
    ├── design-modify.md     # 부분 수정
    └── design-validate.md   # designer-cli validate 호출
```
- AI는 `packages/designer-components/*/spec.json`을 Read로 직접 참조.
- 결과는 항상 파일 산출 (`schemas/drafts/*.schema.json`). 디자이너는 `designer-cli import`로 가져와 편집.

---

## 7. 디자이너 (Editor) 확장 — WYSIWYG 원칙

> **원칙**: 디자이너 화면 = 운영 렌더 화면. 두 결과는 **동일한 렌더 파이프라인**을 거친다. 디자이너는 그 위에 *디자이너 전용 오버레이*(선택 핸들·드래그 가이드·placeholder)만 추가로 그린다.

### 7.1 단일 렌더 파이프라인 강제
- 모든 신규 컴포넌트의 `render()`는 **viewer·editor에서 같은 함수**가 호출된다. 에디터 전용 분기 금지(`if (editing) ...`로 다른 모습 그리지 않는다).
- 컴포넌트가 디자이너 시점에 추가 표시가 필요하면, `render()` 외부의 **에디터 오버레이 레이어**에서 절대 위치로 덧입힌다(원본 DOM 변경 금지).
- 스타일은 **동일한 CSS 파일**을 viewer·editor 양쪽이 공유한다. 에디터 전용 클래스는 `.fjs-designer-*` 접두사로만 추가, 컴포넌트 자체 스타일에 끼어들지 않는다.

### 7.2 환경 패리티
- **viewport·breakpoint**: 에디터 캔버스의 실제 너비를 viewer에 그대로 전달한다. 반응형 props가 동일 breakpoint로 평가되도록 강제.
- **데이터 모킹**: 디자이너에서 사용한 mock 데이터 형태와 운영 데이터 스키마가 동일하면 시각 결과가 같음을 보장.
- **테마/토큰**: 에디터·viewer가 동일 ThemeProvider를 공유. 에디터 전용 chrome(툴바·패널)은 별도 root에 격리.

### 7.3 호스트 앱 합성
form-js-editor 본체는 수정하지 않는다. 확장은 **에디터 호스트 앱**에서 합성:

```js
import { FormEditor } from '@bpmn-io/form-js-editor';
import { DesignerComponentsModule } from '@your-org/designer-components';
import { DesignerTableModule } from '@your-org/designer-table';
import { DesignerPropsPanelModule } from '@your-org/designer-core/editor';
import { DesignerLivePreviewModule } from '@your-org/designer-core/editor';

const editor = new FormEditor({
  container: '#editor',
  additionalModules: [
    DesignerComponentsModule,
    DesignerTableModule,
    DesignerPropsPanelModule,    // propsSchema → 자동 패널
    DesignerLivePreviewModule,   // 우측 패널에 viewer 임베드
  ],
});
```

- **Live Preview**: form-js-viewer 인스턴스를 에디터의 `change` 이벤트에 구독시켜 즉시 재렌더.
- **propsSchema 자동 패널**: form-js의 `propertiesProvider` 확장 포인트에 위젯 레지스트리를 끼움.

---

## 8. 워터마크 보호 (라이선스 의무)

| 보호 수단 | 구현 |
|---|---|
| 파일 무결성 | CI에서 `PoweredBy.js` 해시 검사. 변경 감지 시 빌드 실패. |
| DOM 가시성 E2E | Playwright: `.fjs-powered-by` 가시성·크기·overlap 자동 테스트. PR 게이트. |
| CSS 룰 검사 | 빌드 시 SCSS에서 `.fjs-powered-by`에 `display:none|visibility:hidden|opacity:0` 사용 시 실패. |
| 런타임 가드 (선택) | `MutationObserver`로 PoweredBy 노드 제거 시 콘솔 경고. |

이 4중 가드는 PRD §0 제약과 PRD §4 Acceptance Criteria #6의 직접 구현이다.

---

## 9. 보안 (운영 부팅 검증 중심)

| 항목 | 구현 |
|---|---|
| 스키마 검증 | 운영 부팅 시 Ajv. 실패한 스키마 차단 + 캐시 fallback. |
| 표현식 | FEEL 샌드박스 유지. eval 금지. |
| HTML/Markdown | DOMPurify 강제. iframe sandbox 속성 강제. |
| CSP | nonce 기반. 인라인 스크립트 금지. |
| 의존성 | CI license-gate + SBOM + Trivy/Snyk 스캔. |

> 인증·인가·감사로그 등 운영 상위 항목은 idea.md §1~§14에 후속 단계 청사진으로 보존. 1차 릴리스 범위 외.

---

## 10. 비기능 요구사항 (NFR)

| 영역 | 목표 |
|---|---|
| 운영 번들 크기 | designer-runtime 추가 분 ≤ 100KB gzip (form-js 제외) |
| 첫 렌더 | 빈 폼 LCP < 1.5s (참조 환경: 4G/Moto G4) |
| 스키마 검증 | 100KB 스키마 부팅 검증 < 50ms |
| 테이블 | 1만 행 가상화 스크롤 60fps 유지 |
| 접근성 | WCAG 2.2 AA — axe-core CI 게이트 |
| i18n 누락 | ko 사전 키 누락 시 빌드 실패 |
| 워터마크 | E2E 가시성 테스트 100% pass — PR 머지 게이트 |
| **WYSIWYG 충실도** | **디자이너 캔버스 ↔ viewer 렌더 결과 픽셀 diff ≤ 0.1% (디자이너 오버레이 영역 마스킹 후)** — Playwright 비교, PR 게이트 |

---

## 11. 테스트 전략

| 레벨 | 도구 | 범위 |
|---|---|---|
| 단위 | Vitest *(신규)* / Karma *(기존 form-js)* | propsSchema → 패널 변환, t() 추출, 컴포넌트 render |
| 통합 | Vitest + jsdom | additionalModules 등록·스키마 import·data binding |
| 시각/E2E | Playwright | Live Preview, Table 편집/필터/컬럼이동, 워터마크 가시성, JSON round-trip |
| Round-trip (Acceptance #4) | Playwright | 디자이너 저장 JSON → viewer 렌더 결과 스크린샷 비교 |
| **WYSIWYG (Acceptance #4-1)** | Playwright | **디자이너 캔버스 영역과 viewer 렌더 결과를 동일 viewport·data·theme로 캡처해 픽셀 diff. 디자이너 오버레이는 마스킹.** 컴포넌트마다 ≥1 케이스. |

**Acceptance Criteria 추적표**: §4의 10개 항목 각각에 대해 자동 테스트 1개 이상 매핑한다 (Phase 1 시작 시점에 매트릭스 작성).

---

## 12. 구현 단계 (Phase별)

PRD 1차 릴리스 = Phase 0 + Phase 1. 그 외는 후속.

### Phase 0 — 기반 (1~2주)
- 신규 패키지 스캐폴드: `designer-core`, `designer-components`, `designer-table`, `designer-i18n`, `designer-cli`
- CI license-gate + SBOM + 워터마크 무결성 검사
- `defineComponent` API 확정 (§4.2)
- `t()` 추출 도구 + ko 사전 누락 게이트

### Phase 1 — 1차 릴리스 본체 (4~6주)
- 신규 컴포넌트 6개 구현 (§5)
- propsSchema 자동 패널 + Live Preview
- JSON 배포 양 채널 어댑터 (§6.2)
- AI Skill + Slash commands + designer-cli (§6.3·§6.4)
- ko 사전 100% + 검증 메시지 ko
- Acceptance Criteria 10항목 자동 테스트 매트릭스 통과

### Phase 2+ (PRD §7 향후 확장)
- `designer-codegen` (JSON → JSX eject)
- `designer-data` / `designer-actions` / `designer-theme`
- 다국어 사전 (en 등) 추가
- 운영 인프라 (감사 로그·관찰가능성·feature flag·승인 워크플로) — idea.md §1~§14 참조

---

## 13. 결정·미결 사항 (PRD §6과 동기화)

| 코드 | 항목 | 본 TRD에서의 처리 |
|---|---|---|
| Q1 | 컴포넌트 라이브러리 베이스 | 기본값: Radix UI + Tailwind + CVA. Phase 0 spike 후 §3 갱신. |
| Q2 | 테이블 라이브러리 | 기본값: TanStack Table v8. Phase 0 spike 후 §3 갱신. |
| Q3 | AI 진입점 | 확정: Claude Code CLI only. (§6.4) |
| Q4 | eject | Future. designer-codegen은 Phase 2+. |
| Q5 | JSON 배포 | 확정: 정적·API 양쪽 모두. (§6.2) |
| Q6 | i18n | 확정: 패턴 도입, ko 1차. (§4.4) |
| Q7 | 협업/권한/BPMN/테마/마켓 | Out of scope. idea.md에 청사진 보존. |

---

## 14. 변경 관리

본 TRD는 PRD가 변경되거나 Phase 0 spike 결과로 §3이 확정될 때 갱신한다.
대규모 변경(패키지 추가/제거, 스키마 메이저 변경)은 별도 ADR 파일을 `docs/adr/`에 추가하고 본 문서에서 참조한다.
