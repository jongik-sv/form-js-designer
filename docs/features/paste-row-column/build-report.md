# build-report: paste-row-column

## 상태

| 항목 | 값 |
|------|----|
| Feature | paste-row-column |
| 빌드 결과 | PASS |
| 상태 전이 | `[dd]` → `[im]` |
| 이벤트 | `build.ok` |
| 완료 시각 | 2026-04-18T13:34:27Z |

---

## 생성/수정된 파일

| 파일 | 종류 | 내용 |
|------|------|------|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | 수정 | `_duplicateField` → `_duplicateFieldVertical` rename + `_duplicateFieldHorizontal` 신규 추가, `_injectDuplicateButton` → `_injectDuplicateButtons` 교체, SVG 상수 2종(`_COPY_ROW_ICON_SVG`, `_COPY_COL_ICON_SVG`) 추가 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | 수정 | 단위 테스트 13개 신규 추가 (describe 블록 2개: 방향 복제·DOM 주입) |
| `docs/features/paste-row-column/build-report.md` | 신규 | 본 파일 |

---

## 단위 테스트 결과 (Red → Green)

| 테스트 | 결과 |
|--------|------|
| `_duplicateFieldVertical` — layout.row 없이 addFormField 호출 | ✅ PASS |
| `_duplicateFieldVertical` — idx+1 위치 삽입 (기존 동작 보존) | ✅ PASS |
| `_duplicateFieldVertical` — registry에 없으면 no-op | ✅ PASS |
| `_duplicateFieldHorizontal` — getRowForField 호출 확인 | ✅ PASS |
| `_duplicateFieldHorizontal` — layout.row = 'row-1' attrs 주입 | ✅ PASS |
| `_duplicateFieldHorizontal` — null row 시 vertical fallback | ✅ PASS |
| `_duplicateFieldHorizontal` — registry에 없으면 no-op | ✅ PASS |
| `_injectDuplicateButtons` — [data-outline-duplicate-h] · [data-outline-duplicate-v] 2개 주입 | ✅ PASS |
| `_injectDuplicateButtons` — 재호출 시 중복 주입 방지 (guard) | ✅ PASS |
| `_injectDuplicateButtons` — data-id 없는 pad는 주입 안 함 | ✅ PASS |
| `_injectDuplicateButtons` — title 한국어 ("행으로 복사" / "세로로 복사") | ✅ PASS |
| `_injectDuplicateButtons` — aria-label 한국어 동일 | ✅ PASS |
| `_injectDuplicateButtons` — 배치 순서 [가로][세로][삭제] | ✅ PASS |

**전체 단위 테스트: 181 / 181 PASS** (신규 13 + 기존 168)

---

## 빌드 검증

```
npm --prefix packages/designer-editor-host run build
✓ 616 modules transformed.
dist/assets/index.js   1,468 kB (gzip: 454 kB)
✓ built in 1.37s
```

에러 없음. 청크 크기 경고는 기존 프로젝트의 pre-existing 경고이며 이번 변경과 무관.

---

## 구현 요약

### 변경 핵심

1. **`_duplicateFieldVertical(id)`** — 기존 `_duplicateField` rename. 동일 동작 (새 row에 세로 삽입). layout.row 없이 `addFormField` 호출.

2. **`_duplicateFieldHorizontal(id)`** — 신규. `formLayouter.getRowForField(field)` → `sourceRow` 획득. `attrs.layout.row = sourceRow.id` 주입 후 `addFormField` 호출. `sourceRow`가 null/undefined이면 row 주입 없이 vertical fallback.

3. **`_injectDuplicateButtons(pad)`** — 기존 `_injectDuplicateButton` 교체. guard를 `[data-outline-duplicate-h]` 존재 여부로 변경. 가로 버튼(title/aria-label="행으로 복사") + 세로 버튼(title/aria-label="세로로 복사") 2개 생성. `insertBefore` 두 번으로 순서 보장: [가로][세로][기존삭제].

4. **`_startContextPadObserver`** — `_injectDuplicateButton` → `_injectDuplicateButtons` 호출 교체.

### HIGH 리스크 결론

- `layout.row` attrs 주입 방식: 단위 테스트에서 mock 레벨 검증 완료. 실제 form-js runtime 동작 확인은 Phase 3(E2E)에서 브라우저 시각 확인 필수.
- `getRowForField` 반환값 타입: `{ id?: string } | null | undefined`로 타입 가드 적용. null 시 vertical fallback 구현 완료.

---

## 다음 단계

- **Phase 3 (dev-test)**: E2E Playwright visible mode 검증
  - 팔레트 button 드롭 → 호버 → 버튼 2개 확인
  - 가로 복사 클릭 → 동일 row 배치 시각 확인 (브라우저 실물 의무)
  - 세로 복사 클릭 → 아웃라인 노드 +1 확인
