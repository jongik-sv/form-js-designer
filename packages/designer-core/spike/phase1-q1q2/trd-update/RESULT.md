# task-8 — TRD.md §3 / §13 갱신 결과

**Worker**: phase1-spike task-8 (TRD update)
**일자**: 2026-04-17
**수정 파일**: `docs/TRD.md` (단일 파일, 기타 건드리지 않음)
**diff stat**: `+35 −9` (총 44줄 변경)
**diff 원본**: `./measurements/trd-diff.txt`

## 변경 범위 요약

### §3 UI 라이브러리 (1차)

- 표에 `비고` 컬럼 추가 (기존 4열 포맷 복원).
- `헤드리스 프리미티브` 행을 **"Radix UI + preact/compat (Phase 1 본체, 조건부) / Zag.js 저수준 + 자체 Preact 어댑터 (fallback)"** 로 치환, 비고를 "spike 완료 · ADR-0002 작성 중" 으로 설정.
- 기존 **`> Q1·Q2 결정 게이트`** blockquote (idea.md 권장안 문구) 를 **`> Q1 spike 결과 (Phase 1 §2, 2026-04-17)`** blockquote 로 교체. 포함 내용:
  - 1순위 Radix 조건부 채택 근거 (gzip 28.82 KB, workaround 0 LOC, 사전 버그 전수 미재현)
  - 채택 조건 3건 (preact overrides / Portal.container `<main>` 주입 / 버전 업데이트 시 parity 재실행)
  - 2순위 Zag+자체 fallback 수치 (+3.99 KB 초과·axe 0 위반·어댑터 309 LOC)
  - 3순위 Headless UI, 탈락 Ariakit (pageerror 25건 + shim 200~400 LOC), 자작(E) Dialog 한정 실측 진행 중 (extrapolated fallback only 표기)
  - 최종 결정서 참조: `docs/adr/0002-ui-primitives.md`, `docs/phase-1-plan.md §2.1`

### §3 테이블

- 표에 `비고` 컬럼 추가. 헤드리스 테이블 / 가상화 / 컬럼 드래그 3행 모두 **확정** 표기.
- 헤드리스 테이블 비고: "확정 (Phase 1 §2 spike task-1 FPS 59.99 @ 10k rows, 합격선 55)".
- 신규 blockquote `> Q2 spike 결과`: TanStack + TanStack Virtual + dnd-kit + preact/compat 조합 FPS 59.99, 멀티헤더 3단계·dnd-kit 컬럼 이동·preact/compat hooks 호환 전부 통과, **PD1-A 자동 확정 · canvas 예외 조항 불필요**. 참조: `docs/adr/0003-table-library.md` (작성 중·task-7), `docs/phase-1-plan.md §2.2`.

### §13 결정·미결 사항

- Q1 행: "**Phase 1 §2 spike 완료 (2026-04-17)**. 1순위 Radix UI + preact/compat 조건부 채택, 2순위 Zag+자체 Preact 어댑터 fallback. Headless UI 3순위, Ariakit 탈락. 자작(E)는 Dialog 한정 실측 진행 중. ADR-0002 작성 중 (task-6 자작 E 완료 후 최종 머지). 상세: §3 각주 + §13.1."
- Q2 행: "**Phase 1 §2 spike 완료 (2026-04-17)**. TanStack Table v8 + TanStack Virtual + dnd-kit 확정 (FPS 59.99 @ 10k rows, PD1-A 자동 확정, canvas 예외 조항 불필요). ADR-0003 작성 중 (task-7). 상세: §3 테이블 각주 + §13.1."
- Q3~Q7: **손대지 않음**.

### §13.1 Q1·Q2 spike 수치 요약 (신규 서브섹션)

§13 표 바로 아래, §14 직전에 6행 표 추가:

| 후보 | pageerror | axe 3상태 합 | gzip 증분 | workaround | 판정 |
|---|---|---|---|---|---|
| Radix UI + preact/compat (Q1 1순위) | 0 | 2 region moderate (호스트 완화) | 28.82 KB | 공유 alias 12줄 · 컴포넌트 0 LOC | 본체 조건부 채택 |
| Zag.js + 자체 어댑터 (Q1 2순위) | 0 | 0 (4후보 유일) | 33.99 KB (+3.99) | 어댑터 309 LOC + 컴포넌트 ≤47 LOC | fallback |
| Headless UI + preact/compat (Q1 3순위) | 0 | 1 serious | 46.17 KB | config 16줄 · 컴포넌트 0 LOC | 조건부 (번들 예산 재협상 시) |
| Ariakit + preact/compat | 25 fatal | 1 region (은폐) | 34.38 KB | 해소 shim 200~400 LOC 추정 | 탈락 |
| 자작 + WAI-ARIA (E) | 실측 진행 중 (task-6) | — | — | — | extrapolated fallback only |
| TanStack Table v8 (Q2 확정) | — | — | 45.3 KB (테이블 단독) | — | 확정 (FPS 59.99 / 10k rows · PD1-A) |

원본 경로 주석 포함.

## 변경되지 않은 영역

- §0~§2, §4~§12, §14 전체 보존 (diff 0)
- §3 중 런타임 코어 / 빌드·테스트·DX / CI 게이트 섹션 보존
- §13 Q3~Q7 행 보존

## 검증 체크리스트

- [x] §3 UI 라이브러리 표 `비고` 컬럼 정합 (5행 모두 헤더와 일치)
- [x] §3 테이블 표 `비고` 컬럼 정합 (3행 모두)
- [x] §13 표 5행 Q1~Q7 유지, Q1/Q2만 치환
- [x] 신규 §13.1 서브섹션이 §14 위에 위치
- [x] 측정값은 task-1~5.done 직접 인용 (FPS 59.99 · 28.82 KB · 33.99 KB · 46.17 KB · 34.38 KB · pageerror 25 · 어댑터 309 LOC · 합격선 55/30 KB)
- [x] 자작(E) Dialog 실측 진행 중을 `extrapolated fallback only` 로 표기
- [x] ADR-0002/0003 참조를 "작성 중" 상태로 명기
- [x] `*.module.css`, `process.env.NODE_ENV` 사용 0 (해당 없음)

## TRD 외 불일치 기록

(없음 — 본 worker 가 파악한 범위 내에서 §3/§13 외 섹션의 수치·참조에 모순 없음)

## 산출물 경로 (본 worker)

- `docs/TRD.md` — 편집 완료
- `packages/designer-core/spike/phase1-q1q2/trd-update/RESULT.md` — 본 문서
- `packages/designer-core/spike/phase1-q1q2/trd-update/measurements/trd-diff.txt` — `git diff docs/TRD.md` 원본 (75 라인)

## 완료 시그널

- `/tmp/claude-signals/phase1-spike/task-8.running` → 작업 중 하트비트 유지
- `/tmp/claude-signals/phase1-spike/task-8.done` → 본 RESULT 요약 포함
