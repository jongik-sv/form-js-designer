# container-layout-fixes: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-components/src/container-base.css` | 신규: `.dc-container-body .cds--grid/row { margin: 0 }` 공용 CSS | Extract Class |
| `packages/designer-components/src/card/Card.css` | `.dc-card__body .cds--grid/row` 중복 제거 (container-base.css로 통합) | Remove Duplication |
| `packages/designer-components/src/stack/Stack.css` | `.dc-stack .cds--grid/row` 중복 제거 | Remove Duplication |
| `packages/designer-components/src/modal/Modal.css` | `.dc-modal__body .cds--grid/row` 중복 제거 | Remove Duplication |
| `packages/designer-components/src/tabs/Tabs.css` | `.dc-tabs__content .cds--grid/row` 중복 제거 | Remove Duplication |
| `packages/designer-components/src/module.ts` | `import './container-base.css'` 추가 | Remove Duplication |
| `packages/designer-components/src/card/index.tsx` | body div에 `dc-container-body` 클래스 추가, `ChildrenSlot` 캐스트 단순화 | Rename, Extract Method |
| `packages/designer-components/src/stack/index.tsx` | 루트 div에 `dc-container-body` 클래스 추가, `ChildrenSlot` 캐스트 단순화 | Rename |
| `packages/designer-components/src/modal/Modal.tsx` | body div에 `dc-container-body` 클래스 추가, `ChildrenSlot` 캐스트 단순화, `ContainerField` import | Rename |
| `packages/designer-components/src/tabs/Tabs.tsx` | `dc-container-body` 적용, `tabPseudoField` 타입 명시, 구현 경위 주석 제거 | Rename, Simplify |
| `packages/designer-core/src/types.ts` | `ContainerField` 인터페이스 추가 (ChildrenSlot props 공용 타입) | Extract Interface |
| `packages/designer-core/src/index.ts` | `ContainerField` export 추가 | |
| `packages/designer-core/src/container/ChildrenSlot.tsx` | `AnyField` 인라인 타입 → `ContainerField` import로 교체, 주석 간소화 | Rename, Extract Interface |
| `packages/designer-core/src/container/DesignerFormLayouter.ts` | 장황한 주석 간소화, `calculateLayout` 내부 로컬 변수 제거 | Simplify |

## 테스트 확인

- 결과: PASS
- 실행 명령:
  - `npm --prefix packages/designer-core run test:unit` → 196 tests passed
  - `npm --prefix packages/designer-components run test:unit` → 112 tests passed
  - `npm --prefix packages/designer-editor-host run test:e2e` → 13 tests passed

## 비고

- 케이스 분류: A (성공) — 변경 적용 후 단위 + E2E 테스트 전체 통과
- CSS 통합 시 Carbon 글로벌 오염 없음 확인: `.dc-container-body` 앵커로 컨테이너 body 범위에만 한정
- `ContainerField` 타입 추가로 Card/Stack/Modal/Tabs 4곳의 `field as unknown as { id: string; components?: Array<...>; verticalAlignment?: string; }` 인라인 캐스트를 1줄로 단순화
- Tabs `tabPanel` 타입은 `DesignerFormLayouter`의 `DESIGNER_CONTAINER_TYPES`에 이미 포함되어 있어 추가 변경 불필요
- 하위 호환 (root-level tabs components 스키마) 제거 없음 — 그대로 유지
