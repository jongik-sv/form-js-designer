# Spec: chartPlaceholder 컴포넌트 — 화면설계서용 정적 차트 stub

## 1. Context & Why

`form-js-designer`로 화면설계 산출물을 만들 때, **실제 데이터 차트는 form-js의 표현 영역 밖**이다. 그러나 시안에는 "여기에 분기 매출 막대차트가 들어갑니다" 같은 자리가 빈번히 필요하다.

기존 우회는 두 가지였다:

1. `image` 컴포넌트 + 외부 URL — 시안마다 이미지 파일을 따로 관리해야 하고 표준화가 깨짐.
2. `card` placeholder — 텍스트만 들어가 시안 의도가 불명확.

본 컴포넌트 `chartPlaceholder`는 **번들 SVG 카탈로그(11종) 기반의 디자인 인텐트 stub**이다. 데이터 바인딩 없이 차트 종류만 고르면 그 종류에 맞는 표준 SVG가 표시되고, 시안 검토자는 "어떤 데이터 시각화가 들어갈 자리"인지 즉시 인식한다.

## 2. Goals / Non-goals

### Goals

- **시안 표준화**: 어느 시안에서나 "막대 차트"는 같은 모양으로 보임 → 시각적 노이즈 제거.
- **5환경 자동 전파**: designer-editor-host playground / VS Code markdown preview / VS Code custom editor / TipTap viewer / TipTap editor HOC 모두에서 동일 렌더 (`DesignerComponentsModule` 단일 등록 경로 활용).
- **CSP 영향 0**: 외부 fetch / `new Function` / eval 없음 — VS Code 웹뷰 CSP(unsafe-eval 미허용) 그대로 통과.
- **점진 확장 가능**: 새 차트 종류 추가 = `chartCatalog.ts` 항목 1개 + SVG 2장(full+thumbnail).

### Non-goals (v1)

- 실제 데이터 바인딩 (form data → 차트값) — 본 컴포넌트는 stub. 실데이터 차트가 필요하면 별도 컴포넌트로.
- 사용자 이미지 업로드/외부 URL 오버라이드 — 표준화 의도와 상충. Figma 캡처 등은 기존 `image` 컴포넌트 사용.
- 다이어그램(mermaid 류) 임베드 — 같은 stub 패턴 일반화 가능하지만 v1 범위 밖. 차후 `diagramPlaceholder` 별도.
- 외부 임베드(iframe, Notion, 지도) — 동일 사유로 v1 범위 밖.
- 인터랙션(클릭/툴팁/줌), 다국어 데이터 라벨, 차트별 커스텀 컬러.
- sparkline / 인라인 미니 차트 — 시안 의도가 다른 영역.

## 3. User-facing behavior

### 3.1 팔레트

`presentation` 그룹에 "차트" 항목으로 등장(`tree`와 같은 그룹). 아이콘은 막대 3개 + 축 모양의 단색 SVG.

### 3.2 캔버스 드롭 후 기본 모양

```
┌──────────────────────────────────────┐
│  분기별 매출 추이              ← title │
│ ┌──────────────────────────────────┐ │
│ │   [16:9 비율 막대 차트 SVG]       │ │
│ └──────────────────────────────────┘ │
│  설명 텍스트가 여기에 들어갑니다.   ← description │
└──────────────────────────────────────┘
```

- 16:9 고정 비율, 가로폭 100% (컨테이너에 fit).
- 기본 chartType은 `bar`.
- title/description은 비어있을 수 있음(빈 줄 미표시).

### 3.3 우측 properties panel

| 필드 | 위젯 | 기본값 | 비고 |
|---|---|---|---|
| `chartType` | enum select | `bar` | 11종 카탈로그 |
| `title` | i18n textfield | `''` | card.header과 동일 패턴 |
| `description` | i18n textfield | `''` | 단일줄. 멀티라인 필요 시 v2 |

`chartType` 변경 즉시 SVG 교체. title/description 편집 즉시 반영.

### 3.4 알 수 없는 chartType일 때

스키마에 카탈로그에 없는 `chartType`이 들어 있으면 **bar 폴백** + `console.warn('[chartPlaceholder] unknown chartType: <value>, falling back to bar')`. 화면이 비지 않게 함.

## 4. Data model

### 4.1 TypeScript

`ChartType` 유니온은 카탈로그가 SoT이므로 `chartCatalog.ts`에 정의하고 `propsSchema.ts`는 re-export만 한다.

```ts
// packages/designer-components/src/chartPlaceholder/chartCatalog.ts (SoT)

export type ChartType =
  | 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter'
  | 'stackedBar' | 'horizontalBar' | 'gauge' | 'heatmap' | 'treemap';
```

