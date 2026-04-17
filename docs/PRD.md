# PRD — form-js 기반 전문 화면 디자이너

> **연계 문서**
> - 기술 설계 원본: [`docs/idea.md`](./idea.md)
> - 기술 명세: [`docs/TRD.md`](./TRD.md)
> - 아키텍처 결정 기록 (ADR):
>   - [`docs/adr/0001-single-render-pipeline.md`](./adr/0001-single-render-pipeline.md) — WYSIWYG (Acceptance Criteria #4-1 구현 근거)
> - 라이선스: [`LICENSE`](../LICENSE) (bpmn.io 워터마크 의무)

---

## 0. 확정된 제약 (변경 불가)

- form-js 유지 (포크/리라이트 X)
- Preact 단일 스택 (React 분리 안 함)
- bpmn.io 워터마크 노출 (`packages/form-js-viewer/src/render/components/PoweredBy.js`, `FormComponent.js:48`)
- 신규 의존성은 permissive(MIT/Apache/ISC/BSD)만 허용
- AI 디자인은 Skills + Slash Commands + CLI + Hooks (MCP 미사용)
- 신규 패키지는 기존 form-js 모노레포에 `designer-*`로 추가
- Camunda/bpmn.io 패밀리(didi 포함)는 form-js 기본 의존이라 그대로 사용
- 한국어(ko) 1차 지원

---

## 1. Problem Statement

이 디자이너가 해결하는 핵심 고통점 (우선순위 순):

1. **운영 변경 속도 저하** — 화면을 바꿀 때마다 코드 수정·배포가 필요해서 변경 리드타임이 길다.
2. **디자이너↔개발자 핸드오프 비용** — 시안을 코드로 재작업하는 단계에서 손실·왜곡·중복 작업이 발생한다.
3. **업무 화면 표현력 부족** — 기존 form-js 컴포넌트만으로는 테이블·복합 레이아웃 같은 실제 업무 화면을 만들지 못한다.
4. **AI 설계 표준 인터페이스 부재** — AI에게 화면 설계를 맡길 표준 입력/출력(JSON 스키마·툴 인터페이스)이 없다.

---

## 2. Target Users / Persona

### Author (디자인하는 사람)
- 개발자 (코드 수정 가능)
- UI/UX 디자이너
- AI 에이전트 (Claude 등)

> 비기술 직군(기획자/PM, 현업 운영자)은 1차 대상에서 제외.

### End User (결과 화면을 사용하는 사람)
- 사내 임직원 (백오피스)
- 외부 고객 (B2C/B2B)
- 모바일 사용자
- 기타

### 1차 타깃
**Author** — 디자인 도구로서의 사용성·생산성을 가장 먼저 만족시킨다. End User 측 UX는 Author가 만든 결과물의 품질로 간접 달성.

## 3. User Stories / Use Cases

### US-1 (핵심 시나리오)
**개발자가 AI를 활용해 화면을 디자인 → JSON으로 저장 → 배포/적용 → 운영 환경이 그 JSON을 렌더링.**

흐름:
1. 개발자가 디자이너를 연다.
2. AI(Skill/Slash Command/Hook)에게 화면 의도를 지시하거나 직접 컴포넌트를 배치한다.
3. 결과를 JSON 스키마로 저장한다.
4. 저장한 JSON을 운영 환경에 배포 또는 적용한다.
5. 운영 환경의 form-js 런타임이 해당 JSON을 받아 즉시 렌더링한다.

## 4. Acceptance Criteria

다음 항목이 모두 충족되어야 1차 릴리스로 인정한다.

1. 디자이너에서 form-js 기본 컴포넌트 + 신규 컴포넌트(테이블 등)를 드래그·드롭으로 배치 가능.
2. AI Skill/Slash Command 1개 이상으로 "화면 의도 → JSON 스키마" 생성 가능.
3. JSON 스키마를 파일로 저장/불러오기 가능.
4. 운영 환경(form-js viewer)에서 동일 JSON을 수정 없이 렌더링 (round-trip 무손실).
4-1. **WYSIWYG 충실도** — 디자이너에서 보이는 모습과 운영 환경에서 실제 렌더링되는 모습이 시각적으로 동일해야 한다. (스타일·간격·배치·반응형 모두 포함. 디자이너 전용 표시(가이드/선택 핸들/그리드 등)는 예외.) → 구현 근거: [ADR-0001](./adr/0001-single-render-pipeline.md)
5. 한국어 UI/메시지 100% 지원.
6. bpmn.io 워터마크 정상 노출 (라이선스 의무 충족, CSS 숨김·overlap 금지).
7. 프로퍼티 패널을 JSON으로 커스터마이징 가능.
8. 테이블 고급 기능(편집·필터·멀티헤더·컬럼이동) 동작.
9. 운영 환경 JSON 배포는 정적 파일·API endpoint 양쪽 모두 지원.
10. 모든 사용자 가시 문자열은 `t('key.path')` 패턴으로 분리, ko 사전 100% 채움.

## 5. Out of Scope (1차 릴리스 제외)

- 모바일 전용 디자이너 UI — 디자이너 자체는 데스크톱만. (운영 화면의 모바일 렌더링은 별개로 지원)
- JSON 스키마 버전 관리·diff·롤백 UI — 외부 VCS(Git 등)에 위임.
- 디자이너 내장 데이터 소스 연결 GUI — DB/REST 자동 바인딩 GUI는 추후.
- 디자이너 내 실시간 협업 (멀티커서·동시 편집).
- Author 권한·역할 관리.
- 워크플로우/BPMN 연동 (Camunda 작업 폼 통합).
- 자체 테마 빌더 (디자인 토큰 GUI 편집).
- 플러그인 마켓플레이스.
- 다국어 사전 (ko 외 언어 사전) — i18n **패턴**은 도입하되 외국어 사전은 추후.
- 디자이너 내 AI Skill 호출 패널 — AI는 Claude Code CLI에서만 호출, 디자이너는 결과 JSON을 import.
- **JSON → JSX(React/Preact) eject** — 향후 확장 기능으로 이전.

## 6. Open Questions / Decisions

- **Q1. 신규 컴포넌트 라이브러리 베이스** — 미정. 구현 단계에서 후보(shadcn 포팅·Radix Primitives·Park UI·Ark UI·Mantine 등) 비교 후 결정.
- **Q2. 테이블 라이브러리** — 미정. 구현 단계에서 후보(TanStack Table·AG Grid Community·Glide Data Grid 등) 비교 후 결정.
- **Q3. AI Skill 호출 진입점** — Claude Code CLI에서만 호출. Skill은 JSON 파일을 저장하고, 디자이너는 그 JSON을 import해서 편집한다. (디자이너 내장 AI 패널 없음)
- **Q4. eject 산출물 형식** — 1차는 JSON만. JSX(React/Preact) eject는 향후 확장 기능으로 이전 (§7 참고).
- **Q5. 운영 환경 JSON 배포 방식** — 정적 파일(번들)과 API endpoint 양쪽 모두 지원.
- **Q6. i18n 추상화** — 1차부터 도입. 모든 사용자 가시 문자열을 `t('key.path')` 패턴으로 분리하고, ko 사전을 채움. 라이브러리·외국어 사전은 추후 결정.
- **Q7. 1차 제외 항목** — 실시간 협업·권한·BPMN 연동·테마 빌더·플러그인 마켓플레이스는 모두 §5로 이동 (1차 제외).

---

## 7. 향후 확장 (Future / Post-v1)

- JSON → JSX eject (React 단일 파일 / Preact 컴포넌트 / 양쪽).
- 다국어 사전 추가 (en 등).
- 실시간 협업, 권한 관리, BPMN 연동, 테마 빌더, 플러그인 마켓플레이스.
- 디자이너 내장 데이터 소스 연결 GUI.
- 디자이너 내장 AI Skill 호출 패널.
