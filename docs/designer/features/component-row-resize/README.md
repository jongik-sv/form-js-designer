# Component & Row Resize (WP-12)

> PRD §4 AC #4 (Export 라운드트립 무손실), AC #4-1 (WYSIWYG 충실도)

## 개요

캔버스에서 사용자가 컴포넌트와 행의 높이를 드래그로 직접 조절할 수 있다.
디자이너에서 설정한 높이는 form-js viewer에서도 동일하게 렌더링된다(WYSIWYG 동등성).

## 사용법

### 방법 1 — 컴포넌트 핸들 드래그 (layout.height)

1. 팔레트에서 `textarea`, `html`, `table`, `group`, `card`, `stack`, `modal`, `tabPanel` 중 하나를 캔버스에 드래그·드롭한다.
2. 드롭된 컴포넌트를 클릭하면 하단에 `[data-testid="component-resize-handle"]` 핸들이 나타난다.
3. 핸들을 위/아래로 드래그하면 컴포넌트의 높이(px)가 변경된다.
4. 변경 결과는 JSON 스키마의 `layout.height` 필드에 저장된다.

### 방법 2 — 행 핸들 드래그 (layout.rowHeight)

1. 캔버스에 하나 이상의 컴포넌트를 드롭한다 (같은 행에 여러 컴포넌트 배치 가능).
2. 행 안의 컴포넌트를 클릭하면 행의 우측 끝에 `[data-testid="row-resize-handle"]` 핸들이 나타난다.
3. 핸들을 위/아래로 드래그하면 행 전체의 `min-height`가 변경된다.
4. 변경 결과는 행의 **첫 번째 컴포넌트**의 `layout.rowHeight` 필드에 저장된다.

### 방법 3 — Properties 패널 숫자 입력

1. 컴포넌트를 클릭하여 선택한다.
2. 우측 Properties 패널 → `[data-testid="props-entry-layout.height"]` 또는 `[data-testid="props-entry-layout.rowHeight"]` 입력 필드에 직접 숫자를 입력한다.
3. Enter 키를 누르거나 포커스를 벗어나면 값이 즉시 반영된다.

## 스키마 예시

```json
{
  "schemaVersion": 19,
  "id": "my-form",
  "components": [
    {
      "type": "textarea",
      "key": "description",
      "label": "설명",
      "layout": { "height": 200 }
    },
    {
      "type": "textfield",
      "key": "name",
      "label": "이름",
      "layout": { "rowHeight": 150 }
    }
  ]
}
```

### 스키마 키 설명

| 키 | 위치 | 의미 | 적용 대상 |
|----|------|------|-----------|
| `layout.height` | 대상 컴포넌트 | 컴포넌트 자신의 높이(px) | `textarea`, `html`, `table`, `group`, `card`, `stack`, `modal`, `tabPanel` |
| `layout.rowHeight` | 행의 **첫 번째 컴포넌트** | 행 전체의 `min-height`(px) | 모든 행 |

## 제약

### 대상 타입

`layout.height` 핸들이 표시되는 컴포넌트 타입:

- `textarea`
- `html`
- `table`
- `group`
- `card` (designer-components)
- `stack` (designer-components)
- `modal` (designer-components)
- `tabPanel` (designer-components)

단일 행 입력 컴포넌트(`textfield`, `select`, `checkbox`, `number`, `datetime`, `radio` 등)는 높이 고정(36px 기본값)이며 컴포넌트 핸들이 표시되지 않는다.

### 값 범위

| 속성 | 최솟값 | 최댓값 | 기본값 |
|------|--------|--------|--------|
| `layout.height` | 36px | 2000px | 컴포넌트별 CSS 기본값 (textarea: 75px) |
| `layout.rowHeight` | 36px | 2000px | 없음(flex:auto) |

### rowHeight vs height 독립성

- `layout.height`와 `layout.rowHeight`는 독립적으로 동작한다.
- 같은 행에서 특정 컴포넌트에 `layout.height`를 설정해도 행 전체의 `layout.rowHeight`에 영향을 주지 않는다.
- `layout.rowHeight`는 행의 첫 번째 컴포넌트에만 저장되며, 해당 컴포넌트가 삭제되면 초기화된다.

### viewer 동등성

`LayoutHeightModule`이 form-js `additionalModules`로 designer와 viewer 양쪽에 등록되어 있어야 한다. 이 모듈이 없으면 `layout.height`/`layout.rowHeight` 값이 스키마에 저장되더라도 viewer에서 반영되지 않는다.

```ts
import { LayoutHeightModule } from '@form-js-designer/designer-runtime';

new Form({
  container,
  additionalModules: [LayoutHeightModule],
});
```

### spacer 컴포넌트 제외

`spacer` 컴포넌트는 form-js viewer가 이미 지원하는 `height` prop을 사용하며, 본 WP-12의 `layout.height`와 분리된다.

## Export 라운드트립

디자이너에서 설정한 `layout.height` / `layout.rowHeight` 값은 JSON export 후 re-import 시에도 동일하게 복원된다. `designer-cli validate`가 `additionalProperties: true`로 동작하므로 신규 layout 키를 포함한 스키마가 유효성 검사를 통과한다.

```bash
designer-cli validate ./my-form.schema.json  # exit 0
```

## 관련 문서

- [WP-12 README](../../tasks/WP-12/README.md) — 설계 결정·핵심 구조
- [TSK-12-02 design.md](../../tasks/TSK-12-02/design.md) — ComponentResizeOverlay 구현 상세
- [TSK-12-03 design.md](../../tasks/TSK-12-03/design.md) — RowResizeHandle 구현 상세
- [TSK-12-04 design.md](../../tasks/TSK-12-04/design.md) — E2E 라운드트립 테스트 설계
- [PRD §4 AC #4, #4-1](../../PRD.md) — 라운드트립·WYSIWYG 수락 기준