```ts
// packages/designer-components/src/chartPlaceholder/propsSchema.ts

import type { ChartType } from './chartCatalog';
export type { ChartType };

export interface ChartPlaceholderSchema {
  id: string;
  type: 'chartPlaceholder';
  chartType?: ChartType;
  title?: string;
  description?: string;
  [key: string]: unknown;
}
```

### 4.2 propsSchema (디자이너 properties panel)

```ts
export const chartPlaceholderPropsSchema: PropsSchema = {
  properties: {
    chartType: {
      type: 'enum',
      label: 'designer.components.chartPlaceholder.chartType',
      default: 'bar',
      enum: [
        'bar', 'line', 'pie', 'donut', 'area', 'scatter',
        'stackedBar', 'horizontalBar', 'gauge', 'heatmap', 'treemap',
      ] as const,
    },
    title: {
      type: 'i18n',
      label: 'designer.components.chartPlaceholder.title',
      default: '',
    },
    description: {
      type: 'i18n',
      label: 'designer.components.chartPlaceholder.description',
      default: '',
    },
  },
};
```

### 4.3 카탈로그 (chartCatalog.ts) — Single Source of Truth

```ts
export interface ChartCatalogEntry {
  type: ChartType;
  koLabel: string;       // enum select 옵션 라벨 ("막대", "선", ...)
  thumbnailSvg: string;  // 16~24px용 단순화 SVG (현재 미사용 — v2 팔레트 미리보기)
  fullSvg: string;       // 캔버스/런타임 표시용 16:9 SVG
}

export const CHART_CATALOG: readonly ChartCatalogEntry[] = [
  { type: 'bar',            koLabel: '막대',     thumbnailSvg: BAR_THUMB,            fullSvg: BAR_FULL },
  { type: 'line',           koLabel: '선',       thumbnailSvg: LINE_THUMB,           fullSvg: LINE_FULL },
  { type: 'pie',            koLabel: '파이',     thumbnailSvg: PIE_THUMB,            fullSvg: PIE_FULL },
  { type: 'donut',          koLabel: '도넛',     thumbnailSvg: DONUT_THUMB,          fullSvg: DONUT_FULL },
  { type: 'area',           koLabel: '영역',     thumbnailSvg: AREA_THUMB,           fullSvg: AREA_FULL },
  { type: 'scatter',        koLabel: '분산',     thumbnailSvg: SCATTER_THUMB,        fullSvg: SCATTER_FULL },
  { type: 'stackedBar',     koLabel: '누적막대', thumbnailSvg: STACKED_BAR_THUMB,    fullSvg: STACKED_BAR_FULL },
  { type: 'horizontalBar',  koLabel: '가로막대', thumbnailSvg: HORIZONTAL_BAR_THUMB, fullSvg: HORIZONTAL_BAR_FULL },
  { type: 'gauge',          koLabel: '게이지',   thumbnailSvg: GAUGE_THUMB,          fullSvg: GAUGE_FULL },
  { type: 'heatmap',        koLabel: '히트맵',   thumbnailSvg: HEATMAP_THUMB,        fullSvg: HEATMAP_FULL },
  { type: 'treemap',        koLabel: '트리맵',   thumbnailSvg: TREEMAP_THUMB,        fullSvg: TREEMAP_FULL },
] as const;

const CATALOG_INDEX = new Map(CHART_CATALOG.map((e) => [e.type, e]));

export function getChart(type: string | undefined): ChartCatalogEntry {
  if (type && CATALOG_INDEX.has(type as ChartType)) {
    return CATALOG_INDEX.get(type as ChartType)!;
  }
  // unknown → bar 폴백 + dev 경고
  if (type && !isProductionEnv()) {
    console.warn(`[chartPlaceholder] unknown chartType: "${type}", falling back to bar`);
  }
  return CATALOG_INDEX.get('bar')!;
}
```

**v1에서 `thumbnailSvg`는 정의만 하고 미사용** — 카탈로그 데이터 모양만 미리 안정화하고 v2에서 팔레트 미리보기/select 옵션 아이콘에 활용. 자산 22장은 v1에서 모두 작성(점진 확장 비용 0).

### 4.4 SVG 자산 작성 규약

**fullSvg (16:9, 보통 viewBox `0 0 320 180`)**:

