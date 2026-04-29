# Plan: tree 컴포넌트 — designer + VS Code 확장 + TipTap 세 환경 동작

## Context

`form-js-designer`에 `tree` 커스텀 컴포넌트를 추가한다. 동작 요구:

1. **디자이너(Editor)의 props panel에서 트리 구조 직접 작성** — 시각적 트리 편집기.
2. **뷰어(Viewer)에서 사용자 편집 UI 없음** — read-only 표시만.
3. 세 가지 호스트 환경 모두에서 동작:
   - (a) `designer-editor-host` 웹 playground
   - (b) **VS Code 확장** (`packages/designer-vscode-extension`) — markdown preview(read-only) + custom editor 웹뷰(편집)
   - (c) **TipTap 노드** (`packages/designer-tiptap`) — viewer(read-only) + editor HOC(더블클릭 → embedded modal 편집)
4. **코드 작성 전에 "직접 편집이 되는지부터 확인"** — feasibility 우선. 안 되면 dataSource 폴백.

## Feasibility — 핵심 결론

| 경로 | 가능? | 근거 |
|------|------|------|
| **A. props panel에서 직접 재귀 트리 편집** | 조건부 YES | `PanelWidgetRegistry`(`packages/designer-core/src/panel/PanelWidgetRegistry.ts:26`) 외부 등록 가능, `createDefaultRegistry` export(`packages/designer-core/src/index.ts:21`). 빌트인 8종에 `tree`만 추가. |
| **B. dataSource(FEEL/fieldName) 폴백** | YES — 신규 위젯 0 | form-js viewer `useExpressionEvaluation`(`node_modules/@bpmn-io/form-js-viewer/dist/index.es.js:908`) + 기존 `ExpressionWidget`(`packages/designer-core/src/panel/widgets/ExpressionWidget.tsx`) 재사용. table 빈상태 가드 패턴 차용. |

**잔존 미지수 (Phase 0에서 실증)**:
1. `propsSchemaToPanel` → `panelEntryAdapter`(`packages/designer-editor-host/src/modules/PropsPanelService.ts:88-134`)가 임의 위젯의 reactive UI를 form-js 네이티브 entry로 통과시키는지. (편집 환경 3곳 공통)
2. **VS Code custom editor 웹뷰**(`packages/designer-vscode-extension/src/editor/customEditor.ts`)의 `EDITOR_MODULES`(L63-71)가 host의 `PropsPanelModule`을 포함하는지, 포함한다면 widget registry가 동일 인스턴스로 공유되는지.
3. esbuild IIFE 번들(웹뷰)에서 코어의 `createDefaultRegistry` 트리쉐이킹 누락이나 Preact compat 별칭 충돌이 없는지(메모리: `project_vscode_webview_csp.md` — Ajv lazy-init/process polyfill/Preact alias 주의).

## 환경 매트릭스 — 등록·렌더 흐름

| 환경 | TreeView render | props panel TreeWidget 필요? | 마운트 경로 |
|------|:---:|:---:|---|
| designer-editor-host (playground) | ✅ | ✅ | `embeddedDesigner.tsx:6` → `DesignerComponentsModule` |
| VS Code markdown preview (read-only) | ✅ | ❌ | `src/markdown/preview.ts:24,86-91` → `customComponentsModule`, `readOnly:true` |
| VS Code custom editor (webview) | ✅ | ✅ | `src/editor/customEditor.ts:19,30-32,95-100` → `customComponentsModule` + host modules |
| TipTap viewer | ✅ | ❌ | `src/mount/mountFormJs.ts:29` → `DesignerComponentsModule`, viewer mode |
| TipTap editor HOC (더블클릭 모달) | ✅ | ✅ | `src/editor/withDesigner.ts:54-76` → `mountEmbeddedEditorModal` (host 재사용) |

