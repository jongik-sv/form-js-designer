# perf-10field — 렌더 측정용 fixture

10개 `textfield` 필드를 가진 스키마. `perf-gate.mjs`가 이 스키마를 기반으로
Playwright 렌더 타임을 측정한다 (TSK-04-03).

```form-js
{
  "type": "default",
  "components": [
    { "type": "textfield", "key": "field1", "label": "Field 1" },
    { "type": "textfield", "key": "field2", "label": "Field 2" },
    { "type": "textfield", "key": "field3", "label": "Field 3" },
    { "type": "textfield", "key": "field4", "label": "Field 4" },
    { "type": "textfield", "key": "field5", "label": "Field 5" },
    { "type": "textfield", "key": "field6", "label": "Field 6" },
    { "type": "textfield", "key": "field7", "label": "Field 7" },
    { "type": "textfield", "key": "field8", "label": "Field 8" },
    { "type": "textfield", "key": "field9", "label": "Field 9" },
    { "type": "textfield", "key": "field10", "label": "Field 10" }
  ]
}
```
