# TSK-02-03: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/markdown/editButton.ts` | `mountEditButton`, `lockAllButtons`, `unlockAllButtons` 구현. `acquireVsCodeApi()` 모듈 레벨 한 번 호출, postMessage 송신, aria-disabled single-editor lock | 신규 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | import 추가 (`mountEditButtonOverlay`, `unlockAllButtons`), `init()` 내 editButton.ts 호출로 교체, `handleEditMessage` 단순화 (edit-closed → unlockAllButtons 위임) | 수정 |
| `packages/designer-vscode-extension/media/form-js-block.css` | `.fjs-edit-btn` 스타일 추가 (32×32, 우상단 8px, VSCode 테마 토큰, forced-colors 폴백). 기존 TSK-02-01 anchor 스타일 교체 | 수정 |
| `packages/designer-vscode-extension/test/unit/editButton.test.ts` | `mountEditButton`, `lockAllButtons`, `unlockAllButtons` 단위 테스트 18개 | 신규 |
| `packages/designer-vscode-extension/test/integration/suite/editButton.test.ts` | E2E 통합 테스트 4개 — data-md-start/end 속성 존재, 다중 블록 고유 offset, 블록 렌더 확인 | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 214 | 0 | 214 |

(신규 editButton 테스트 18개 포함, 기존 196개 regression 없음)

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `test/integration/suite/editButton.test.ts` | data-md-start/end 속성 존재 (QA: 통합-preview.ts 연계), 다중 블록 고유 offset, .form-js-block 생성, 재렌더 일관성 (QA: 엣지-버튼 중복 삽입 방지) |

## 커버리지 (Dev Config에 coverage 정의 시)
- 커버리지: 전체 Stmts 78.58%, Branch 60.39%, Funcs 82.89%
- `editButton.ts`: Stmts 96.42%, Branch 100%, Funcs 100%
- 미커버 파일: `editButton.ts` line 22 (catch 블록 — acquireVsCodeApi throw 예외 경로, 테스트 환경에서 재현 불가)

## 비고
- TSK-02-01에서 preview.ts에 anchor 기반 `mountEditButton` / `handleEditMessage`가 구현되어 있었으나, TSK-02-03 설계에 따라 `editButton.ts`로 분리 + postMessage 방식으로 교체. 기존 `.form-js-edit-button` CSS 셀렉터를 `.fjs-edit-btn`으로 교체.
- `messages.ts`는 TSK-02-01에서 이미 `EditClosedMessage` 인터페이스와 `edit-closed` 유니온이 추가되어 있어 수정 불필요.
- E2E 테스트는 webview DOM 직접 접근 불가 제약으로 plugin 렌더 HTML의 data 속성 검증 방식 사용 (기존 integration suite 패턴 준수).
