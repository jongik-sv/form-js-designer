---
name: design-page
description: "자연어 화면 의도를 받아 새 페이지 전체 스키마를 생성한다. 산출물: schemas/drafts/<page-name>.schema.json"
---

# /design-page — 새 페이지 스키마 생성

이 command는 `.claude/skills/designer/SKILL.md`를 위임하여 실행한다.

## 입력 형식

```
/design-page <화면 의도>
```

예시:
```
/design-page 로그인 페이지, 이메일+비밀번호 입력+로그인 버튼
/design-page 대시보드, 상단 통계 카드 4개 + 하단 데이터 테이블
/design-page 사용자 프로필, tabs(기본정보/보안) 구조
```

## 처리 절차

1. **의도 파싱**: `<화면 의도>`에서 다음을 추출한다
   - 페이지 이름 → `schemas/drafts/<kebab-case>.schema.json` 파일명 결정
   - 컴포넌트 목록 및 계층 구조
   - 데이터 바인딩 힌트 (table의 경우 data 표현식)

2. **spec.json 참조**: 사용할 컴포넌트 type별로 `.claude/skills/designer/SKILL.md §2`에 따라 `spec.json`을 Read 도구로 읽는다

3. **JSON 조립**: `.claude/skills/designer/SKILL.md §3` 구조 규칙에 따라 전체 페이지 스키마를 조립한다
   - 최상위: `{ "schemaVersion": 19, "type": "default", "components": [...] }`
   - 레이아웃은 stack(방향 지정)으로 구성하고, 콘텐츠는 card로 감싼다
   - 버튼은 card 내부 또는 최상위에 배치 가능

4. **i18n 준수**: `.claude/skills/designer/SKILL.md §4`에 따라 가시 문자열은 `designer.*` 키 또는 `""` 사용

5. **자기검증**: `.claude/skills/designer/SKILL.md §5` 체크리스트 수행

6. **파일 저장**: `schemas/drafts/<page-name>.schema.json` Write 도구로 저장

7. **완료 보고**: 생성된 파일 경로와 컴포넌트 구성 요약 출력

## 출력 예시

```
생성 완료: schemas/drafts/login-page.schema.json
구성: stack > card > [button(로그인)]
검증: schemaVersion=19 ✓, i18n ✓, 중복 id 없음 ✓
```

## 주의사항

- 화면 의도에 컴포넌트가 명시되지 않으면 기본 구성(stack + card)으로 생성한다
- 파일이 이미 존재하면 덮어쓰기 전 사용자에게 확인한다
- table 컴포넌트 사용 시 `columns` 배열에 ColumnDef 구조를 포함한다
