# TSK-05-03 테스트 보고서

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | 205  | 0    | 205  |
| E2E 테스트  | 0    | -    | -    |
| 정적 검증   | -    | 0    | -    |

## 단위 테스트 결과

### 전체 단위 테스트 실행

```
Test Files  19 passed (19)
     Tests  205 passed (205)
  Start at  21:09:53
  Duration  1.41s (transform 1.57s, setup 0ms, import 3.31s, tests 255ms, environment 5.33s)
```

### Card (CardRenderer)

- [x] label 있는 Card 스키마가 viewer에서 `.fjs-card__header` 요소와 label 텍스트를 렌더한다
- [x] label 없는 Card 스키마가 헤더 없이 본문만 렌더한다 (`.fjs-card__header` 부재)
- [x] `actions` 배열이 있는 Card는 `.fjs-card__footer` + 버튼 목록을 렌더한다
- [x] `actions` 없는 Card는 footer를 렌더하지 않는다
- [x] Card 내 `components`가 form-js 기존 row/columns로 정상 렌더된다
- [x] Card 단일 블록 fixture에 대해 axe violation 0 (serious/critical)
- [x] High Contrast 테마에서 Card border가 `--vscode-panel-border` 색으로 가시적이다

**결과**: PASS

### Stack (StackRenderer)

- [x] `direction: 'horizontal'` Stack이 flex-direction: row로 렌더된다
- [x] `direction: 'vertical'` Stack이 flex-direction: column으로 렌더된다
- [x] `gap: 16` 설정 시 CSS gap이 `16px`로 적용된다
- [x] `wrap: true` 설정 시 flex-wrap: wrap이 적용된다
- [x] Stack에 `min-height: 0`이 적용되어 overflow가 발생하지 않는다
- [x] Stack 단일 블록 fixture에 대해 axe violation 0

**결과**: PASS

### Modal (ModalRenderer)

- [x] trigger 버튼이 렌더되고 키보드 Tab으로 포커스 가능하다
- [x] trigger 버튼 클릭 → `<dialog>` open 상태가 된다
- [x] Modal이 열렸을 때 포커스가 dialog 내 첫 번째 focusable 요소로 이동한다
- [x] dialog 열린 상태에서 Tab 키가 dialog 내부에서만 순환한다 (focus trap)
- [x] dialog 열린 상태에서 Shift+Tab 키가 역방향 순환한다
- [x] Esc 키 → dialog가 닫히고 trigger 버튼으로 포커스가 반환된다
- [x] backdrop 영역 클릭 → dialog가 닫힌다
- [x] Modal portal DOM이 `.form-js-block` 내부의 `.fjs-portal-root`에 마운트된다
- [x] `document.body` scroll lock이 걸리지 않는다
- [x] Modal 단일 블록 fixture에 대해 axe violation 0
- [x] High Contrast 테마에서 dialog outline/border가 가시적이다

**결과**: PASS

### Portal Root (portalRoot 유틸)

- [x] `.form-js-block` 조상 요소 내에서 `.fjs-portal-root` div를 lazy 생성한다
- [x] 이미 생성된 portal root를 재사용한다 (중복 생성 방지)
- [x] `document.body`에 누출되지 않는다

**결과**: PASS

## E2E 테스트 결과

### BLOCKER: VSCode 다운로드 타임아웃

```
- Resolving version...
✔ Validated version: 1.116.0
- Found at https://update.code.visualstudio.com/1.116.0/darwin-arm64/stable?released=true
✔ Found at https://update.code.visualstudio.com/1.116.0/darwin-arm64/stable?released=true
- Downloading (198.44 MB)

[run-test] TIMEOUT: 300s 초과 — 프로세스 그룹 종료됨
```

**분류**: Pre-existing 환경 제약 조건 (Task 범위 밖)

**원인 분석**:
- E2E 테스트는 `@vscode/test-electron`을 통해 VSCode 1.116.0을 자동 다운로드
- 환경 네트워크 제약으로 198.44 MB 파일이 300초 이내 다운로드 불가
- 해당 타임아웃은 run-test.py 래퍼의 300초 limit 의해 발생

**QA 체크리스트 — E2E 항목 상태**: 모두 **unverified** (E2E 환경 부재)

## 정적 검증 결과

### Lint

```
npm -w @form-js-designer/designer-vscode-extension run lint

> @form-js-designer/designer-vscode-extension@0.1.0 lint
> echo 'lint: not yet configured'

lint: not yet configured
```

**결과**: N/A (린트 규칙 미구성)

### Typecheck

```
npm -w @form-js-designer/designer-vscode-extension run typecheck

> @form-js-designer/designer-vscode-extension@0.1.0 typecheck
> tsc --noEmit
```

**결과**: PASS

## 최종 평가

**단위 테스트**: 205/205 PASS
**Typecheck**: PASS
**E2E 테스트**: BLOCKER (환경 제약 — VSCode 다운로드 타임아웃)

**최종 판정**: `test.fail` — BLOCKER

환경 제약으로 인해 E2E 테스트 미실행. 로컬 개발 환경에서 재실행 필요.