- 단색 + 톤(`fill-opacity`) — 기존 `icons/index.tsx` 규약 일치.
- 색상은 `currentColor` 기반 → 다크/라이트 테마 자동 적응.
- 축, 격자, 라벨 텍스트는 최소화(예시 데이터처럼 보이지 않게 단순화).
- 바닥선/축 stroke는 `opacity: 0.3` 정도로 약하게.
- 시각적 의도가 즉시 읽히도록 핵심 요소만 (예: bar = 막대 5개, line = 단일 선 1개, pie = 원 + 1~2 분할).

**thumbnailSvg (24×24, viewBox `0 0 24 24`)**:

- fullSvg의 단순화 버전. 핵심 형태만(예: bar = 막대 3개).
- v2 select 옵션 옆 아이콘 / 팔레트 미리보기에 사용.

## 5. Rendering behavior

### 5.1 컴포넌트 구조

```tsx
function ChartPlaceholderRender(props: PureRenderProps<ChartPlaceholderSchema>) {
  const field = props.field;
  const entry = getChart(field.chartType);
  const title = field.title?.trim();
  const description = field.description?.trim();

  return (
    <div class="dc-chart-placeholder" data-component="chartPlaceholder" id={props.domId}>
      {title ? <div class="dc-chart-placeholder__title">{title}</div> : null}
      <div
        class="dc-chart-placeholder__canvas"
        // 인라인 SVG: VS Code webview CSP 영향 0 (외부 fetch 없음)
        dangerouslySetInnerHTML={{ __html: entry.fullSvg }}
        aria-label={`${entry.koLabel} 차트 자리`}
        role="img"
      />
      {description ? <div class="dc-chart-placeholder__description">{description}</div> : null}
    </div>
  );
}
```

### 5.2 CSS (요지)

- 컨테이너: `display: block; width: 100%`
- canvas: `aspect-ratio: 16 / 9; width: 100%`. `aspect-ratio` 미지원 fallback으로 `padding-top: 56.25%` 패턴 병행.
- title: 상단, `font-weight: 600`, 약간의 하단 마진.
- description: 하단 캡션, `font-size: 0.875em`, `opacity: 0.75`.
- SVG: `width: 100%; height: 100%; display: block`.

### 5.3 인라인 SVG 사용 근거

- VS Code 웹뷰 CSP에 외부 이미지 호스트 허용 추가 불필요.
- `asWebviewUri` 변환 필요 없음 → 환경별 분기 0.
- morphdom 기반 md preview 흐름과 충돌 없음(메모리 `project_vscode_preview_morphdom.md`: 자체 노드 보존 + 자식 교체 — `dangerouslySetInnerHTML`로 박힌 SVG는 `chartType` 변경 시 외곽 div는 그대로, 내부 SVG만 교체되므로 morphdom과 자연 양립).
- 번들 영향: 11×2=22장 SVG 인라인. 단순 도형 위주라 minify 후 ~30–50KB 예상. 현재 designer-components 번들 사이즈에 비해 미미.

## 6. 환경 매트릭스

`tree-component/plan.md` §환경 매트릭스와 동일 모델:

| 환경 | 표시 가능 | 추가 작업 | 마운트 경로 |
|---|:---:|:---:|---|
| designer-editor-host playground | ✅ | 없음 | `embeddedDesigner.tsx` → `DesignerComponentsModule` |
| VS Code markdown preview (read-only) | ✅ | 없음 | `src/markdown/preview.ts` → `customComponentsModule` |
| VS Code custom editor (편집) | ✅ | 없음 | `src/editor/customEditor.ts` → `customComponentsModule` |
| TipTap viewer | ✅ | 없음 | `src/mount/mountFormJs.ts` → `DesignerComponentsModule` |
| TipTap editor HOC (더블클릭 모달) | ✅ | 없음 | host 임베디드 모달 재사용 |

**핵심**: 등록은 `packages/designer-components/src/module.ts`의 `COMPONENTS` 배열 한 곳만 수정. 신규 PanelWidget이 없으므로 `designer-core` 영역은 무관(tree-component는 `TreeWidget` 때문에 core 변경이 필요했지만 chartPlaceholder는 0).

## 7. i18n

추가 키:

```
designer.components.chartPlaceholder.name        = "차트"
designer.components.chartPlaceholder.chartType   = "차트 종류"
designer.components.chartPlaceholder.title       = "제목"
designer.components.chartPlaceholder.description = "설명"
designer.components.chartPlaceholder.types.bar            = "막대"
designer.components.chartPlaceholder.types.line           = "선"
designer.components.chartPlaceholder.types.pie            = "파이"
designer.components.chartPlaceholder.types.donut          = "도넛"
designer.components.chartPlaceholder.types.area           = "영역"
designer.components.chartPlaceholder.types.scatter        = "분산"
designer.components.chartPlaceholder.types.stackedBar     = "누적막대"
designer.components.chartPlaceholder.types.horizontalBar  = "가로막대"
designer.components.chartPlaceholder.types.gauge          = "게이지"
designer.components.chartPlaceholder.types.heatmap        = "히트맵"
designer.components.chartPlaceholder.types.treemap        = "트리맵"
```

