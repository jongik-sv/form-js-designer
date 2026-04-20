# Card 단일 블록 Fixture

TSK-05-03: Card 렌더러 단일 블록 검증용 fixture.

```form-js
{
  "id": "card-single-fixture",
  "components": [
    {
      "type": "card",
      "id": "card-001",
      "label": "카드 제목",
      "components": [
        { "type": "textfield", "id": "tf-001", "key": "name", "label": "이름" }
      ],
      "actions": [
        { "label": "확인", "variant": "primary" },
        { "label": "취소", "variant": "default" }
      ]
    }
  ]
}
```
