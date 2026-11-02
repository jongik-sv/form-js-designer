# Plan: chartPlaceholder 컴포넌트 — 단일 phase 구현

본 plan은 [`spec.md`](./spec.md)의 단일 phase 구현 계획이다. **선결 조건: `tree-component` PR이 main에 머지된 후 시작.** 그 시점의 코드를 baseline으로 영향 파일/라인을 기재한다 (현재 작성 시점 라인 번호는 tree 머지로 ±몇 줄 이동 가능).

## 0. 사전 확인 (Gate)

작업 시작 직전 반드시 확인:

- [ ] `packages/designer-components/src/module.ts`의 `COMPONENTS` 배열에 `TreeComponent`가 포함되어 있다 (tree 머지 완료 시그널).
- [ ] `packages/designer-components/src/index.ts`에 `TreeComponent` / `TreeSchema` export가 존재한다.
- [ ] `packages/designer-cli/src/registry/cliRegistry.ts`의 `DESIGNER_COMPONENTS_TYPES` set에 `'tree'`가 있다.
- [ ] `npm -w designer-components run build` / `npm -w designer-vscode-extension run build` / `npm -w designer-tiptap run build`가 main에서 모두 green.

위 4개 모두 충족이 아니면 본 plan 시작 보류.

## 1. 작업 순서

### Task 1.1 — SVG 디자인 가이드 1장 작성 (자산 작업 일관성 확보)

**산출물**: `docs/designer/features/chart-placeholder/svg-style-guide.md`

내용:

- viewBox 표준: full = `0 0 320 180` (16:9), thumbnail = `0 0 24 24`.
- 색상: `currentColor` 단일 사용. 톤은 `fill-opacity` (0.15 / 0.35 / 0.6 / 1).
- 축/격자: `opacity: 0.3`, `stroke-width: 1`.
- 데이터 요소(막대/선/파이 분할 등): 핵심 형태만 — 막대 5개 / 라인 1개 / 파이 분할 2~3개 등.
- 텍스트 미포함 (라벨/숫자 없음 — 시안 의도 직접 인식 우선).
- 배경 채움 없음(투명) — 컨테이너 배경 상속.

이 가이드 1장이 SVG 22장의 디자인 편차를 최소화한다. **이 task가 가장 먼저 끝나야 하며, 결과를 사용자가 1차 검토한다 (한 장 샘플 SVG 첨부 권장)**.

### Task 1.2 — SVG 자산 22장 작성

**산출물**: `chartCatalog.ts`에 const 문자열로 임베드되는 SVG 22장.

`chartCatalog.ts` 파일 내부에 다음 형태의 SVG 모듈을 정의:

```ts
// fullSvg 11종
const BAR_FULL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" ...>...</svg>`;
// ...
const TREEMAP_FULL = `<svg ...>...</svg>`;

// thumbnailSvg 11종
const BAR_THUMB = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ...>...</svg>`;
// ...
const TREEMAP_THUMB = `<svg ...>...</svg>`;
```

작성 순서: bar → line → pie → donut → area → scatter → stackedBar → horizontalBar → gauge → heatmap → treemap (단순 → 복잡 순). 각 차트 fullSvg + thumbnailSvg 한 쌍씩 마치고 다음으로.

### Task 1.3 — `chartCatalog.ts` 작성

**신규**: `packages/designer-components/src/chartPlaceholder/chartCatalog.ts`

내용:

- `ChartType` 유니온 export (11종).
- `ChartCatalogEntry` interface.
- 22장 SVG const (Task 1.2 산출).
- `CHART_CATALOG` 상수 (11 entries).
- `CATALOG_INDEX` Map.
- `getChart(type)` helper (unknown → bar 폴백 + dev warn).
- `isProductionEnv` import는 `@form-js-designer/designer-core`에서.

### Task 1.4 — propsSchema.ts 작성

**신규**: `packages/designer-components/src/chartPlaceholder/propsSchema.ts`

내용 (spec.md §4):

- `ChartType` re-export from `chartCatalog`.
- `ChartPlaceholderSchema` interface.
- `chartPlaceholderPropsSchema: PropsSchema` (chartType enum / title i18n / description i18n).

### Task 1.5 — spec.json 작성

**신규**: `packages/designer-components/src/chartPlaceholder/spec.json`

```json
{
  "type": "chartPlaceholder",
  "name": "designer.components.chartPlaceholder.name",
  "group": "presentation",
  "propsSchema": {
    "properties": {
      "chartType": {
        "type": "enum",
        "label": "designer.components.chartPlaceholder.chartType",
        "default": "bar",
        "enum": ["bar","line","pie","donut","area","scatter","stackedBar","horizontalBar","gauge","heatmap","treemap"]
      },
      "title": {
        "type": "i18n",
        "label": "designer.components.chartPlaceholder.title",
        "default": ""
      },
      "description": {
        "type": "i18n",
        "label": "designer.components.chartPlaceholder.description",
        "default": ""
      }
    }
  }
}
```

