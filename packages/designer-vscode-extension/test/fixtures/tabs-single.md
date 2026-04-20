# Tabs Single Fixture

TSK-05-04: fixture 1 — tabs 단독 스키마.
E2E 기준 파일: `.fj-tabs` 요소 렌더 + 탭 전환 검증.

```form-js
{
  "id": "tabs-single-fixture",
  "schemaVersion": 19,
  "components": [
    {
      "type": "tabs",
      "id": "tabs-s01",
      "components": [
        {
          "type": "tabPanel",
          "id": "panel-s01",
          "label": "기본 정보",
          "components": [
            { "type": "textfield", "id": "f-s01", "key": "name", "label": "이름" },
            { "type": "textfield", "id": "f-s02", "key": "email", "label": "이메일" }
          ]
        },
        {
          "type": "tabPanel",
          "id": "panel-s02",
          "label": "추가 정보",
          "components": [
            { "type": "textarea", "id": "f-s03", "key": "note", "label": "메모" }
          ]
        }
      ]
    }
  ]
}
```
