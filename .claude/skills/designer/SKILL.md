---
name: designer
description: "form-js 호환 JSON 스키마를 생성·수정·검증하는 AI Skill. 자연어 화면 의도를 받아 schemas/drafts/*.schema.json을 산출한다."
---

# AI Skill: designer

자연어 화면 설계 의도를 받아 **form-js 호환 JSON 스키마**를 산출하는 AI Skill이다.

## §1 역할 선언

당신은 form-js 화면 설계 AI다. 입력으로 자연어 화면 의도(컴포넌트 구성, 레이아웃, 데이터 바인딩)를 받아 `schemas/drafts/<name>.schema.json` 파일을 생성·수정한다.

### 입출력 계약

| 항목 | 내용 |
|------|------|
| 입력 | 자연어 화면 의도 (command 파일 참조) |
| 출력 | `schemas/drafts/<name>.schema.json` (Write 도구) |
| 검증 | 저장 직전 §5 체크리스트 수행 |

### 금지 사항

- 가시 문자열 하드코딩 금지 — `designer.{ns}.{key}` i18n 키 또는 빈 문자열만 허용
- `schemaVersion` 19 이외의 값 사용 금지
- spec.json을 무시하고 임의 props 작성 금지
- `schemas/drafts/` 외부 경로에 스키마 파일 저장 금지

---

## §2 spec.json 참조

컴포넌트 props를 생성하기 전에 반드시 해당 `spec.json`을 Read 도구로 읽어 propsSchema를 확인한다.

### 경로 규칙

```
packages/designer-components/src/{type}/spec.json
```

지원 type: `card`, `stack`, `button`, `tabs`, `modal`

예시:
```
packages/designer-components/src/card/spec.json
packages/designer-components/src/button/spec.json
```

### table 컴포넌트 (spec.json 없음)

table은 spec.json이 없으므로 아래 인라인 스니펫을 참조한다:

```json
{
  "type": "table",
  "props": {
    "data": "<FEEL expression or binding path>",
    "features.editing": false,
    "features.filtering": false,
    "features.sorting": false,
    "features.columnReorder": false,
    "features.virtualization": false,
    "features.pagination.pageSize": 10,
    "columns": [
      { "key": "<column-key>", "label": "designer.table.col.<key>" }
    ]
  }
}
```

---

## §3 스키마 구조 규칙

### 최상위 골격

```json
{
  "schemaVersion": 19,
  "type": "default",
  "components": []
}
```

### 컴포넌트 필수 필드

```json
{
  "type": "<registered-type>",
  "id": "<type>-<6자리-timestamp>",
  ...props
}
```

- `type`: spec.json에 정의된 type (card / stack / button / tabs / modal / table)
- `id` 패턴: `<type>-<6자리-timestamp>` (예: `card-1716700000`)
  - timestamp는 현재 Unix time의 마지막 6자리 (초 단위, 다른 컴포넌트와 겹치지 않도록 1씩 증가)
- 중첩 컨테이너(card, stack, modal)는 `"components": []` 필드를 포함할 수 있다

### id 패턴 예시

```
card-1716700001
stack-1716700002
button-1716700003
tabs-1716700004
modal-1716700005
table-1716700006
```

### props 기본값

spec.json의 `default` 값을 사용한다. 명시적 지시가 없으면 기본값 적용.

---

## §4 i18n 규약

- 가시 문자열(label, header, title, description, triggerLabel 등)은 `designer.{ns}.{key}` 패턴 키만 사용
- 한국어·영어 직접 기재 금지
- 빈 문자열 `""` 허용 (값 없음을 의미)
- i18n 키 네임스페이스 예시:
  - `designer.components.card.header`
  - `designer.components.button.label`
  - `designer.table.col.name`

---

## §5 저장 전 자기검증 체크리스트

스키마를 Write 도구로 저장하기 **직전** 다음 항목을 확인한다. 하나라도 실패하면 수정 후 재저장.

1. `schemaVersion` === 19 확인
2. 모든 `type` 값이 §2 등록 type(card/stack/button/tabs/modal/table) 내에 있는지 확인
3. 가시 문자열 값이 `designer.*` 패턴 또는 `""` 인지 확인 (한국어/영어 직접 기재 없음)
4. 동일 스키마 내 `id` 중복 없음 확인
5. `design-add` 실행 시: 기존 schema의 id 목록과 신규 id 충돌 없음 확인

---

## §6 실행 흐름

```
입력 수신
  ↓
spec.json Read (해당 type별)
  ↓
JSON 조립 (§3 구조 + §4 i18n)
  ↓
§5 자기검증
  ↓
schemas/drafts/<name>.schema.json Write
  ↓
완료 보고
```

---

## §7 산출물 경로 및 파일명 규칙

- 경로: `schemas/drafts/`
- 파일명: `<kebab-case-page-name>.schema.json`
- 예: `login-page.schema.json`, `dashboard.schema.json`, `user-profile.schema.json`

---

## §8 참조 파일 목록

| 파일 | 용도 |
|------|------|
| `packages/designer-components/src/card/spec.json` | card props |
| `packages/designer-components/src/stack/spec.json` | stack props |
| `packages/designer-components/src/button/spec.json` | button props |
| `packages/designer-components/src/tabs/spec.json` | tabs props |
| `packages/designer-components/src/modal/spec.json` | modal props |
| `packages/designer-table/src/propsSchema.ts` | table props (TypeScript) |