**핵심 사실**: 등록은 `packages/designer-components/src/module.ts:48-52` `COMPONENTS` 배열 한 곳만 수정하면 다섯 마운트 경로 모두에 자동 전파된다 (`customComponentsModule`은 `DesignerComponentsModule`을 확장 — `packages/designer-vscode-extension/src/components/index.ts:30-34`). TipTap editor HOC는 host의 embedded modal을 재호출하므로 별도 작업 없음.

**위젯 등록은 이슈가 다름**: `TreeWidget`은 `designer-core`의 `BUILTIN_WIDGETS`(`src/panel/widgets/index.ts:27-36`)에 추가. host의 `PropsPanelService`가 `createDefaultRegistry()`로 인스턴스를 만들기 때문에(`packages/designer-editor-host/src/modules/PropsPanelService.ts:72`), host를 import하는 모든 편집 환경(playground, VS Code customEditor, TipTap embedded modal)이 자동 공유. 이를 Phase 0에서 실증.

## 진행 순서

### Phase 0 — Spike (코드 ≤ 50 LOC, 세 편집 환경 모두 visible 검증)

1. `packages/designer-core/src/panel/widgets/TreeWidget.tsx` — **stub만**:
   - `render(value)` → `<pre>{JSON.stringify(value)}</pre>`
   - `edit(value, onChange)` → `<textarea>` 1개 (JSON 직접 편집)
   - `validate` → 항상 valid
2. `packages/designer-core/src/panel/widgets/index.ts` — `BUILTIN_WIDGETS`에 `tree: TreeWidget` 한 줄.
3. `packages/designer-core/src/types.ts:46` — `PropsSchema` `type` 유니온에 `'tree'` 추가.
4. `packages/designer-components/src/tree/index.tsx` — `defineComponent` 최소형 (placeholder render).
5. `packages/designer-components/src/{index.ts,module.ts}` — barrel + `COMPONENTS` 등록.

**Spike 합격 기준** — `feedback_e2e_browser_verify` 준수, 셋 다 visible Playwright:

- **Spike-A. designer-editor-host playground** (`npm run dev -w @form-js-designer/designer-editor-host`):
  - 팔레트 "트리" → 캔버스 드롭 → outline 노출 → `UnknownWidgetError` 없음.
  - props panel에 `tree` stub textarea 마운트, JSON 입력 → schema 반영.
  - undo/redo 동작.
- **Spike-B. VS Code custom editor 웹뷰** (`npm run build -w @form-js-designer/designer-vscode-extension` 후 F5 launch):
  - `.form-js` 파일 또는 `.form-js-block` markdown 안의 편집 트리거 → 웹뷰에 동일 컴포넌트 출현.
  - props panel에 `tree` 위젯 마운트(EDITOR_MODULES가 PropsPanel 포함하는지 실증). 미마운트면 → 결과로 환경별 보강 작업 식별.
  - 저장(`vscode.workspace.applyEdit`) 후 파일에 트리 노드 직렬화 확인.
- **Spike-C. TipTap editor HOC** (`npm run dev -w @form-js-designer/designer-tiptap`):
  - 데모 페이지에서 form-js 노드 더블클릭 → embedded modal 오픈 → props panel에 tree 위젯 마운트.
  - 모달 저장 → TipTap 문서의 schema attribute에 트리 반영.

**합격 → Phase 1A. 불합격(편집 환경 1개 이상 실패) → Phase 1B 폴백.**

### Phase 1A — 본 구현 (Spike 합격 시)

- `TreeWidget.tsx` stub을 진짜 재귀 트리 편집 UI로 교체:
  - depth 표시, [+자식][삭제][이름 inline edit][+ 루트 추가]
  - 가드: id 중복/순환/최대 깊이
  - 순수 헬퍼 (`addChildAtPath`/`deleteNodeAtPath`/`updateNodeAtPath`) — vitest 단위 테스트
