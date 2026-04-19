# TSK-09-01: AI Skill (.claude/skills/designer + design-* commands 4종) - 설계

## 요구사항 확인

- `.claude/skills/designer/SKILL.md`를 작성하여 Claude Code AI가 자연어 화면 의도를 받아 form-js 호환 JSON 스키마(`schemas/drafts/*.schema.json`)를 산출하도록 한다. 컴포넌트 스펙은 `packages/designer-*/src/*/spec.json`을 Read 도구로 직접 참조한다.
- `design-page` · `design-add` · `design-modify` · `design-validate` 4개 slash command(`.claude/commands/design-*.md`)를 구현한다.
- 각 command 호출 결과 JSON이 `designer-cli validate` (Ajv + 컴포넌트 레지스트리 검증) exit 0을 통과해야 한다 (PRD AC #2, D-P1-5).

## 타겟 앱

- **경로**: N/A (단일 앱) — 산출물은 `.claude/skills/designer/`, `.claude/commands/`, `schemas/drafts/` 3곳에 분산. 코드 파일이 아닌 마크다운·JSON이므로 빌드 파이프라인 밖. 테스트는 `packages/designer-cli/e2e/`에 위치.
- **근거**: WBS `domain=ai` — CLI/테스트 명령은 `npm --prefix packages/designer-cli run test:skill`로 수렴.

## 구현 방향

1. **SKILL.md (단일 진실 원천)**: Claude Code가 로드할 Skill 진입 문서. 입력(자연어 의도) → 처리(spec.json 참조 + 스키마 조립) → 출력(`schemas/drafts/<name>.schema.json` 저장) 흐름을 지시문 형태로 기술. form-js `schemaVersion=19` 구조 계약, 컴포넌트 type별 필수 프로퍼티, i18n 키 패턴을 명시.
2. **4개 command (thin wrapper)**: 각 `.claude/commands/design-*.md` 파일은 SKILL.md를 참조하는 thin wrapper. command별 차이점(입력 파싱, 파일 조작 방식, 호출 목적)만 인라인 기술.
3. **schemas/drafts/**: AI 산출 JSON 착지 디렉토리. `.gitkeep` + `README.md`(컨벤션 명시).
4. **ai-skill.spec.ts**: `packages/designer-cli/e2e/ai-skill.spec.ts` — 4 command 결과 픽스처 JSON을 Ajv로 검증. AI 호출 없이 픽스처 기반으로 flakiness 최소화 (D-P1-5 준수).

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `.claude/skills/designer/SKILL.md` | 메인 AI Skill 지시문. form-js schema 구조 계약(`schemaVersion: 19`, `type: "default"`, `components: [...]`), spec.json 참조 방법, 산출물 규약, i18n 키 패턴(`designer.{ns}.{key}`), 자기검증 절차 명시. | 신규 |
| `.claude/commands/design-page.md` | slash command: 새 페이지 전체 스키마 생성. 입력: 자연어 화면 의도(페이지명, 컴포넌트 목록, 데이터 바인딩). 출력: `schemas/drafts/<page-name>.schema.json`. SKILL.md 위임. | 신규 |
| `.claude/commands/design-add.md` | slash command: 기존 스키마에 컴포넌트 추가. 입력: 대상 schema 파일 경로 + 추가할 컴포넌트 지시. 출력: 동일 파일 수정(Read → merge → Write). 중복 id 방지 로직 포함. | 신규 |
| `.claude/commands/design-modify.md` | slash command: 기존 스키마의 특정 컴포넌트 부분 수정. 입력: 대상 파일 경로 + 수정 대상 id + 변경 지시. 출력: 동일 파일 수정. 다른 컴포넌트/필드 불변 보장. | 신규 |
| `.claude/commands/design-validate.md` | slash command: schema 파일 유효성 검증. `designer-cli validate <file>` Bash 실행 → exit code + 오류 목록 보고. | 신규 |
| `schemas/drafts/.gitkeep` | 빈 디렉토리 git 추적용 | 신규 |
| `schemas/drafts/README.md` | AI 산출 JSON 컨벤션 — 파일명 규칙, `designer-cli import`로 프로젝트 이관 절차, Ajv 검증 의무, 직접 편집 금지. | 신규 |
| `packages/designer-cli/e2e/ai-skill.spec.ts` | AC #2 검증 테스트. 4 commands × 2 시나리오(valid/invalid) = 8케이스. 픽스처 기반 — AI 실제 호출 없이 사전 생성된 JSON으로 Ajv + 컴포넌트 레지스트리 검증. | 신규 |
| `packages/designer-cli/e2e/fixtures/` | ai-skill.spec.ts가 사용하는 JSON 픽스처 디렉토리 (valid/invalid 각각 4개 = 8 파일). | 신규 |

## 진입점 (Entry Points)

**N/A** — `domain=ai`. 브라우저 UI 없음.

개발자/AI 진입점:
- `/design-page <자연어 의도>` — 신규 페이지 스키마 생성 (`.claude/commands/design-page.md`)
- `/design-add <파일> <컴포넌트 지시>` — 기존 스키마에 컴포넌트 추가 (`.claude/commands/design-add.md`)
- `/design-modify <파일> <id> <변경 지시>` — 기존 스키마 부분 수정 (`.claude/commands/design-modify.md`)
- `/design-validate <파일>` — `designer-cli validate` 호출 및 결과 보고 (`.claude/commands/design-validate.md`)

## 주요 구조

- **SKILL.md (§1 역할 선언)**: 화면 설계 AI임을 명시. 입출력 계약, 실행 순서, 금지 사항(하드코딩 문자열, schemaVersion 변경, spec.json 무시) 기술.
- **SKILL.md (§2 spec.json 참조)**: `packages/designer-components/src/{card,stack,button,tabs,modal}/spec.json` + `packages/designer-table/src/propsSchema.ts` Read 지시. type별 필수 필드 확인 방법 명시.
- **SKILL.md (§3 schema 구조 규칙)**: `{ "schemaVersion": 19, "type": "default", "components": [...] }` 골격. 컴포넌트 필수 필드: `{ "type", "id", ...props }`. id 패턴: `<type>-<6자리-timestamp>`.
- **SKILL.md (§4 i18n 규약)**: 가시 문자열은 `designer.{ns}.{key}` 패턴 키만 사용. 한국어 직접 기재 금지. 빈 문자열은 `""`.
- **SKILL.md (§5 자기검증)**: 저장 전 체크리스트 — `schemaVersion=19` 확인, 모든 type이 레지스트리 내 존재 확인, i18n 하드코딩 확인, 중복 id 확인.
- **design-add.md (중복 id 방지)**: 기존 schema Read → id 목록 추출 → 새 컴포넌트 id 생성 시 기존 id와 충돌 검사.
- **ai-skill.spec.ts (픽스처 검증)**: `packages/designer-cli/src/commands/validate.ts`의 validate 함수를 직접 import하여 픽스처 JSON 검증 (CLI subprocess 없이). 8케이스 모두 동기적 실행.

## 데이터 흐름

**설계 흐름**: 자연어 의도(Claude Code 입력) → SKILL.md + spec.json 참조 → form-js 호환 JSON 조립 → `schemas/drafts/<name>.schema.json` 저장

**검증 흐름**: `.schema.json` 파일 → Ajv(form-js schemaVersion=19 meta) + 컴포넌트 레지스트리 타입 체크 → exit 0(성공) / exit 1(오류 목록)

## 설계 결정 (대안이 있는 경우만)

- **결정**: SKILL.md는 단일 파일로 모든 규약을 담고, 4개 command는 SKILL.md를 참조하는 thin wrapper로 작성.
- **대안**: 각 command 파일에 규약을 인라인 중복 기술.
- **근거**: 규약 변경 시 SKILL.md 1곳만 수정하면 전 command에 반영 (DRY). command별 차이점만 각 파일에 기술.

---

- **결정**: 컴포넌트 스펙 소스는 `packages/designer-components/src/{type}/spec.json` (순수 JSON). table은 `propsSchema.ts` 직접 참조 + SKILL.md에 인라인 스니펫.
- **대안**: propsSchema TypeScript 파일 전체 참조.
- **근거**: spec.json은 AI가 Read 도구로 즉시 파싱 가능. table은 spec.json이 없으므로 인라인 스니펫으로 동기화 부담 최소화.

---

- **결정**: 산출 JSON의 컴포넌트 id 패턴은 `<type>-<6자리-timestamp>` (예: `card-1716700000`).
- **대안**: uuid v4.
- **근거**: AI가 지시문으로 생성 가능한 결정론적 패턴. UUID는 진짜 난수 필요. 향후 cli import 단계에서 중복 방지 처리 별도 존재.

---

- **결정**: `ai-skill.spec.ts`는 픽스처 기반 — AI를 실제 호출하지 않고 사전 생성된 JSON으로만 Ajv 검증.
- **대안**: AI를 실시간 호출하여 결과 검증.
- **근거**: AI 호출은 비결정적이므로 테스트 flakiness 유발. D-P1-5: "수락 기준은 `designer-cli validate` 통과만". R7 완화 전략 그대로 적용.

## 선행 조건

- **TSK-08-01 완료**: `packages/designer-cli/src/commands/validate.ts`(Ajv + 컴포넌트 레지스트리 검증, exit 0/1)가 존재해야 `design-validate.md`와 `ai-skill.spec.ts`가 동작.
- **spec.json 파일 존재**: `packages/designer-components/src/{card,stack,button,tabs,modal}/spec.json` 5종 — TSK-04-01/04-02 산출물로 존재 확인.
- **form-js schemaVersion=19**: TRD §3.1 확인 (하드코딩 값).

## 리스크

- **HIGH** — TSK-08-01 미완성 시 `ai-skill.spec.ts` 동작 불가. **완화**: SKILL.md + command 파일은 designer-cli 독립이므로 먼저 작성 가능. 테스트는 TSK-08-01 완료 후 작성 (의존 확인 후 착수).
- **HIGH** — AI가 비결정적으로 잘못된 JSON 산출 (type 오탈자, i18n 하드코딩, schemaVersion 변경). **완화**: SKILL.md §5 "저장 전 자기검증" 단계 — AI가 저장 직전 체크리스트로 스스로 검토. 실패 시 수정 후 재저장.
- **MEDIUM** — `designer-table`에 spec.json 없어 SKILL.md에서 table 스펙 참조 시 TypeScript 파일 파싱 필요. **완화**: SKILL.md에 table propsSchema 인라인 JSON 스니펫 포함 (propsSchema.ts에서 파생).
- **LOW** — `.claude/commands/` 경로가 Claude Code 슬래시 커맨드 로더와 불일치 가능. **완화**: Claude Code 공식 문서 기준 `.claude/commands/<name>.md` → `/<name>` 등록 확인 후 작성.

## QA 체크리스트

- [ ] **정상 — design-page**: SKILL.md 지시대로 `/design-page 로그인 페이지, 이메일+비밀번호 입력+로그인 버튼` 실행 시 `schemas/drafts/login-page.schema.json` 생성 → `designer-cli validate` exit 0.
- [ ] **정상 — design-add**: 기존 스키마에 `/design-add card 추가` 실행 시 `components` 배열에 `type: "card"` 엔트리 추가 → validate exit 0.
- [ ] **정상 — design-modify**: 특정 id 컴포넌트에 `/design-modify <id> padding lg로 변경` 실행 시 해당 컴포넌트만 `padding: "lg"` 변경, 다른 컴포넌트/필드 불변 → validate exit 0.
- [ ] **정상 — design-validate (valid)**: 유효 JSON → `designer-cli validate` exit 0 + "유효합니다" 메시지.
- [ ] **에러 — design-validate (invalid)**: `type: "nonexistent-component"` 포함 JSON → exit 1 + `UNKNOWN_COMPONENT_TYPE` 오류 메시지 출력.
- [ ] **엣지 — schemaVersion 준수**: AI 산출 JSON에 항상 `"schemaVersion": 19` 포함.
- [ ] **엣지 — i18n 하드코딩 금지**: AI 산출 JSON에 한국어 직접 문자열 없음 (값이 `designer.*` 패턴 키 또는 빈 문자열).
- [ ] **엣지 — 중복 id 방지**: `design-add` 실행 시 기존 schema의 id와 중복되는 id 미생성.
- [ ] **통합 — ai-skill.spec.ts 8케이스**: 4 commands × 2 시나리오(valid/invalid) 픽스처 JSON Ajv 검증 전체 pass (`npm --prefix packages/designer-cli run test:skill`).
- [ ] **통합 — table 컴포넌트**: `design-page`로 table 포함 스키마 생성 시 `columns` 배열 구조가 ColumnDef 타입 준수 → validate exit 0.
- [ ] **통합 — spec.json 로딩**: SKILL.md 지시에 따라 `packages/designer-components/src/card/spec.json` Read 후 card 컴포넌트 props를 올바르게 산출 (`padding`, `elevation`, `header`, `headerTag`).
