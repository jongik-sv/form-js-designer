# form-js 검증 문서


⏺ 설치 + 구 진단 로그 파일 비움. 이제 사용자 작업:

  1. VS Code 완전 종료 후 다시 실행 (Cmd+Q → 재실행, Reload Window 아님)
  2. form.md 열면 화면 우하단/우상단에 "[form-js DIAG] Form.js Designer activate 호출됨" 알림 팝업이 떠야 합니다
  3. 팝업이 보이면 → activate는 확실히 돌고 있는 것. 그 다음 프리뷰 열어 결과 확인
  4. 팝업이 안 보이면 → 확장 자체가 로드되지 않은 것 (계속 디버깅 필요)

  팝업 결과와, 프리뷰를 열었을 때 JSON 대신 실제 폼이 렌더되는지 알려주세요. 추가로 제 쪽에서도 파일
  로그(/tmp/form-js-designer-diag.log)로 activate 호출 흔적을 곧바로 확인할 수 있게 해두었습니다.
  
---
```form-js
{
  "components": [
    {
      "type": "tabs",
      "components": [
        {
          "components": [
            {
              "subtype": "date",
              "dateLabel": "Date",
              "type": "datetime",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "Field_19sg6bb",
              "key": "datetime_alt2k6"
            },
            {
              "label": "Text field",
              "type": "textfield",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "Field_0zumon9",
              "key": "textfield_gx0xf8"
            },
            {
              "label": "Text field",
              "type": "textfield",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "textfield-87aad26a",
              "key": "textfield_gx0xf8_copy"
            },
            {
              "label": "Button",
              "action": "submit",
              "type": "button",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "Field_0dc8z14"
            },
            {
              "label": "Button",
              "action": "submit",
              "type": "button",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "button-80b43183"
            },
            {
              "type": "table",
              "layout": {
                "row": "Row_1tu08i4",
                "columns": null
              },
              "label": "Table",
              "dataSource": "=Field_1vnrbns",
              "rowCount": 10,
              "id": "Field_1vnrbns",
              "columns": [
                {
                  "label": "ID",
                  "key": "id"
                },
                {
                  "label": "Name",
                  "key": "name"
                },
                {
                  "label": "Date",
                  "key": "date"
                }
              ]
            }
          ],
          "id": "tabPanel_83fe6de4-3e11-4cd2-b87a-7ac04c2d869c",
          "type": "tabPanel",
          "label": "Tab 1",
          "layout": {
            "row": "Row_14s9htc"
          }
        },
        {
          "components": [
            {
              "subtype": "date",
              "dateLabel": "Date",
              "type": "datetime",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "datetime-8bc05e71",
              "key": "datetime_alt2k6_copy"
            },
            {
              "label": "Text field",
              "type": "textfield",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "textfield-57a85ebc",
              "key": "textfield_gx0xf8_copy_2"
            },
            {
              "label": "Text field",
              "type": "textfield",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "textfield-1f138361",
              "key": "textfield_gx0xf8_copy_copy"
            },
            {
              "label": "Button",
              "action": "submit",
              "type": "button",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "button-0615b6a7"
            },
            {
              "label": "Button",
              "action": "submit",
              "type": "button",
              "layout": {
                "row": "Row_0mkqsgy",
                "columns": null
              },
              "id": "button-2d530f84"
            },
            {
              "type": "table",
              "layout": {
                "row": "Row_1tu08i4",
                "columns": null
              },
              "label": "Table",
              "dataSource": "=Field_1vnrbns",
              "rowCount": 10,
              "id": "table-eed9f390",
              "columns": [
                {
                  "label": "ID",
                  "key": "id"
                },
                {
                  "label": "Name",
                  "key": "name"
                },
                {
                  "label": "Date",
                  "key": "date"
                }
              ]
            },
            {
              "type": "card",
              "padding": "md",
              "elevation": 1,
              "components": [
                {
                  "label": "Checkbox group",
                  "values": [
                    {
                      "label": "Value",
                      "value": "value"
                    },
                    {
                      "label": "Value 2",
                      "value": "value2"
                    },
                    {
                      "label": "Value 3",
                      "value": "value3"
                    },
                    {
                      "label": "Value 4",
                      "value": "value4"
                    },
                    {
                      "label": "Value 5",
                      "value": "value5"
                    }
                  ],
                  "type": "checklist",
                  "layout": {
                    "row": "Row_1f3vuox",
                    "columns": null
                  },
                  "id": "Field_0qq1160",
                  "key": "checklist_0wjtu6"
                },
                {
                  "label": "Radio group",
                  "values": [
                    {
                      "label": "Value",
                      "value": "value"
                    },
                    {
                      "label": "Value 2",
                      "value": "value2"
                    },
                    {
                      "label": "Value 3",
                      "value": "value3"
                    },
                    {
                      "label": "Value 4",
                      "value": "value4"
                    },
                    {
                      "label": "Value 5",
                      "value": "value5"
                    }
                  ],
                  "type": "radio",
                  "layout": {
                    "row": "Row_1f3vuox",
                    "columns": null
                  },
                  "id": "Field_1k7uf9r",
                  "key": "radio_4bzf2"
                }
              ],
              "layout": {
                "row": "Row_07mjesz",
                "columns": null
              },
              "id": "Field_1a0wbm0"
            }
          ],
          "id": "tabPanel-2890f3df",
          "type": "tabPanel",
          "label": "Tab 1",
          "layout": {
            "row": "Row_0v4yrm3"
          }
        },
        {
          "components": [
            {
              "type": "table",
              "layout": {
                "row": "Row_1jzkxwm",
                "columns": null
              },
              "label": "Table",
              "dataSource": "=Field_0olb0ek",
              "rowCount": 10,
              "id": "Field_0olb0ek",
              "columns": [
                {
                  "label": "ID",
                  "key": "id"
                },
                {
                  "label": "Name",
                  "key": "name"
                },
                {
                  "label": "Date",
                  "key": "date"
                }
              ]
            },
            {
              "type": "table",
              "layout": {
                "row": "Row_16cxjh9",
                "columns": null
              },
              "label": "Table",
              "dataSource": "=Field_0ohpphd",
              "rowCount": 10,
              "id": "Field_0ohpphd",
              "columns": [
                {
                  "label": "ID",
                  "key": "id"
                },
                {
                  "label": "Name",
                  "key": "name"
                },
                {
                  "label": "Date",
                  "key": "date"
                }
              ]
            }
          ],
          "id": "tabPanel_46096571-dc11-4da6-902a-9a3046463c02",
          "type": "tabPanel",
          "label": "Tab 2",
          "layout": {
            "row": "Row_179bmf2",
            "height": 482.73046875
          }
        }
      ],
      "defaultValue": "tabPanel_83fe6de4-3e11-4cd2-b87a-7ac04c2d869c",
      "orientation": "horizontal",
      "layout": {
        "row": "Row_1wudf48",
        "columns": null,
        "height": 689.20703125
      },
      "id": "Field_161p48h"
    }
  ],
  "type": "default",
  "id": "Form_0xlefrh",
  "schemaVersion": 19
}

```