- `TreeComponent` 완성 (`packages/designer-components/src/tree/`):
  - `defineComponent({ type:'tree', name:'트리', group:'presentation', keyed:false, pathed:false, escapeGridRender:true, icon:TreeIcon, propsSchema, create, render })`
  - `propsSchema = { label, nodes:{ type:'tree', default:[] }, expandedByDefault, showGuides }`
  - `render` = `TreeView` (재귀 표시 + 펼침/접힘만, 사용자 편집 X)
- 환경별 표시 검증 (read-only 환경 포함):
  - VS Code markdown preview에서 `.form-js-block` 내 트리 정상 렌더 (메모리: `project_vscode_preview_morphdom.md` 준수 — 기존 노드 보존, 자식 교체).
  - TipTap viewer 노드에서 트리 정상 렌더.

### Phase 1B — 폴백 (Spike 불합격 시)

- `propsSchema = { label, dataSource:{ type:'expression', default:'=[]' }, labelKey:'label', childrenKey:'children' }` — 신규 위젯 0.
- `TreeRender`에서 `useExpressionEvaluation(field.dataSource)` 호출 → 결과 배열을 `labelKey`/`childrenKey`로 재귀 렌더.
- 빈/비배열 결과 → "Nothing to show." (table 패턴 차용).
- 신규 컴포넌트 생성 시 `dataSource: '=${id}'` 자동 초기화.
- 폴백은 신규 위젯이 필요 없으니 환경별 미지수도 사라짐 (모든 환경에서 자동 동작).

## 영향 파일 (전체 후보)

### 공통 (Phase 0/1A/1B 공통)
| 파일 | 변경 |
|------|------|
| `packages/designer-components/src/tree/{index.tsx,propsSchema.ts,Tree.css,nodeId.ts,spec.json}` | 신규 |
| `packages/designer-components/src/icons/index.tsx` | `TreeIcon` 추가 |
| `packages/designer-components/src/index.ts` | `TreeComponent`/`TreeSchema` barrel |
| `packages/designer-components/src/module.ts` (L48-52) | `COMPONENTS` 배열에 `TreeComponent` 추가 |

### Phase 0/1A 한정 (A 경로)
| 파일 | 변경 |
|------|------|
| `packages/designer-core/src/types.ts` (L46) | `PropsSchema` `type` 유니온에 `'tree'` 추가 |
| `packages/designer-core/src/panel/widgets/TreeWidget.tsx` | 신규 (stub → 본 구현) |
| `packages/designer-core/src/panel/widgets/index.ts` (L27-36) | `BUILTIN_WIDGETS`에 `tree` 한 줄 |
| `packages/designer-core/src/panel/propsSchema.meta.json` | `type` enum에 `'tree'` 추가 |

### Phase 1B 한정 (B 폴백)
| 파일 | 변경 |
|------|------|
| `packages/designer-components/src/tree/index.tsx` | `useExpressionEvaluation` 사용 render |
| `packages/designer-components/src/tree/propsSchema.ts` | `dataSource` 등 (신규 위젯 X) |

### 환경별 보강 (Spike 결과에 따라 추가)
| 파일 | 발생 조건 |
|------|---------|
| `packages/designer-vscode-extension/src/editor/customEditor.ts` (`EDITOR_MODULES` L63-71) | Spike-B에서 PropsPanelModule 누락 발견 시 |
| `packages/designer-vscode-extension/esbuild.config.mjs` (define/alias L52,68-71) | TreeWidget이 코어에서 트리쉐이킹되거나 Preact compat 충돌 시 |
| `packages/designer-vscode-extension/src/components/index.ts` | `customComponentsModule` 자동 확장이 깨질 때만 (현재는 자동) |

### 메타/문서
| 파일 | 변경 |
|------|------|
| `packages/designer-cli/src/registry/cliRegistry.ts` | `tree` 항목 |
| `.claude/skills/form-designer/SKILL.md` (§2.B 표 + §2.5 매핑) | tree 행 + "조직도/권한 트리" 매핑 1줄 |