### Task 1.6 — `ChartPlaceholder.css` 작성

**신규**: `packages/designer-components/src/chartPlaceholder/ChartPlaceholder.css`

요지:

```css
.dc-chart-placeholder {
  display: block;
  width: 100%;
}
.dc-chart-placeholder__title {
  font-weight: 600;
  margin-bottom: 0.5em;
}
.dc-chart-placeholder__canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
  /* aspect-ratio 미지원 fallback */
  position: relative;
  overflow: hidden;
}
.dc-chart-placeholder__canvas > svg {
  display: block;
  width: 100%;
  height: 100%;
}
.dc-chart-placeholder__description {
  font-size: 0.875em;
  opacity: 0.75;
  margin-top: 0.5em;
}
```

`aspect-ratio` 미지원 환경 추가 fallback이 필요하면 padding-top 56.25% 패턴을 wrapper로 추가.

### Task 1.7 — `index.tsx` 작성

**신규**: `packages/designer-components/src/chartPlaceholder/index.tsx`

내용 (spec.md §5.1 + tree/index.tsx 구조 차용):

- `import { defineComponent } from '@form-js-designer/designer-core'`
- `ChartPlaceholderRender` 함수 (PureRenderProps 시그니처).
- `dangerouslySetInnerHTML`로 fullSvg 삽입.
- `aria-label`/`role="img"` 접근성.
- `defineComponent`로 export:
  ```ts
  defineComponent<ChartPlaceholderSchema>({
    type: 'chartPlaceholder',
    name: '차트',
    group: 'presentation',
    icon: ChartIcon,
    keyed: false,
    pathed: false,
    escapeGridRender: true,
    propsSchema: chartPlaceholderPropsSchema,
    create: (options = {}) => ({
      type: 'chartPlaceholder',
      chartType: 'bar',
      title: '',
      description: '',
      ...options,
    }),
    render: ChartPlaceholderRender,
  });
  ```

### Task 1.8 — `ChartIcon` 추가

**수정**: `packages/designer-components/src/icons/index.tsx`

기존 `TreeIcon` 다음에 `ChartIcon` 함수 export 추가 (54×54 viewBox, currentColor, 막대 3개 + 축 모양):

```tsx
export const ChartIcon: ComponentType<IconProps> = (props) => (
  <svg {...SVG_BASE} {...props}>
    {/* 축 */}
    <line x1={10} y1={44} x2={46} y2={44} stroke="currentColor" strokeWidth={2} />
    <line x1={10} y1={10} x2={10} y2={44} stroke="currentColor" strokeWidth={2} />
    {/* 막대 3개 */}
    <rect x={16} y={28} width={6} height={14} fill="currentColor" fillOpacity={0.6} />
    <rect x={26} y={20} width={6} height={22} fill="currentColor" fillOpacity={0.4} />
    <rect x={36} y={32} width={6} height={10} fill="currentColor" fillOpacity={0.8} />
  </svg>
);
```

### Task 1.9 — module.ts에 등록

**수정**: `packages/designer-components/src/module.ts`

L23 (현재 tree import 다음 줄): `ChartPlaceholderComponent` import 추가.

```ts
import { ChartPlaceholderComponent } from './chartPlaceholder/index';
```

L31 (현재 `COMPONENTS` 배열): 끝에 추가.

```ts
const COMPONENTS = [
  CardComponent, TabsComponent, ModalComponent, TabPanelComponent, TreeComponent, ChartPlaceholderComponent,
] as const;
```

L10 docstring (선택): "Card/Tabs/Modal/TabPanel/Tree/ChartPlaceholder" 추가 — 가독성용. 머지 충돌 가능성 있으면 생략 가능.

### Task 1.10 — barrel export

**수정**: `packages/designer-components/src/index.ts`

L6 다음에 추가:

```ts
export { ChartPlaceholderComponent } from './chartPlaceholder/index';
```

L13 다음에 추가:

```ts
export type { ChartPlaceholderSchema, ChartType } from './chartPlaceholder/propsSchema';
```

L18 다음에 추가:

```ts
export { chartPlaceholderPropsSchema } from './chartPlaceholder/propsSchema';
```

### Task 1.11 — cliRegistry 동기화

**수정**: `packages/designer-cli/src/registry/cliRegistry.ts`

`DESIGNER_COMPONENTS_TYPES` set (현재 L39–44)에 `'chartPlaceholder'` 추가:

