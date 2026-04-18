---
name: design-validate
description: "스키마 파일의 유효성을 검증한다. designer-cli validate 호출 및 결과 보고."
---

# /design-validate — 스키마 파일 유효성 검증

## 입력 형식

```
/design-validate <파일 경로>
```

예시:
```
/design-validate schemas/drafts/login-page.schema.json
/design-validate schemas/drafts/dashboard.schema.json
```

## 처리 절차

1. **파일 존재 확인**: `<파일 경로>`의 파일이 존재하는지 확인한다
   - 없으면: `[오류] 파일을 찾을 수 없습니다: <파일 경로>`

2. **designer-cli validate 실행**: Bash 도구로 다음 명령을 실행한다
   ```bash
   node --input-type=module <<'EOF'
   import { validate } from './packages/designer-cli/src/commands/validate.js';
   import { readFileSync } from 'node:fs';
   const schema = JSON.parse(readFileSync('<파일 경로>', 'utf-8'));
   const result = validate({ schema });
   console.log(JSON.stringify(result));
   EOF
   ```
   
   또는 vitest 환경에서 직접 import하여 검증할 수 있다:
   ```bash
   npm --prefix packages/designer-cli run test:skill
   ```

3. **결과 해석 및 보고**:
   - `result.ok === true` → "유효합니다" 보고 + exit 0
   - `result.ok === false` → 오류 목록 출력 + exit 1

## 출력 예시

### 유효한 경우
```
[validate] 유효합니다.
파일: schemas/drafts/login-page.schema.json
schemaVersion: 19 ✓
컴포넌트 수: 3
```

### 오류가 있는 경우
```
[validate] 오류 발견 (2건):
파일: schemas/drafts/bad-schema.schema.json

오류 목록:
  1. [UNKNOWN_COMPONENT_TYPE] components[id=unknown-1234]: Component type "nonexistent-component" is not registered in the component registry.
  2. [MISSING_TYPE] components[1]: Component is missing a "type" field.

수정 후 /design-validate를 다시 실행하세요.
```

## 검증 범위

| 검증 항목 | 코드 | 설명 |
|-----------|------|------|
| schemaVersion | `INVALID_SCHEMA_VERSION` | schemaVersion !== 19 |
| type 미등록 | `UNKNOWN_COMPONENT_TYPE` | 레지스트리에 없는 type |
| components 누락 | `MISSING_COMPONENTS` | components 배열 없음 |
| type 필드 누락 | `MISSING_TYPE` | 컴포넌트에 type 없음 |
| props 타입 불일치 | `INVALID_FIELD_PROPS` | 경고 (warning) 수준 |

## 주의사항

- 이 command는 schema를 수정하지 않는다 — 읽기 전용
- 오류 발견 시 수정 방법 힌트를 함께 제공한다
- `/design-modify` 또는 직접 편집 후 재실행을 권장한다
