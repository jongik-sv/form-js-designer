# Mixed Layout Fixture

TSK-05-03: Tabs × Card × Stack × Modal 혼합 스키마 회귀 검증용 fixture.

```form-js
{
  "id": "mixed-layout-fixture",
  "components": [
    {
      "type": "card",
      "id": "card-m01",
      "label": "카드 섹션",
      "components": [
        {
          "type": "stack",
          "id": "stack-m01",
          "direction": "horizontal",
          "gap": 12,
          "wrap": false,
          "components": [
            { "type": "textfield", "id": "tf-m01", "key": "first", "label": "이름" },
            { "type": "textfield", "id": "tf-m02", "key": "last", "label": "성" }
          ]
        }
      ],
      "actions": [
        { "label": "저장", "variant": "primary" }
      ]
    },
    {
      "type": "modal",
      "id": "modal-m01",
      "trigger": { "label": "상세 보기", "variant": "default" },
      "components": [
        { "type": "textfield", "id": "tf-m03", "key": "detail", "label": "상세 내용" }
      ]
    },
    {
      "type": "row",
      "id": "row-m01",
      "components": [
        {
          "columns": [
            {
              "components": [
                { "type": "textfield", "id": "tf-m04", "key": "col1", "label": "컬럼1" }
              ]
            },
            {
              "components": [
                { "type": "textfield", "id": "tf-m05", "key": "col2", "label": "컬럼2" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```
