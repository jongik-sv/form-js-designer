# WP-12: 컴포넌트/행 리사이즈 핸들

> schedule: 2026-05-06 ~ 2026-05-15
> baseline: 모든 입력 컴포넌트는 form-js viewer CSS 변수(`--form-field-height: 36px`, textarea `75px`)로 픽셀 고정. row 는 `flex: auto` 로 자식 max 에 맞춤.
> WBS: [../../WBS.md#wp-12](../../WBS.md)

## 목적
캔버스에서 사용자가 직접 컴포넌트와 행의 높이를 드래그로 조절할 수 있게 한다. 디자이너에서 설정한 높이는 form-js viewer 에서도 동일하게 렌더되어야 한다(WYSIWYG 동등성, ADR-0001 D1 단일 파이프라인 정신 유지).

## Task 목록
| ID | 제목 | 모델 | 기간 |
|----|------|------|------|
| [TSK-12-01](../TSK-12-01/design.md) | useElementResize 훅 + ResizeHandle 컴포넌트 | sonnet | 05-06 ~ 05-07 |
| [TSK-12-02](../TSK-12-02/design.md) | 컴포넌트 높이 핸들 + viewer 적용 | opus | 05-08 ~ 05-11 |
| [TSK-12-03](../TSK-12-03/design.md) | 행 높이 핸들 + viewer 적용 | opus | 05-11 ~ 05-14 |
| [TSK-12-04](../TSK-12-04/design.md) | E2E 라운드트립 + 시각 회귀 + 문서 | sonnet | 05-14 ~ 05-15 |

## 핵심 설계 결정

### 1. 스키마 키
form-js field 의 기존 `layout: { row, columns }` 객체에 두 키를 추가한다.

| 키 | 위치 | 의미 | 적용 대상 |
|----|------|------|-----------|
| `layout.height` | 모든 대상 컴포넌트 | 컴포넌트 자신의 높이(px) | textarea, html, table, group, custom container(card/stack/modal/tabs/tabPanel) |
| `layout.rowHeight` | 행의 **첫 컴포넌트** | 행 전체의 min-height(px) | 모든 행 |

> form-js viewer 는 모르는 layout 키를 무시하므로 직접적인 호환 깨짐은 없다. 시각 적용은 별도 모듈(아래 §2)이 담당.
>
> spacer 는 form-js viewer 가 이미 지원하는 `height` prop 을 그대로 사용하며 본 WP 의 `layout.height` 와 분리한다.

### 2. viewer 동등성 — `LayoutHeightModule`
신규 `packages/designer-runtime/src/modules/LayoutHeightModule.ts` 를 form-js `additionalModules` 로 designer/viewer 양쪽에 등록한다.

```ts
// 사용 예 (designer-editor-host & 외부 viewer 호스트 모두)
new Form({
  container,
  additionalModules: [LayoutHeightModule, /* 기존 모듈 */],
});
```

동작:
- `formField.added` / `formField.changed` / `formLayouter.layoutChanged` 이벤트 hook
- `[data-id]` 로 컴포넌트 DOM 조회 → `field.layout.height` 가 있으면 inline `style.height` (textarea 의 경우 자식 `<textarea>` 까지 100%)
- `[data-row-id]` 로 행 DOM 조회 → 첫 컴포넌트의 `layout.rowHeight` 가 있으면 inline `min-height`
- 모듈은 designer-runtime 패키지에 위치해 designer-editor-host 와 외부 viewer 모두 단일 import 로 사용

### 3. 핸들 UX
- 선택된 컴포넌트/행만 핸들 노출 (시각 노이즈 방지)
- 행 핸들은 `ChildrenSlot` 의 `<Row>` 자식 끝, 컴포넌트 핸들은 OverlayLayer 의 selection box 하단에 부착
- 키보드 접근성: ResizeHandle 은 `role="separator"` + Arrow/Home/End 지원 (panel-resize-toggle 패턴 답습)

## 기존 자산 재사용
- `packages/designer-editor-host/src/hooks/usePanelResize.ts` — pointer capture / body cursor / cleanup 패턴을 `useElementResize` 로 일반화 (TSK-12-01)
- `packages/designer-editor-host/src/components/PanelSplitter.tsx` — drag 핸들 DOM 패턴 답습
- 시각 회귀 게이트는 panel-resize-toggle WP 에서 정착시킨 정책 그대로 사용

## 비목표 (WP-12 범위 외)
- single-line input(textfield/select/checkbox 등) 자체의 height 조절 — 36px 고정 유지
- spacer 의 `height` prop UX 개선 (별도 작업)
- column(가로) 폭 리사이즈 — 본 WP 는 세로(y축) 핸들만 다룸
