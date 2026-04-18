# paste-row-column: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `_duplicateFieldVertical` / `_duplicateFieldHorizontal` 공통 준비 흐름(registry 조회 → 부모 조회 → existingKeys 수집 → deep clone → insertIdx 계산, 약 12줄)을 `_prepareDuplicateAttrs` 헬퍼로 추출 | Extract Method, Remove Duplication |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `_COPY_COL_ICON_SVG` → `_COPY_VERTICAL_ICON_SVG` rename: COL(열/세로)이 "세로 복사=새 행 삽입"과 혼동될 수 있어 VERTICAL로 명칭 통일 | Rename |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `_injectDuplicateButtons` 내 button 생성 루틴(createElement, className, title, aria-label, setAttribute, innerHTML, addEventListener) 2회 반복을 로컬 `makeBtn` 클로저로 추출 | Extract Method, Remove Duplication |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | DOM 주입 describe(6 tests) 내 fieldEl/pad 생성·마운트·cleanup 5회 반복을 `beforeEach`/`afterEach`로 추출 | Remove Duplication |

## 판단 근거 (미변경 항목)

- 포인트 1 적용 여부: 공통 흐름이 12줄이고 두 메서드에서 각각 반복되므로 추출 기준(10줄 이상) 충족. 분기점은 명확(vertical: layout.row 삭제 / horizontal: getRowForField 호출 후 layout.row 주입)하여 헬퍼 추출이 가독성을 해치지 않음.
- 포인트 2 적용 여부: `_COPY_COL_ICON_SVG` 이름의 COL은 column을 의미하지만 실제 동작은 "세로 복사(새 행)" → VERTICAL이 더 직관적. 주석("세로 복제")과 이름이 일치하도록 rename.
- 포인트 3 적용 여부: 버튼 생성 7줄이 2회 반복(합 14줄). `makeBtn` 클로저로 추출하면 if/else 분기 없이 선언형으로 읽히며 향후 버튼 추가 시 1줄로 가능.
- 포인트 4 적용 여부: `beforeEach`/`afterEach` 추출로 각 테스트가 "동작 검증"에만 집중. afterEach의 `if (fieldEl.parentNode)` 방어 코드로 orphan pad 테스트 케이스와 충돌 없음.

## 테스트 확인

- 결과: PASS
- 실행 명령: `npm --prefix packages/designer-editor-host run test:unit`
- 통과: 182 / 182 (11 files)

## 비고

- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- API 시그니처 변경 없음: `_duplicateFieldVertical`, `_duplicateFieldHorizontal`, `_injectDuplicateButtons` 공개(internal) 시그니처 동일 유지. `_prepareDuplicateAttrs`는 `private` 추가.
- `_COPY_VERTICAL_ICON_SVG` SVG 내용 무변경 (rename only).
