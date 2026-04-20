# TSK-01-03: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/markdown/lruCache.ts` | LRU 캐시 자작 구현 (Map + doubly-linked list, capacity=20, O(1) 조회/삽입/eviction) | 신규 |
| `packages/designer-vscode-extension/src/markdown/errorBanner.ts` | 오류 배너 렌더 유틸 (`renderErrorBanner`) — `.form-js-block--error`, `role="alert"`, textContent XSS 방지 | 신규 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | LRU 캐시 통합(`viewerCache` 싱글턴), 캐시 히트 시 `importSchema()` 호출, `renderErrorBanner` 사용, `disposeAll()`에 `viewerCache.clear()` 추가 | 수정 |
| `packages/designer-vscode-extension/media/form-js-block.css` | `.form-js-block--error` 배너 스타일 추가 (경고색, 테마별 변형) | 수정 |
| `packages/designer-vscode-extension/test/unit/lruCache.test.ts` | LRU 캐시 단위 테스트 (eviction, hit, miss, capacity 경계, clear) | 신규 |
| `packages/designer-vscode-extension/test/unit/errorBanner.test.ts` | 오류 배너 단위 테스트 (DOM 출력, role=alert, 메시지 형식, XSS 방지, 교체 동작) | 신규 |
| `packages/designer-vscode-extension/test/unit/preview-cache.test.ts` | preview.ts LRU 캐시 + 오류 배너 통합 단위 테스트 (캐시 히트/미스, 배너 클래스/role/텍스트, disposeAll 연계, capacity 경계) | 신규 |
| `packages/designer-vscode-extension/test/unit/preview.test.ts` | TSK-01-03 변경에 따른 업데이트: `viewerCache` import/clear, mock에 `importSchema` 추가, `.form-js-mount-error` → `.form-js-block--error` 클래스명 교체 | 수정 |
| `packages/designer-vscode-extension/vitest.config.ts` | `environmentMatchGlobs`에 `errorBanner.test.ts`, `preview-cache.test.ts` jsdom 환경 추가 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 87 | 0 | 87 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| N/A — e2e_test 미정의 | frontend 도메인이나 Dev Config의 e2e_test가 null |

## 커버리지 (Dev Config에 coverage 정의 시)
- 커버리지: 91.36% (Statements), 72.05% (Branch), 82.14% (Functions), 91.97% (Lines)
- 미커버 파일: 없음 (design.md 파일 계획 내 모든 파일 커버)
- 미커버 라인: `lruCache.ts` L30/76/105 (에러 가드 — RangeError, 빈 캐시 엣지), `preview.ts` L150-158/178/186 (브라우저 자동실행 분기 — jsdom에서 window 없음)

## 비고
- `preview.ts`의 `renderMountError` 함수(TSK-01-02 레거시)를 `renderErrorBanner`로 교체하면서 기존 테스트(`preview.test.ts`)의 오류 배너 클래스 셀렉터도 `.form-js-mount-error` → `.form-js-block--error`로 업데이트하였음. 동작 계약은 동일 (배너 렌더 + role=alert + 메시지 표시).
- `@bpmn-io/form-js-viewer`의 `createForm` 반환 타입에 `importSchema`가 선택적(`?`)으로 선언됨 — design.md 리스크 항목 대응. 캐시 히트 시 `typeof cached.importSchema === 'function'` 방어 분기로 처리.
