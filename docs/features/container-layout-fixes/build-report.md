# container-layout-fixes: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-components/src/card/index.tsx` | `escapeGridRender: false` 추가 (Bug 1) | 수정 |
| `packages/designer-components/src/stack/index.tsx` | `escapeGridRender: false` 추가 (Bug 1) | 수정 |
| `packages/designer-components/src/card/Card.css` | `.dc-card__body .cds--grid` 음수마진 중화 + `overflow: hidden` (Bug 2) | 수정 |
| `packages/designer-components/src/stack/Stack.css` | `.dc-stack .cds--grid` 음수마진 중화 + `overflow: hidden` (Bug 2) | 수정 |
| `packages/designer-components/src/modal/Modal.css` | `.dc-modal__body .cds--grid` 음수마진 중화 + `overflow: hidden` (Bug 2) | 수정 |
| `packages/designer-components/src/tabs/Tabs.css` | `.dc-tabs__content .cds--grid` 음수마진 중화 + `overflow: hidden` (Bug 2) | 수정 |
| `packages/designer-components/src/tabs/propsSchema.ts` | `TabItem.components?: Array<...>` 추가 (Bug 3) | 수정 |
| `packages/designer-components/src/tabs/Tabs.tsx` | per-tab ChildrenSlot 구현 (Option B), `create()` tabs에 components:[] 추가, Option A dc-tabs__children 제거 (Bug 3) | 수정 |
| `packages/designer-core/src/container/DesignerFormLayouter.ts` | `DESIGNER_CONTAINER_TYPES`에 `'tabPanel'` 추가 (Bug 3) | 수정 |
| `packages/designer-components/src/__tests__/Modal.test.tsx` | i18n name 테스트를 한국어 name에 맞게 수정 (regression 수정) | 수정 |
| `packages/designer-components/src/__tests__/Tabs.test.tsx` | i18n name 테스트를 한국어 name에 맞게 수정 (regression 수정) | 수정 |
| `packages/designer-components/test/container-layout-fixes.unit.spec.ts` | Bug 1/2/3 단위 테스트 | 신규 |
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | Bug 1/2/3 E2E 시나리오 추가 | 수정 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (designer-components) | 112 | 0 | 112 |
| 단위 테스트 (designer-core) | 196 | 0 | 196 |
| **합계** | **308** | **0** | **308** |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | Bug 1: Card 내부 드롭 + drop zone 표시, Bug 2: Card 자식 overflow 없음, Bug 3: Tabs Tab 2 전환 후 활성화, per-tab content children slot 존재 |

## 커버리지

N/A — Dev Config에 coverage 명령 미정의

## 비고

- **기존 regression 2건**: `Modal.test.tsx`, `Tabs.test.tsx`의 `i18n name` 테스트가 한국어 name(`'모달'`, `'탭'`) 변경으로 실패 → 테스트 수정으로 해소
- **Bug 3 설계 결정**: Tabs per-tab pseudo-field ID는 `tabId_{value}_{fieldId}` 형식 사용. 하위 호환 위해 root-level `components: []` 유지
- **DESIGNER_CONTAINER_TYPES 확장**: `tabPanel` 추가로 per-tab 가상 컨테이너가 `calculateLayout` 에서 올바르게 처리됨
- **CSS specificity**: 모든 음수마진 중화 CSS는 컨테이너 내부 선택자(`.dc-card__body .cds--grid` 등)로 범위 한정 — 글로벌 오염 없음
