# locales — 사전 편집 규칙

## 네임스페이스 규칙

| 네임스페이스 | 패키지 |
|---|---|
| `designer.core.*` | designer-core |
| `designer.components.{card,stack,tabs,modal,button}.*` | designer-components |
| `designer.table.*` | designer-table |
| `designer.editor.*` | designer-editor-host |
| `designer.i18n.validation.*` | designer-i18n (form-js 기본 메시지) |
| `formjs.validation.*` | form-js 기본 유효성 검사 메시지 |
| `designer.cli.*` | designer-cli (WP-08 예약) |

## 키 추가 규칙

1. 새 키는 반드시 점(`.`) 구분자를 사용한다. 하이픈(`-`)은 네임스페이스 구분에 사용하지 않는다.
2. 코드에서 `t('designer.xxx.yyy')` 형태로 사용하고, 이 파일에 동일 키를 추가한다.
3. 키를 추가한 뒤 로컬에서 `npm --prefix packages/designer-i18n run i18n:check`를 실행하여 green 확인.

## 키 삭제 규칙

삭제 전 반드시 사용처를 grep으로 확인한다:

```bash
grep -rn "t('삭제할.키'" packages/designer-*/src/ --include='*.ts' --include='*.tsx'
```

사용처가 있으면 코드도 함께 제거한다.

## Rename 금지

네임스페이스를 rename하면 모든 사용처와 테스트를 동시에 변경해야 한다.
rename이 필요하면 PR 단위로 sweep 수정하고, CI `i18n-check` 잡으로 회귀를 방지한다.

## 형식

현재 ko.json은 플랫(flat) 구조를 사용한다. 키는 `"a.b.c": "번역"` 형태.
중첩 JSON(`{"a": {"b": {"c": "번역"}}}`)도 `flatten()` 함수가 처리하므로 허용하지만,
일관성을 위해 플랫 형식을 권장한다.
