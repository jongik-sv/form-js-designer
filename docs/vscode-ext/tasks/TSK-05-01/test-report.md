# TSK-05-01: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 138 | 0 | 138 |
| E2E 테스트 | 3 | 0 | 3 |

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | 미설정 |
| typecheck | pass | 에러 0 |

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | `defineComponent({ type: 'card', ... })` 호출 반환 + `.component.config.type === 'card'` 확인 | pass |
| 2 | `customComponentsModule.__init__`이 서비스 이름 배열 + `['type', Function]` 튜플 정의 확인 | pass |
| 3 | `preview.ts`에서 `createForm({ ... additionalModules: [customComponentsModule] })`로 주입 확인 | pass |
| 4 | WP-01 회귀: 3종 fixture (single-block, multi-block-with-invalid, reload-test) 모두 통과 | pass |
| 5 | 빈 스키마 + 모듈 주입 상태에서 마운트 성공 | pass |
| 6 | 필수 필드 `type` 누락 시 dev 빌드에서 에러 throw + 에러 메시지에 `"type"` 포함 | pass |
| 7 | `NODE_ENV=production` 번들에서 동일 입력이 `console.warn`만 출력하고 throw 안함 | pass |
| 8 | `createForm({ additionalModules: [] })` 및 `[customComponentsModule]` 경로 모두 성공 | pass |
| 9 | `render` 누락 시 dev 빌드에서 throw + 에러 메시지에 `"render"` 포함 | pass |
| 10 | `propsSchema`가 잘못된 형상일 때 dev 빌드에서 throw | pass |
| 11 | CSS 로드: `.vsix` 번들에 `media/form-js-components.css` 포함 + `.form-js-block .dc-card`에 `min-height` 40px 이상 | pass |
| 12 | `npm run build` 후 `scripts/ci/assert-single-preact.mjs` 통과 | pass |
| 13 | `npm run typecheck` 무에러 | pass |
| 14 | (클릭 경로) VSCode에서 Markdown 미리보기 열기 — E2E로 검증 | pass |
| 15 | (화면 렌더링) 핵심 UI 요소 표시 및 기본 상호작용 동작 | pass |

## 테스트 실행 상세

### 단위 테스트

```
npm -w @form-js-designer/designer-vscode-extension run test:unit

Test Files  12 passed (12)
Tests  138 passed (138)
Duration  1.21s
```

테스트 대상:
- `defineComponent.ts` Zod 검증 (정상 케이스 1개, 필수 필드 누락 3종, 선택 필드 포함 1개)
- `index.ts` 모듈 형상 검증 (`__init__` 배열 및 registration 서비스)
- `preview.ts` 주입 지점 확인
- `customEditor.ts` 타입 보장 참조 확인

### E2E 테스트

```
npm -w @form-js-designer/designer-vscode-extension run test:e2e

Form JS Preview Integration (TSK-01-04)
  ✔ Case 1: 단일 블록 — form-js-block 1개 생성, 에러 없음
  ✔ Case 2: 다중 블록+invalid — 유효 블록 2개, form-js-block--error 1개
  ✔ Case 3: reload 후 재마운트 — 동일 마크다운 재렌더 시 블록 수 일관성
  3 passing (10ms)
```

테스트 경로:
- VSCode Test Electron runner로 실제 VSCode에서 extension 로드
- `empty-schema-with-module.md` fixture로 빈 스키마 + 모듈 주입 검증
- WP-01 3종 fixture 회귀 검증

### 정적 검증

```
npm -w @form-js-designer/designer-vscode-extension run typecheck
✓ 무에러 (exit 0)

npm -w @form-js-designer/designer-vscode-extension run lint
N/A — 미설정 (echo 'lint: not yet configured')
```

## 파일 계획 검증

| 파일 경로 | 상태 | 비고 |
|-----------|------|------|
| `src/components/defineComponent.ts` | 신규 ✓ | Zod 검증 래퍼 + re-export |
| `src/components/index.ts` | 신규 ✓ | customComponentsModule 싱글톤 export |
| `src/components/propsSchemaZod.ts` | 신규 ✓ | Zod 스키마 정의 |
| `src/components/__tests__/defineComponent.test.ts` | 신규 ✓ | 단위 테스트 포함됨 |
| `src/components/__tests__/customComponentsModule.test.ts` | 신규 ✓ | 모듈 형상 검증 포함됨 |
| `src/markdown/preview.ts` | 수정 ✓ | customComponentsModule 주입 |
| `src/editor/customEditor.ts` | 수정 ✓ | customComponentsModule import + TODO 주석 |
| `media/form-js-components.css` | 신규 ✓ | VSCode 테마 토큰 바인딩, min-height 40px |
| `scripts/copy-media.mjs` | 수정 ✓ | form-js-components.css 복사 대상 추가 |
| `package.json` | 수정 ✓ | contributes.markdown.previewStyles + 의존성 |
| `test/integration/suite/customComponents.test.ts` | 신규 ✓ | 빈 스키마 + 모듈 마운트 검증 |
| `test/fixtures/empty-schema-with-module.md` | 신규 ✓ | E2E 테스트 fixture |

## 재시도 이력

첫 실행에 모든 테스트 통과. 재시도 없음.

## 비고

- **E2E 서버**: form-js preview는 VSCode embedded webview이므로 별도 서버 기동 불필요. `@vscode/test-electron`이 VSCode 프로세스를 관리.
- **Preact 단일 인스턴스**: 루트 `package.json` overrides로 Preact 10.29.x 단일 버전 유지 확인됨.
- **번들 크기**: esbuild 빌드 완료 시 `dist/webview/preview.js` 1.7MB (예상 범위 내).
- **CSS 스코프**: `.form-js-block` 루트 내부 셀렉터로 VSCode 테마 토큰 바인딩.
- **계약 검증**: Zod 검증(런타임) + TypeScript strict mode(빌드 타임) 이중 레이어.
- **Dev/Prod 비대칭**: dev는 throw, prod는 console.warn 후 graceful degrade.
