---
name: design-add
description: "기존 스키마 파일에 컴포넌트를 추가한다. 중복 id 방지 로직 포함."
---

# /design-add — 기존 스키마에 컴포넌트 추가

이 command는 `.claude/skills/form-designer/SKILL.md`를 위임하여 실행한다.

## 입력 형식

```
/design-add <파일 경로> <컴포넌트 지시>
```

예시:
```
/design-add schemas/drafts/login-page.form-js card 추가 (헤더: designer.welcome.card.header)
/design-add schemas/drafts/dashboard.form-js card 추가 (row: row-2, columns: 8)
/design-add schemas/drafts/main.form-js modal 추가 (size: lg)
```

## 처리 절차

1. **기존 schema 읽기**: `<파일 경로>`를 Read 도구로 읽는다
   - 파일이 없으면 오류 보고 후 중단

2. **기존 id 목록 추출**: `components` 배열을 재귀적으로 순회하여 모든 `id` 값을 Set으로 수집한다 (tabs 내 `tabs[]`·`components[]`, tabPanel 내 `components[]`까지 포함)
   ```
   existingIds = new Set(모든 컴포넌트의 id)
   ```

3. **spec.json 참조**: 추가할 컴포넌트 type의 spec.json/propsSchema를 Read 도구로 읽는다 (`.claude/skills/form-designer/SKILL.md §2`)
   - 등록 type은 `card` / `modal` / `tabs` / `tabPanel` 4개뿐 — 그 외 type 요청은 §2 정책에 따라 거절/대체 후 보고

4. **신규 컴포넌트 조립**: `.claude/skills/form-designer/SKILL.md §3` + `§3.5` 규칙에 따라 조립한다
   - **id 생성**: `<type>-<n>` 패턴, 같은 type의 가장 큰 `n` + 1로 시작. 충돌 시 다음 정수로 증분
   - **컨테이너는 `components: []` 필수**
   - 가로 배치 지시가 있으면 `layout.row` / `layout.columns` 부여
   - i18n 준수 (§4)

5. **merge**: 기존 schema의 `components` 배열 끝에 신규 컴포넌트를 추가한다
   - 중첩 배치 지시(예: "card-1 안에")가 있으면 대상 id의 `components` 배열에 추가한다

6. **자기검증**: `.claude/skills/form-designer/SKILL.md §5` 체크리스트 수행 (특히 항목 5: id 충돌 재확인, 항목 6: row 내 columns 합 ≤ 16)

7. **파일 저장**: 동일 파일 경로에 Write 도구로 저장 (전체 JSON 재작성)

8. **실측 검증**: `.claude/skills/form-designer/SKILL.md §6` 또는 `/design-validate` 호출

9. **완료 보고**: 추가된 컴포넌트 id, 최종 컴포넌트 수, validate 결과 출력

## 출력 예시

```
추가 완료: schemas/drafts/login-page.form-js
추가된 컴포넌트: card-2 (type: card, layout: row=row-2, columns=8)
전체 컴포넌트 수: 3 → 4
자기검증: 중복 id 없음 ✓, columns 합 ✓
실측검증: designer-cli validate → ok ✓
```

## 주의사항

- `existingIds` 확인 없이 임의 id를 사용하지 않는다
- 추가 위치(최상위 vs 중첩) 지시가 불명확하면 최상위 `components` 배열에 추가한다
- 기존 컴포넌트/필드는 변경하지 않는다
- 미구현 type 요청은 §2 정책에 따라 처리하고 사용자에게 명시 보고