```ts
const DESIGNER_COMPONENTS_TYPES = new Set([
  'card',
  'tabs',
  'modal',
  'tree',
  'chartPlaceholder',
]);
```

### Task 1.12 — i18n 키 추가

**수정**: `packages/designer-i18n` 패키지의 ko/en 번들

추가 키 (spec.md §7):

- `designer.components.chartPlaceholder.name` = `"차트"` / `"Chart"`
- `designer.components.chartPlaceholder.chartType` = `"차트 종류"` / `"Chart type"`
- `designer.components.chartPlaceholder.title` = `"제목"` / `"Title"`
- `designer.components.chartPlaceholder.description` = `"설명"` / `"Description"`
- `designer.components.chartPlaceholder.types.<11종>` 각각 ko/en

Task 작업 시 designer-i18n의 실제 파일 구조(ko.ts/en.ts 또는 messages.json 류)를 확인하고 동일 패턴으로 추가. 누락 시 select 옵션이 raw 키 그대로 표시되므로 Task 1.13 검증에서 반드시 확인.

### Task 1.13 — form-designer SKILL.md 매핑 추가

**수정**: `.claude/skills/form-designer/SKILL.md`

§2.5 자연어 시안 → 컴포넌트 매핑 가이드 표(L91~)에 chartPlaceholder 행 추가:

| 시안 요소 | 매핑 type | 보조 메모 |
|---|---|---|
| 차트 / 그래프 / 시각화 자리 / 막대 차트 / 파이 차트 / "여기에 차트" 등 | `chartPlaceholder` | `chartType` 11종 중 시안에 가장 가까운 것 선택. 데이터 바인딩 없는 시각 stub. 실데이터 차트 필요 시 별도 컴포넌트 검토. |

§2 컴포넌트 표가 따로 있다면 그곳에도 1줄 추가.

### Task 1.14 — 단위 테스트

**신규**:
- `packages/designer-components/src/chartPlaceholder/__tests__/chartCatalog.test.ts`
- `packages/designer-components/src/chartPlaceholder/__tests__/ChartPlaceholderRender.test.tsx`

내용은 spec.md §9.1 그대로 작성.

### Task 1.15 — E2E (visible) — 5환경

spec.md §9.3 시나리오 별도 PR 또는 같은 PR 마지막 commit으로:

- `packages/designer-editor-host/e2e/chart-placeholder.spec.ts`
- `packages/designer-vscode-extension/e2e/chart-placeholder.spec.ts` (preview + customEditor 시나리오 모두)
- `packages/designer-tiptap/e2e/chart-placeholder.spec.ts` (viewer + editor HOC)

기존 tree-component E2E를 템플릿으로 복제 후 chart 시나리오로 수정.

## 2. 영향 파일 (전체)

### 신규

| 경로 | 내용 |
|---|---|
| `packages/designer-components/src/chartPlaceholder/index.tsx` | Render + defineComponent |
| `packages/designer-components/src/chartPlaceholder/propsSchema.ts` | TS 타입 + propsSchema |
| `packages/designer-components/src/chartPlaceholder/chartCatalog.ts` | 카탈로그 + SVG 22장 인라인 + getChart() |
| `packages/designer-components/src/chartPlaceholder/spec.json` | 팔레트 메타 |
| `packages/designer-components/src/chartPlaceholder/ChartPlaceholder.css` | 스타일 |
| `packages/designer-components/src/chartPlaceholder/__tests__/chartCatalog.test.ts` | 단위 |
| `packages/designer-components/src/chartPlaceholder/__tests__/ChartPlaceholderRender.test.tsx` | 단위 |
| `docs/designer/features/chart-placeholder/svg-style-guide.md` | 디자인 가이드 |

### 수정

| 파일 | 변경 |
|---|---|
| `packages/designer-components/src/module.ts` | import 1줄 + COMPONENTS 배열 1항목 추가 |
| `packages/designer-components/src/index.ts` | barrel export 3줄 추가 |
| `packages/designer-components/src/icons/index.tsx` | `ChartIcon` 함수 1개 export 추가 |
| `packages/designer-cli/src/registry/cliRegistry.ts` | `DESIGNER_COMPONENTS_TYPES` set에 1항목 |
| `packages/designer-i18n/...` | ko/en 번들에 키 15개 (Task 1.12) |
| `.claude/skills/form-designer/SKILL.md` | §2.5 매핑 표에 1행 |

### 환경별 보강 (현재 발생 사유 없음 — 발생 시 plan 갱신)

| 파일 | 발생 조건 |
|---|---|
| `packages/designer-vscode-extension/src/editor/customEditor.ts` `EDITOR_MODULES` | chart 컴포넌트 등록 누락 발견 시 (현재 자동 전파 가정 — Task 1.15 E2E에서 실증) |
| `packages/designer-vscode-extension/esbuild.config.mjs` | dangerouslySetInnerHTML 또는 SVG 인라인 처리에서 esbuild 이슈 발생 시 (가능성 낮음) |

