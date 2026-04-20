# Modal Trigger Fixture

TSK-05-04: fixture 3 — modal trigger+open 스키마.
E2E 기준 파일: trigger 버튼 클릭 → dialog[open] 출현 → Esc 닫기 검증.

```form-js
{
  "id": "modal-trigger-fixture",
  "schemaVersion": 19,
  "components": [
    {
      "type": "modal",
      "id": "modal-t01",
      "trigger": { "label": "상세 보기", "variant": "primary" },
      "components": [
        { "type": "textfield", "id": "f-t01", "key": "detail", "label": "상세 내용" },
        { "type": "textarea", "id": "f-t02", "key": "comment", "label": "코멘트" }
      ]
    }
  ]
}
```
