# Tabs 3-Panel Fixture

TSK-05-02: 탭 3개 × 각 패널 필드 2개 픽스처.
E2E 기준 파일 — VSCode Markdown 미리보기에서 `.fj-tabs` 컴포넌트 렌더를 검증한다.

## 케이스 A: activeTab 없음 (첫 번째 탭 기본 활성)

```form-js
{
  "id": "tabs-fixture-a",
  "schemaVersion": 19,
  "components": [
    {
      "type": "tabs",
      "id": "tabs-a",
      "components": [
        {
          "type": "tabPanel",
          "id": "panel-a1",
          "label": "개인 정보",
          "components": [
            { "type": "textfield", "id": "f-name", "key": "name", "label": "이름" },
            { "type": "textfield", "id": "f-email", "key": "email", "label": "이메일" }
          ]
        },
        {
          "type": "tabPanel",
          "id": "panel-a2",
          "label": "주소",
          "components": [
            { "type": "textfield", "id": "f-city", "key": "city", "label": "도시" },
            { "type": "textfield", "id": "f-street", "key": "street", "label": "도로명" }
          ]
        },
        {
          "type": "tabPanel",
          "id": "panel-a3",
          "label": "기타",
          "components": [
            { "type": "textarea", "id": "f-note", "key": "note", "label": "메모" },
            { "type": "checkbox", "id": "f-agree", "key": "agree", "label": "동의" }
          ]
        }
      ]
    }
  ]
}
```

## 케이스 B: activeTab 지정 (두 번째 탭 초기 활성)

```form-js
{
  "id": "tabs-fixture-b",
  "schemaVersion": 19,
  "components": [
    {
      "type": "tabs",
      "id": "tabs-b",
      "activeTab": "panel-b2",
      "components": [
        {
          "type": "tabPanel",
          "id": "panel-b1",
          "label": "탭 1",
          "components": [
            { "type": "textfield", "id": "f-b1a", "key": "field1a", "label": "필드 1-A" },
            { "type": "number", "id": "f-b1b", "key": "field1b", "label": "필드 1-B" }
          ]
        },
        {
          "type": "tabPanel",
          "id": "panel-b2",
          "label": "탭 2 (초기 활성)",
          "components": [
            { "type": "textfield", "id": "f-b2a", "key": "field2a", "label": "필드 2-A" },
            { "type": "textfield", "id": "f-b2b", "key": "field2b", "label": "필드 2-B" }
          ]
        },
        {
          "type": "tabPanel",
          "id": "panel-b3",
          "label": "탭 3",
          "components": [
            { "type": "textfield", "id": "f-b3a", "key": "field3a", "label": "필드 3-A" },
            { "type": "select", "id": "f-b3b", "key": "field3b", "label": "필드 3-B", "values": [{"label": "옵션 1", "value": "opt1"}, {"label": "옵션 2", "value": "opt2"}] }
          ]
        }
      ]
    }
  ]
}
```
