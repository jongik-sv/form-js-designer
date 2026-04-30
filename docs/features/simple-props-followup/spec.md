# simple-props-followup

> **단일 소스:** `~/.claude/plans/simple-properties-elegant-metcalfe.md` (사용자 승인 완료, 모든 결정 lock)
> **선행:** `~/.claude/plans/file-users-jji-project-form-js-designer-sunny-meteor.md` (Tasks 1~9 완료, commits `99869ff` ~ `17223cd`)
> **Worktree:** 본 디렉토리(`/Users/jji/project/form-js-designer-simple-props`, branch `feat/simple-props-panel`)

## 목적

bugfix + feature: sunny-meteor plan으로 들어간 Simple/Full Properties 패널의 follow-up 7건(FU-A~G) 처리. `docs/designer/수정대기.md`의 누적 항목 + 사용자 호소 "매번 회귀 발생"에 대한 가드까지 포함.

## 성공 기준

- 단위 테스트 + 빌드 + 타입체크 모두 통과
- **web / tiptap / vscode 3타겟 모두 visible Playwright로 회귀 체크리스트 12개 시나리오 통과** (headless·단일 타겟 done 선언 금지 — 메모리 정책)
- `docs/designer/수정대기.md` Simple Properties 섹션 항목 close

## 도메인

frontend

## 진입점 (Entry Points)

- 사용자 진입 경로 (web): `http://localhost:5173` → 좌측 팔레트에서 컴포넌트 drag → 캔버스 drop → 클릭 선택 → 우측 Properties 패널
- 사용자 진입 경로 (vscode): VSIX 설치 → `.form-js-designer` 파일 open → 동일
- 사용자 진입 경로 (tiptap): tiptap 데모 페이지 → formJsBlock 더블클릭 → embedded modal → 동일
- 수정할 핵심 파일:
  - `packages/designer-runtime/src/modules/LayoutHeightApplier.ts` — LAYOUT_HEIGHT_TARGET_TYPES 17종으로 확장
  - `packages/designer-editor-host/src/modules/PropsPanelService.ts` — _buildLayoutGroup Spacer 전용 분기
  - `packages/designer-editor-host/src/modules/InlineLabelEditModule.ts` (신규) + Service
  - `packages/designer-editor-host/src/components/PropsPanelContainer.tsx` — collapse 제거
  - `packages/designer-editor-host/src/App.tsx` — 모듈 등록
  - `packages/designer-vscode-extension/src/editor/customEditor.ts` — default mode + 모듈 등록
  - `packages/designer-tiptap/src/editor/withDesigner.ts` — embedded modal 모듈 mount + default mode
  - `packages/designer-editor-host/src/app.css` — form-js native와 동일 styling
  - `packages/designer-i18n/locales/ko.json` — imageSource/altText/title/description/staticColumns 라벨 보충

## 범위 경계

- 포함: designer-runtime, designer-editor-host, designer-vscode-extension, designer-tiptap, designer-i18n (5 packages)
- 제외: 새 form-js field 타입, 새 propsSchema 필드(Table headerItems는 라벨만), WBS, 다른 Feature

## 제약

- 기존 form-js native dblclick handler와 충돌 금지 (FU-B selector 엄격화 — `.fjs-form-field-label` only)
- VSIX 패키징은 unscoped name rename 패턴 유지 (메모리 `project_vsix_packaging_unscoped`)
- Playwright는 `plugin_playwright` 사용 + 시작 전 `pkill -f "Google Chrome.*playwright"` (메모리 `feedback_playwright_mcp_env`)
- **각 FU commit 직후 mini-회귀 검증** (3타겟 시나리오 ①~③ 만이라도) — 사용자 호소 "매번 회귀" 차단

## 비고

모든 결정은 plan 파일에서 lock됨. AskUserQuestion 3건 이미 답변 받음:
- Q1: vscode/tiptap = "simple + 토글 유지하되 디폴트 simple"
- Q2: Table headerItems = "staticColumns 라벨만 보충"
- Q3: Height 핸들 추가 = chartPlaceholder + tree + table + iframe

상세 단계는 plan 파일의 FU-A~G 섹션 참조.
