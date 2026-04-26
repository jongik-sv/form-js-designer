---
name: design-modify
description: "기존 스키마의 특정 컴포넌트를 수정한다. 대상 id 외 컴포넌트/필드는 변경하지 않는다."
---

# /design-modify — 기존 스키마 컴포넌트 수정

이 command는 `.claude/skills/form-designer/SKILL.md`를 위임하여 실행한다.

## 입력 형식

```
/design-modify <파일 경로> <대상 id> <변경 지시>
```

예시:
```
/design-modify schemas/drafts/login-page.form-js card-1 padding lg로 변경
/design-modify schemas/drafts/dashboard.form-js card-2 layout.columns 8로 변경
/design-modify schemas/drafts/main.form-js tabs-1 orientation vertical로 변경
```

## 처리 절차

1. **기존 schema 읽기**: `<파일 경로>`를 Read 도구로 읽는다
   - 파일이 없으면 오류 보고 후 중단

2. **대상 컴포넌트 탐색**: `components` 배열을 재귀적으로 순회(tabs 내부 포함)하여 `id === <대상 id>` 컴포넌트를 찾는다
   - 찾지 못하면 오류 보고 후 중단: `[오류] id "<대상 id>" 컴포넌트를 찾을 수 없습니다.`

3. **spec.json 참조**: 대상 컴포넌트의 type에 맞는 spec.json/propsSchema를 Read 도구로 읽어 변경 가능한 props와 유효 값을 확인한다 (`.claude/skills/form-designer/SKILL.md §2`)

4. **변경 적용**: `<변경 지시>`에 따라 대상 컴포넌트의 props/layout만 수정한다
   - **불변 보장**: 대상 id 컴포넌트 외의 모든 컴포넌트와 필드는 변경하지 않는다
   - **불변 보장**: `type`, `id` 필드는 변경하지 않는다
   - layout(row/columns/height) 변경은 `.claude/skills/form-designer/SKILL.md §3.5` 규칙에 따른다
   - i18n 준수 (§4): 가시 문자열 직접 기재 금지

5. **자기검증**: `.claude/skills/form-designer/SKILL.md §5` 체크리스트 수행 (layout 변경 시 §5-6: row 내 columns 합 ≤ 16 재확인)

6. **파일 저장**: 동일 파일 경로에 Write 도구로 저장 (전체 JSON 재작성)

7. **실측 검증**: `.claude/skills/form-designer/SKILL.md §6` 또는 `/design-validate` 호출

8. **완료 보고**: 수정된 컴포넌트 id, 변경 전/후 값, 불변 컴포넌트 수, validate 결과 출력

## 출력 예시

```
수정 완료: schemas/drafts/login-page.form-js
대상: card-1 (type: card)
변경: padding "md" → "lg"
불변 컴포넌트: 2개 (id: card-2, modal-1)
자기검증: schemaVersion=19 ✓, i18n ✓, columns 합 ✓
실측검증: designer-cli validate → ok ✓
```

## 주의사항

- `type`과 `id`는 절대 변경하지 않는다
- 변경 지시에 없는 props는 그대로 유지한다
- spec.json/propsSchema에 없는 prop 이름으로 변경 요청 시 오류 보고: `[오류] type "<type>"에 "<propName>" prop이 없습니다.`
- enum 타입 prop의 경우 spec.json의 허용 값 목록 내에서만 변경한다
- `layout.columns` 변경 시 같은 row의 다른 컴포넌트와 합쳐 16 초과면 거절·재제안