기존 `designer-i18n` 패턴을 따라 ko/en 번들에 동시 추가. en 번역은 카탈로그 entry의 type 문자열을 Title Case로(`bar` → `Bar`, `stackedBar` → `Stacked bar`).

## 8. tree-component와의 충돌 분석

`docs/designer/features/tree-component/plan.md`와의 영향 파일 교집합:

| 파일 | tree 변경 | chartPlaceholder 변경 | 충돌 위험 |
|---|---|---|---|
| `designer-components/src/module.ts` | `COMPONENTS` 배열에 `TreeComponent` append | `ChartPlaceholderComponent` append | ★ 낮음 (둘 다 배열 끝 추가 — git 3-way merge 자동 또는 1줄 수동 해결) |
| `designer-components/src/index.ts` | `TreeComponent` / `TreeSchema` barrel | `ChartPlaceholderComponent` / `ChartPlaceholderSchema` barrel | ★ 낮음 (export 추가) |
| `designer-components/src/icons/index.tsx` | `TreeIcon` 함수 추가 | `ChartIcon` 함수 추가 | ★ 낮음 (별도 함수) |
| `designer-cli/src/registry/cliRegistry.ts` | `DESIGNER_COMPONENTS_TYPES` set에 `'tree'` | `'chartPlaceholder'` 추가 | ★ 낮음 (set 항목) |
| `.claude/skills/form-designer/SKILL.md` §2.5 | tree 매핑 1줄 | chartPlaceholder 매핑 1줄 | ★ 낮음 (테이블 행) |

**겹치지 않는 영역**:
- chartPlaceholder는 `designer-core` 변경 없음 (PanelWidget 신규 등록 X).
- chartPlaceholder는 `customEditor.ts` `EDITOR_MODULES` / esbuild config 보강이 필요한 상황 없음 (자체 위젯 등록 0, dynamic import 0).

**권장 진행 순서**:

1. **순차** (가장 안전): tree-component PR이 main 머지된 직후 chart 작업 시작. 이 시점이면 module.ts/index.ts/cliRegistry.ts 등의 정확한 landing 좌표가 확정되어 plan.md의 라인 번호가 그대로 유효.
2. **병렬** (가능): 두 브랜치 모두 (a) 배열/set/export 끝에만 append, (b) icons/index.tsx에는 함수 추가만(기존 icon 함수 변경 금지), (c) 공유 파일 수정은 마지막 1커밋으로 묶기 — 충돌 윈도우 최소화.

본 spec은 **순차 가정**으로 작성 — tree-component 머지 완료 후 그 시점의 코드를 baseline으로 plan.md의 영향 파일 라인 번호가 작성됨.

## 9. 검증 체크리스트

순수 단위 테스트만으로는 끝내지 않음 (메모리 `feedback_e2e_browser_verify`). 환경별 visible Playwright 검증 병행.

### 9.1 단위 (vitest)

- `chartCatalog.test.ts`:
  - `getChart('bar')` → bar entry.
  - `getChart('unknown')` → bar entry (폴백) + `console.warn` 호출(spy).
  - `getChart(undefined)` → bar entry (폴백, 경고 없음 — empty input은 정상).
  - `CHART_CATALOG.length === 11`, 모든 type 유니크.
- `ChartPlaceholderRender.test.tsx`:
  - title/description 비어있으면 해당 노드 미렌더.
  - chartType별 SVG 교체 (innerHTML 일치 확인 또는 `data-chart-type` 속성으로 검증).
  - `aria-label`에 koLabel 포함.

### 9.2 빌드/타입체크

- `npm -w designer-components run build`
- `npm -w designer-cli run build`
- `npm -w designer-editor-host run typecheck`
- `npm -w designer-vscode-extension run build` (esbuild IIFE 번들)
- `npm -w designer-tiptap run build`

### 9.3 E2E (visible Playwright)

