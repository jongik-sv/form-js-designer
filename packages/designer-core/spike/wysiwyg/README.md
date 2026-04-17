# WYSIWYG Spike (Phase 0, ADR-0001)

이 스파이크는 **Single Render Pipeline & Designer Overlay** 아키텍처를 검증합니다.

- `form-js` 뷰어가 폼 DOM을 그대로 렌더링
- Preact 오버레이가 별도 레이어(`#overlay-root`)에서 디자이너 크롬(선택 박스, 핸들 등)을 그림
- form-js DOM은 절대 변형하지 않음 (overlay는 `pointer-events: none`)

## 페이지

- `index.html` — 스파이크 소개 및 두 진입점 링크
- `viewer.html` — form-js만 로드 (오버레이 없음, 순수 런타임 동작 확인)
- `editor.html` — form-js + 오버레이 (디자이너 경험 검증)

## 실행

```bash
npm --prefix packages/designer-core run dev:spike
```

열기:
- http://localhost:5173/             (index)
- http://localhost:5173/viewer.html  (뷰어)
- http://localhost:5173/editor.html  (에디터)

## 빌드

```bash
npm --prefix packages/designer-core run build:spike
```

## 테스트

```bash
npm --prefix packages/designer-core run test:unit   # vitest
npm --prefix packages/designer-core run test:e2e    # playwright (spike/wysiwyg/tests)
npm --prefix packages/designer-core run typecheck
```

## 검증 사항 (Phase 0)

| 항목 | 값 | 비고 |
| --- | --- | --- |
| `@bpmn-io/form-js-viewer` | 1.21.2 | `node_modules/.../package.json`에서 확인 |
| `schemaVersion` | 19 | form-js 1.21.2 번들 소스에서 `const schemaVersion = 19` 확인 |
| form-js CSS | `@bpmn-io/form-js-viewer/dist/assets/form-js.css` | `layers.css` 상단에서 `@import`로 로드 (dev/prod 모두 동작) |
| `@layer` 순서 | `reset, layout, components, designer-overlay` | 모든 진입 CSS가 이 순서에 종속 |

## 교차 팀 계약

- `src/card/*` — Implementer A 소유. 여기서는 `import Card from './card/Card'` 와 `./card/Card.css`만 사용.
  (파일명은 `Card.css` — `.module.css`를 쓰면 Vite가 CSS Modules로 해석해 글로벌 클래스명이 해시된다.)
- `src/overlay/*` — Implementer C 소유. `import { OverlayLayer } from './overlay/OverlayLayer'` 와 `./overlay/overlay.css`만 사용.
- 스파이크에서 form-js의 `FormRenderContext` 슬롯을 override하지 않음 (ADR-0002로 연기).
- `form.importSchema()` 이후 `#form-root` 또는 그 하위 DOM을 직접 수정하지 않음.
