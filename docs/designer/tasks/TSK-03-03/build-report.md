# TSK-03-03: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-core/src/i18n/localeTypes.ts` | `LocaleT`, `LocaleContextValue`, `LocaleKey` 타입 계약 | 신규 |
| `packages/designer-core/src/i18n/fallbackT.ts` | `createFallbackT()` — 1회성 dev warn + {{name}} placeholder 치환 | 신규 |
| `packages/designer-core/src/i18n/LocaleProvider.tsx` | `LocaleProvider`, `useT`, `useLocale` + fallbackT 재export | 신규 |
| `packages/designer-core/src/i18n/index.ts` | i18n barrel re-export | 신규 |
| `packages/designer-core/src/i18n/__tests__/LocaleProvider.test.tsx` | LocaleProvider 단위 테스트 10종 | 신규 |
| `packages/designer-core/src/host/hostTypes.ts` | `ViewerHostProps`, `EditorHostProps`, `FormSchema` 등 타입 계약 | 신규 |
| `packages/designer-core/src/host/ViewerHost.tsx` | form-js `Form` 생명주기 관리 Preact 컴포넌트 | 신규 |
| `packages/designer-core/src/host/EditorHost.tsx` | ViewerHost + OverlayLayer 합성, `#fjs-designer-shell` DOM 구조 | 신규 |
| `packages/designer-core/src/host/useViewportWidth.ts` | ResizeObserver 기반 viewport 너비 훅 (ADR-0001 D5) | 신규 |
| `packages/designer-core/src/host/shellStyles.css` | `#fjs-designer-shell` layout CSS, `@layer designer-shell` | 신규 |
| `packages/designer-core/src/host/index.ts` | host barrel re-export | 신규 |
| `packages/designer-core/src/host/__tests__/ViewerHost.test.tsx` | ViewerHost 단위 테스트 14종 | 신규 |
| `packages/designer-core/src/host/__tests__/EditorHost.test.tsx` | EditorHost 단위 테스트 12종 | 신규 |
| `packages/designer-core/src/host/__tests__/useViewportWidth.test.tsx` | useViewportWidth 단위 테스트 4종 | 신규 |
| `packages/designer-core/src/index.ts` | ViewerHost, EditorHost, LocaleProvider 등 public export 추가 | 수정 |
| `packages/designer-core/src/panel/types.ts` | `LocaleT` 타입 시그니처를 `string \| number` 호환으로 업데이트 | 수정 |
| `packages/designer-core/package.json` | `exports`에 `./host`, `./i18n`, `./host/shellStyles.css` 추가, `@bpmn-io/form-js-viewer` peerDependencies 승격 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (전체) | 192 | 0 | 192 |
| &nbsp;&nbsp;LocaleProvider | 10 | 0 | 10 |
| &nbsp;&nbsp;ViewerHost | 14 | 0 | 14 |
| &nbsp;&nbsp;EditorHost | 12 | 0 | 12 |
| &nbsp;&nbsp;useViewportWidth | 4 | 0 | 4 |
| &nbsp;&nbsp;회귀 (기존 TSK-03-01/02) | 152 | 0 | 152 |

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — library domain

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — `test:coverage` 스크립트 미정의

## 비고

- `panel/types.ts`의 `LocaleT`는 `params?: Record<string, string | number | unknown>`으로 느슨하게 조정. WP-07 머지 시 i18n 모듈의 `LocaleT`를 SSOT로 통합 예정.
- EditorHost의 `overlayContainer`는 `#fjs-designer-shell`(shellRef)로 전달됨. happy-dom에서 `getBoundingClientRect().width === 0`이므로 `assertSharedOrigin`이 skip → 테스트 4번(불일치 케이스)은 width=1024 mock으로 실제 throw를 검증.
- spike의 `phase1-q1q2` 폴더에 기존 typecheck 에러(미설치 패키지)가 있으나 본 Task와 무관 — 사전 존재 에러.
- TSK-03-03 design.md의 리스크 §2 (nested preact.render 2회 cleanup)는 `useLayoutEffect` return 함수에서 `render(null, node)` 단일 집중으로 완화. `EditorHost.test.tsx` 케이스 7 확인.
- `form._update` fallback 경로(케이스 8)는 `_update = undefined`로 직접 제거하여 검증. 리스크 §1 완화.