## 재사용 자산

- `defineComponent` (`packages/designer-core/src/defineComponent.ts:68-121`)
- `PanelWidgetRegistry` / `createDefaultRegistry` (`packages/designer-core/src/panel/PanelWidgetRegistry.ts:26`, `index.ts:21`)
- `PanelWidget` 인터페이스 (`packages/designer-core/src/panel/types.ts:55-62`)
- 위젯 패턴: `ExpressionWidget.tsx` (B 폴백 시 그대로 매핑)
- form-js builtin: `useExpressionEvaluation` (`node_modules/@bpmn-io/form-js-viewer/dist/index.es.js:908`)
- 아이콘 viewBox 규약: `packages/designer-components/src/icons/index.tsx:34-72`
- 컴포넌트 등록: `packages/designer-components/src/module.ts:48-52`
- VS Code 웹뷰 빌드 패턴: `packages/designer-vscode-extension/esbuild.config.mjs` (Preact compat alias, process polyfill)
- TipTap embedded modal 호출: `packages/designer-tiptap/src/editor/withDesigner.ts:54-76`

## 검증 체크리스트

순수 단위 테스트만으로는 끝내지 않음 (`feedback_e2e_browser_verify`). 세 환경 모두 visible Playwright.

- **단위**: `TreeWidget` 순수 헬퍼 (`addChildAtPath`/`deleteNodeAtPath`/`updateNodeAtPath`) — vitest.
- **빌드/타입**: 
  - `npm -w @form-js-designer/designer-core run build`
  - `npm -w designer-components run build`
  - `npm -w designer-editor-host run typecheck`
  - `npm -w designer-vscode-extension run build`
  - `npm -w designer-tiptap run build`
- **E2E (visible) 환경별**:
  - designer-editor-host: `npm run test:e2e -w @form-js-designer/designer-editor-host`
  - designer-vscode-extension: `npm run test:e2e -w @form-js-designer/designer-vscode-extension` (preview/customEditor 시나리오 모두)
  - designer-tiptap: `npm run test:e2e -w @form-js-designer/designer-tiptap`
- **라운드트립**: 디자이너에서 만든 트리 → VS Code preview에서 동일 렌더 → TipTap viewer에서 동일 렌더 (schema JSON 1개로 세 환경 동일성 확인).
- **VS Code 확장 패키징**: `vsce package` 시 unscoped name 패턴 (`project_vsix_packaging_unscoped` 메모리 준수).

## 위험 / 비범위

- **Spike-B 실패 가능성** (가장 높은 위험): VS Code customEditor의 `EDITOR_MODULES`에 PropsPanelModule 미포함이면 host의 propPanel 추가 필요. 포함이라도 esbuild IIFE에서 widget registry가 별도 인스턴스로 평가되면 등록이 안 보일 수 있음. 둘 다 Spike에서 실증 후 보강.
- **VS Code 웹뷰 CSP**: TreeWidget 본 구현이 동적 코드 평가/`new Function`/eval 쓰지 않도록(메모리 `project_vscode_webview_csp` 준수). JSON.parse만 허용.
- **morphdom preview 충돌**: tree DOM이 펼침/접힘 토글로 자식 교체 시 morphdom과 충돌하지 않게 키/data-attr 안정화 (메모리 `project_vscode_preview_morphdom` 준수).
- **드래그 재정렬, 다중 선택, 노드 메타(아이콘/링크/조건부 표시) 풀편집** — v1 비범위.
- **A→B 전환 트리거**: Spike 합격 기준 중 하나라도 실패 시 즉시 폴백 — 우회 시도 시간 함정 회피.
- **B 폴백 한계**: 디자이너에서 시각적 트리 작성 불가, FEEL/JSON 직접 작성. 사용자 1차 의도와 다소 어긋나지만 동작 보장 우선.
