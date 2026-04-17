# TSK-03-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-core/src/overlay/assertSharedOrigin.ts` | ADR-0001 §3 D3 불변식 계약 함수 + SharedOriginViolation 에러 클래스 | 신규 |
| `packages/designer-core/src/overlay/OverlayLayer.tsx` | spike 이관 + overlayContainer prop + dev 빌드 assertSharedOrigin 자동 호출 | 신규 |
| `packages/designer-core/src/overlay/overlay.css` | spike CSS 동일 이관 (`@layer designer-overlay`) | 신규 |
| `packages/designer-core/src/overlay/__tests__/assertSharedOrigin.test.ts` | D3 계약 테스트 8종 | 신규 |
| `packages/designer-core/src/overlay/__tests__/OverlayLayer.test.tsx` | spike 이관 10종 + dev assert 관련 추가 2종 = 12종 | 신규 |
| `packages/designer-core/src/index.ts` | OverlayLayer, assertSharedOrigin, SharedOriginViolation public export 추가 | 수정 |
| `packages/designer-core/package.json` | exports에 `"./overlay"`, `"./overlay/overlay.css"` 서브패스 추가; `test:e2e` → 정식 config; `test:e2e:spike` 추가 | 수정 |
| `packages/designer-core/playwright.config.ts` | 패키지 루트 Playwright config; 3 뷰포트(1024/1440/1920) projects 배열 등록 | 신규 |
| `packages/designer-core/e2e/overlay.parity.spec.ts` | 3 뷰포트 × 2 테스트(D6 pixel parity + D3 정렬) = 6 케이스 E2E spec | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-core/e2e/fixtures/masks.ts` | spike masks.ts 이관 (applyPinkMask, normalizeFormHtml) | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 90 | 0 | 90 |

세부 내역:
- `src/overlay/__tests__/assertSharedOrigin.test.ts`: 8종 통과
- `src/overlay/__tests__/OverlayLayer.test.tsx`: 12종 통과 (spike 이관 10 + 신규 2)
- `spike/wysiwyg/src/overlay/__tests__/OverlayLayer.test.tsx`: 10종 통과 (Phase 0 증거 — 미변경)
- 기존 테스트(assertPureRender 10, browserEnvContract 14, defineComponent 9, Card 27): 60종 통과

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-core/e2e/overlay.parity.spec.ts` | 3 뷰포트 × D6 pixel parity (diff ≤ 0.1%), D3 overlay 정렬 (tolerance 2px) |

- domain=`library`이므로 dev config `e2e_test: null`. E2E는 dev-test 단계에서 실행.

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — library domain dev config에 `coverage` 명령 미정의.

## 비고

- **assertSharedOrigin의 layout 전 skip 기준**: `formRoot.offsetWidth` 대신 `getBoundingClientRect().width === 0`으로 판단. happy-dom이 `offsetWidth`를 항상 0으로 반환하여 실제 테스트 환경에서 false-positive를 유발하기 때문. 브라우저에서는 두 값이 동일하게 동작.
- **assertSharedOrigin 자동 호출 조건**: `overlayContainer` prop이 명시적으로 전달된 경우에만 auto-assert 실행. TSK-03-03 EditorHost 통합에서 overlayContainer를 prop으로 전달하여 D3 게이트를 활성화할 것.
- **spike 원본 파일 보존**: `spike/wysiwyg/src/overlay/` 3개 파일은 ADR-0001 §6 Phase 0 증거로 미변경. Phase 0 스크립트(`test:e2e:spike`)도 별도 유지.
- **typecheck**: 우리 파일 오류 0건. spike/phase1-q1q2 내 외부 의존성 오류는 기존 오류이며 본 Task 범위 밖.
