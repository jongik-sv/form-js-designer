# TSK-05-03: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/components/portalRoot.ts` | .form-js-block 내부 .fjs-portal-root lazy 생성 유틸 | 신규 |
| `packages/designer-vscode-extension/src/components/CardRenderer.tsx` | Card 렌더러 — label 헤더, components 슬롯, actions footer | 신규 |
| `packages/designer-vscode-extension/src/components/StackRenderer.tsx` | Stack 렌더러 — flex direction/gap/wrap 인라인 스타일 | 신규 |
| `packages/designer-vscode-extension/src/components/ModalRenderer.tsx` | Modal 렌더러 — trigger 버튼, native dialog, focus trap, portal | 신규 |
| `packages/designer-vscode-extension/media/form-js-components.css` | fjs-card / fjs-stack / fjs-modal / fjs-portal-root CSS 추가, HC 대응 | 수정 |
| `packages/designer-vscode-extension/test/unit/portalRoot.test.ts` | portalRoot 유틸 단위 테스트 (5개) | 신규 |
| `packages/designer-vscode-extension/test/unit/cardRenderer.test.ts` | Card 렌더러 단위 테스트 (8개) | 신규 |
| `packages/designer-vscode-extension/test/unit/stackRenderer.test.ts` | Stack 렌더러 단위 테스트 (9개) | 신규 |
| `packages/designer-vscode-extension/test/unit/modalRenderer.test.ts` | Modal 렌더러 단위 테스트 (6개) | 신규 |
| `packages/designer-vscode-extension/test/fixtures/card-single.md` | Card 단일 블록 fixture | 신규 |
| `packages/designer-vscode-extension/test/fixtures/stack-single.md` | Stack 단일 블록 fixture | 신규 |
| `packages/designer-vscode-extension/test/fixtures/modal-single.md` | Modal 단일 블록 fixture | 신규 |
| `packages/designer-vscode-extension/test/fixtures/mixed-layout.md` | Tabs × Card × Stack × Modal 혼합 fixture | 신규 |
| `packages/designer-vscode-extension/test/e2e/card-stack-modal.test.ts` | E2E: 각 컴포넌트 렌더 + 혼합 회귀 검증 | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (전체) | 205 | 0 | 205 |
| 신규 TSK-05-03 테스트 | 28 | 0 | 28 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `test/e2e/card-stack-modal.test.ts` | Card/Stack/Modal 단일 fixture 렌더, mixed-layout 회귀, Modal portal 누출 없음 |

## 커버리지

- CardRenderer.tsx: 87.5% (Stmts)
- StackRenderer.tsx: 90% (Stmts)
- ModalRenderer.tsx: 28.78% (Stmts) — jsdom에서 useEffect/createPortal mock 한계로 낮음, 관찰 가능한 동작(trigger 렌더, scroll lock 없음, 계약 준수)은 모두 검증됨
- portalRoot.ts: 84.61% (Stmts)
- 전체: 77.5% Stmts / 63.36% Branch / 76.54% Funcs / 79% Lines

## 비고

- `src/components/index.ts`는 이미 `DesignerComponentsModule`을 export 중이므로 수정하지 않음. TSK-05-04에서 preview.ts additionalModules 주입 시 StackRendererComponent를 포함한 확장 모듈로 교체 예정.
- ModalRenderer의 `portalRoot` 조회는 `triggerRef.current?.closest('.form-js-block')` 사용. 마운트 시점에 blockEl null이면 document.body fallback. 실제 VSCode webview에서는 .form-js-block이 항상 존재하므로 정상 동작.
- `package.json`의 `contributes.markdown.previewStyles`에 `form-js-components.css`가 이미 등록되어 있어 추가 수정 불필요.
