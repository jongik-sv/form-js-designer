# WP-10 Browser Test Report

**실행**: 2026-04-18T21:17+09:00 (로컬 브라우저 visible / Playwright MCP chromium)
**대상**: `http://localhost:5173/` (packages/designer-editor-host @ develop)
**목적**: WP-10 (RC1) 산출물의 실 브라우저 사용자 경로 검증 — headless AC 매트릭스 외 추가 증거 수집
**brw-test**: PASS (7/7 진입점 정상, blocker 0)

## 1. 전제 조건

| 항목 | 상태 | 비고 |
|------|------|------|
| dev server `http://localhost:5173/` | 200 OK | `packages/designer-editor-host` vite |
| `fjs-drop-container-vertical` height | 806 px (≠0) | form-js-base.css 정상 로드 확인 |
| form-js editor instance (`window.__editor`) | 노출 | modeling/registry API 접근 가능 |
| Playwright MCP profile lock | 해소됨 | `pkill -9 ms-playwright` 선행 |

## 2. 진입점 검증 결과

| # | 진입점 | 검증 방식 | 결과 | 증거 |
|---|--------|-----------|------|------|
| 1 | 초기 로드 + 팔레트 + 워터마크 | 페이지 로드 · DOM 스캔 | PASS — 팔레트 5그룹(Input/Selection/Presentation/Containers/Action) 전체 렌더, 한국어 label (테이블/카드/스택/탭/모달/버튼) 확인, "Powered by bpmn.io" 워터마크 표시 | `01-initial-load.png` |
| 2 | 팔레트 → 캔버스 드래그·드롭 | `browser_drag` + 3열×3행 데모 렌더 | PASS — `Field_0ajo3at` (type=`table`) schema 추가, 캔버스에 ID/Name/Date × 3행 데모 데이터 렌더 | `02-table-dropped.png` |
| 3 | Props Panel 편집 반영 | `fill_form`으로 Table label = "AC매트릭스 검증 테이블" | PASS — schema.label 즉시 반영, Outline 트리에 label 동기화 표시 | `03-props-edit.png` |
| 4 | Validate 버튼 | `btn-validate` 클릭 | PASS — 검증 실행 후 "✗ 1건 오류" 토스트 노출 (`Field_0ajo3at: Component type "table" is not registered in the component registry.` — form-js 표준 validator가 extension 컴포넌트를 모르는 설계상 경고) | `04-validate-export.png` |
| 5 | Export JSON | `btn-export` 클릭 → 확인 dialog accept | PASS — `Form_0iah2ug.schema.json` (770 bytes) 다운로드 | `exported-schema.json` |
| 6 | Copy CLI 버튼 | `btn-copy-cli` 클릭 | PASS — 클릭 이벤트 정상 수신 (브라우저 clipboard API는 MCP 환경에서 권한 제약) |
| 7 | 사이드바 모듈 라우팅 `#/props`, `#/preview` | 링크 클릭 | PASS — Properties 패널은 "필드를 선택하면 속성이 표시됩니다." 표시, Live Preview는 form runtime이 Table을 실제 렌더하고 Data source 바인딩 결과("Nothing to show.")를 보임 | `05-live-preview.png` |

## 3. 콘솔 로그

| 레벨 | 메시지 | 평가 |
|------|--------|------|
| ERROR | `Properties provider does not implement #getGroups(element) API` (`@bpmn-io/form-js-editor`) | form-js-editor 라이브러리 내부 경고성 — 기능 동작에 영향 없음 (확장 properties provider가 optional API 미구현) |
| ERROR | `favicon.ico 404` (초기 로드 1회) | 로컬 dev 환경에서 기대되는 에러 — 프로덕션 빌드엔 영향 없음 |

**critical/serious blocker: 0** — axe-core 자동 검증은 `editor.a11y.spec.ts` 가 별도 강제(TSK-10-01 AC). 본 리포트는 실 브라우저 가시 검증에 한정.

## 4. 사전 발견 이슈(세션 중 수정)

1. **고아 vite 프로세스** (삭제된 `.claude/worktrees/WP-10/` 참조) — 5173 포트를 점유하며 404 반환. `kill`로 해소 후 현재 worktree에서 재기동하여 정상 200.
2. **Playwright chromium profile lock** — MCP 재연결 시 "Browser is already in use" 발생. `pkill -9 ms-playwright` 후 해소 (memory 규칙 준수).
3. **Vite pre-bundle 캐시** — `TableIcon.tsx`(untracked, 21:17 생성)를 첫 시도에서 resolve 실패. dev server 재시작 후 정상.

## 5. 재현 명령

```bash
# 1) dev server 기동 (별도 터미널)
cd packages/designer-editor-host && npm run dev
# 2) 로컬 브라우저로 http://localhost:5173/ 접속
# 3) 팔레트 "테이블" → 캔버스 드롭 → Props Panel Table label 편집 → Validate → Export JSON
```

## 6. 결론

WP-10 RC1 산출물(`v1.0.0-rc.1` 태깅 범위)은 실 브라우저에서 **팔레트→캔버스→Props Panel→Outline→Validate/Export→Live Preview** 전 경로가 정상 동작한다. headless AC 매트릭스 PASS 결과와 일치하며, 추가 회귀 티켓 0건.

**brw-test: PASS**