- **designer-editor-host**: 팔레트 "차트" → 캔버스 드롭 → bar SVG 표시 → properties panel에서 `chartType: pie` 선택 → SVG가 pie로 교체 → undo/redo 동작.
- **VS Code custom editor**: `.form-js` 파일 또는 `.form-js-block` 안의 chart 컴포넌트 편집 트리거 → 웹뷰에 동일 컴포넌트 출현 → properties panel 편집 → 저장 후 파일에 `chartType` 직렬화 확인.
- **VS Code markdown preview**: chart 컴포넌트 포함 .md 파일 → preview에서 SVG 표시 → 소스 .md 수정으로 chartType 변경 → preview SVG 교체 (morphdom 흐름 확인).
- **TipTap viewer**: 데모 페이지에서 chart 노드 → SVG 표시.
- **TipTap editor HOC**: 노드 더블클릭 → embedded modal 오픈 → properties panel에서 chartType 변경 → 모달 저장 → TipTap 문서 schema attribute 반영.

### 9.4 라운드트립

스키마 1개를 designer에서 작성 → VS Code preview에서 동일 렌더 → TipTap viewer에서 동일 렌더. 세 환경의 SVG hash 일치 확인.

### 9.5 VS Code 확장 패키징

`vsce package` 시 unscoped name 패턴 (메모리 `project_vsix_packaging_unscoped` 준수).

## 10. 위험 / Out of scope

### 위험

- **SVG 디자인 품질 22장 일관성**: 단색/톤 규약을 작성 시점에 SVG 디자인 가이드 1장으로 고정해 22장 디자인 편차 최소화 (plan.md §1 첫 task로 작성).
- **chartType enum 직렬화 변경 비용**: 카탈로그 type 키는 한 번 정해지면 외부 스키마(.form-js 파일)에 박히므로 **이름 변경 비용이 큼**. 11종 키 명명을 spec 단계에서 확정 (이 문서의 §4.1 ChartType 유니온이 SoT).
- **morphdom + dangerouslySetInnerHTML 충돌 재현 케이스**: chartType 변경 시 내부 SVG가 fully replace되는데, morphdom이 outer wrapper만 diff하면 안전. 하지만 morphdom이 SVG 내부 노드까지 deep-diff하려는 경우(드물지만) `key` 또는 `data-chart-type` 속성을 wrapper에 두어 morphdom이 inner를 통째 교체하도록 유도 — E2E §9.3에서 실증.
- **i18n 키 누락 시 raw 키 노출**: `designer.components.chartPlaceholder.types.heatmap` 등 11종 모두 ko/en 추가 필수. 누락 시 디자이너 select 옵션이 raw 키 그대로 표시. plan.md §3에서 i18n 추가를 별도 task로 분리.

### Out of scope (v1)

- 데이터 바인딩, 실제 차트 렌더 (mermaid/echarts/recharts 등 라이브러리 통합)
- 사용자 이미지 업로드 / 외부 URL 오버라이드
- 다이어그램(mermaid) / 외부 임베드(iframe, Notion, 지도) — 같은 stub 패턴 재사용은 v2 검토
- 차트별 색상 커스터마이즈, 다크모드 외 테마 적응
- 인터랙션(hover/툴팁/zoom)
- sparkline / inline 미니 차트
- 실제 차트 작성 도구로의 export(예: Excel/CSV 다운로드)

## 11. 결정 로그 (브레인스토밍 산물)

| 결정 | 값 | 이유 |
|---|---|---|
| 콘텐츠 종류 | 차트만 (다이어그램/임베드 제외) | YAGNI. 동일 stub 패턴 일반화는 v2에서 |
| 카탈로그 크기 | 11종 풀세트 | 화면설계서 사용 빈도 커버, 점진 확장 비용 미미 |
| 사용자 오버라이드 | 없음 (번들만) | 표준화 의도 보존, 이미지 박기는 기존 image 컴포넌트 |
| props | `chartType` + `title` + `description` | 한 컴포넌트로 시안 단위 자족 |
| 렌더 타겟 | 디자이너 + 런타임 + md preview (자동 5환경) | 모듈 1개 등록으로 자동 전파 |
| 자산 탑재 | TS 인라인 + 카탈로그 레지스트리 | CSP/asWebviewUri 분기 0 |
| 컴포넌트 type id | `chartPlaceholder` | camelCase, `tabPanel` 스타일 일치, "placeholder" 의도 명시 |
| 팔레트 표시 이름 | `차트` | 간결 |
| 렌더 배치 | title 상단 + description 하단 캡션 | 일반적인 차트 캡션 관례 |
| description 위젯 | `i18n` 단일줄 | card.header과 동일 패턴 |
| 기본 chartType | `bar` | 가장 일반적 |
| 비율 | 16:9 고정 | BI 대시보드 표준 |
| 알 수 없는 chartType | bar 폴백 + console.warn | 화면 비지 않음 + 개발자 인지 |
