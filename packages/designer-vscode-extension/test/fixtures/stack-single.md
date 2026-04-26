# Stack 단일 블록 Fixture

TSK-05-03: Stack 렌더러 단일 블록 검증용 fixture.

```form-js
{
  "id": "stack-single-fixture",
  "components": [
    {
      "type": "stack",
      "id": "stack-001",
      "direction": "horizontal",
      "gap": 16,
      "wrap": false,
      "components": [
        { "type": "textfield", "id": "tf-101", "key": "first", "label": "이름" },
        { "type": "textfield", "id": "tf-102", "key": "last", "label": "성" }
      ]
    }
  ]
}
```