## 3. 재사용 자산

- `defineComponent` (`packages/designer-core/src/defineComponent.ts:68-121`)
- `PureRenderProps` 타입 (`packages/designer-core/src/types.ts`)
- `isProductionEnv` 헬퍼 (`packages/designer-core/src/envUtils.ts` — getChart의 dev warn에서 사용)
- 컴포넌트 등록: `packages/designer-components/src/module.ts:48-52` (tree 머지 후 라인 ±)
- 아이콘 viewBox 규약: `packages/designer-components/src/icons/index.tsx:26-32` (SVG_BASE)
- 기존 컴포넌트 구조 템플릿: `packages/designer-components/src/card/{index.tsx,propsSchema.ts,spec.json}`
- VS Code 웹뷰 빌드 패턴(메모리 `project_vscode_webview_csp.md` 준수)
- VS Code preview morphdom 패턴(메모리 `project_vscode_preview_morphdom.md` 준수)

## 4. 검증 체크리스트

순서대로 실행:

- [ ] **단위**: `npm -w designer-components run test -- chartPlaceholder`
- [ ] **타입체크**: `npm -w designer-components run typecheck`
- [ ] **빌드**:
  - [ ] `npm -w designer-components run build`
  - [ ] `npm -w designer-cli run build`
  - [ ] `npm -w designer-editor-host run build`
  - [ ] `npm -w designer-vscode-extension run build`
  - [ ] `npm -w designer-tiptap run build`
- [ ] **E2E (visible)**:
  - [ ] designer-editor-host: 팔레트 드롭 → SVG 표시 → chartType 변경 → SVG 교체 → undo/redo
  - [ ] VS Code customEditor: 편집 → 저장 → 파일 직렬화 확인
  - [ ] VS Code markdown preview: chart 포함 .md → preview SVG 표시 → 소스 변경 → preview 교체 (morphdom 흐름)
  - [ ] TipTap viewer: SVG 표시
  - [ ] TipTap editor HOC: 더블클릭 모달 → 편집 → 저장 → schema 반영
- [ ] **라운드트립**: 같은 스키마 JSON으로 designer / preview / tiptap 세 환경 SVG hash 일치
- [ ] **i18n 누락**: 디자이너 select 옵션이 raw 키(`designer.components.chartPlaceholder.types.bar` 등) 그대로 노출되지 않는지
- [ ] **VS Code 확장 패키징**: `vsce package` (메모리 `project_vsix_packaging_unscoped` 준수)
- [ ] **시안 매핑**: form-designer skill로 "분기별 매출 막대 차트가 들어갈 자리" 같은 자연어 의도가 chartPlaceholder + chartType=bar로 매핑되는지 (수동 1회)

## 5. 위험 / 비범위

### 위험

- **SVG 디자인 편차**: Task 1.1 가이드를 강제하면 22장 작성 일관성 ↑. 가이드 1장이 누락되면 11종이 들쭉날쭉 — 시안 표준화 의도 훼손.
- **morphdom inner SVG 교체**: chartType 변경 시 wrapper div는 보존되고 내부 SVG만 교체되어야 함. wrapper에 `data-chart-type={chartType}` 속성을 두어 morphdom이 그 변화를 감지하고 inner를 교체하도록 유도(Task 1.7 ChartPlaceholderRender 구현 시 반영) — E2E preview 시나리오에서 실증.
- **enum 키 명명 동결**: 11종 type 키는 외부 스키마(.form-js)에 직렬화되므로 머지 후 변경 비용이 큼. spec.md §4.1 ChartType 유니온이 SoT — 변경 시 마이그레이션 필요.
- **i18n 키 누락 검증의 사일런트성**: select 옵션이 raw 키 그대로 노출되어도 빌드/테스트는 green. Task 1.12 수동 검증 + E2E §4 i18n 항목 필수.
- **tree-component 머지 지연**: 본 plan 시작 조건 미충족 상태가 길어지면 baseline 라인 번호 재확인 필요. §0 Gate 재실행으로 대응.

### 비범위

- 실제 데이터 차트 라이브러리 통합 (mermaid/echarts/recharts 등)
- 사용자 이미지 업로드, 외부 URL 오버라이드
- 다이어그램(mermaid) / 외부 임베드 — v2 stub 패턴 일반화 시 검토
- 차트별 색상 커스터마이즈
- 인터랙션, sparkline, 차트 export
- 다국어 데이터 라벨 (라벨 자체가 시안에 없으므로 불필요)
