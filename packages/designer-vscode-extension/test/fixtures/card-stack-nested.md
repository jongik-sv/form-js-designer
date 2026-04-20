# Card + Stack Nested Fixture

TSK-05-04: fixture 2 — card+stack 중첩 스키마.
E2E 기준 파일: `.fjs-card` 내부에 `.fjs-stack` 존재 검증.

```form-js
{
  "id": "card-stack-nested-fixture",
  "schemaVersion": 19,
  "components": [
    {
      "type": "card",
      "id": "card-n01",
      "label": "중첩 카드",
      "components": [
        {
          "type": "stack",
          "id": "stack-n01",
          "direction": "horizontal",
          "gap": 12,
          "wrap": false,
          "components": [
            { "type": "textfield", "id": "f-n01", "key": "first", "label": "이름" },
            { "type": "textfield", "id": "f-n02", "key": "last", "label": "성" }
          ]
        },
        {
          "type": "stack",
          "id": "stack-n02",
          "direction": "vertical",
          "gap": 8,
          "components": [
            { "type": "textarea", "id": "f-n03", "key": "note", "label": "메모" }
          ]
        }
      ],
      "actions": [
        { "label": "저장", "variant": "primary" }
      ]
    }
  ]
}
```
