# Tree component (Phase 1B) — VS Code preview test

## Case 1: nested with custom labelKey/childrenKey

```form-js
{
  "components": [
    {
      "type": "tree",
      "label": "조직도",
      "dataSource": "=[{\"name\":\"대표이사\",\"kids\":[{\"name\":\"기획팀\"},{\"name\":\"기술팀\",\"kids\":[{\"name\":\"백엔드\"},{\"name\":\"프론트엔드\"}]}]},{\"name\":\"감사위\"}]",
      "id": "tree1",
      "labelKey": "name",
      "childrenKey": "kids",
      "expandedByDefault": true,
      "showGuides": true,
      "layout": {
        "row": "Row_0l38xdt",
        "columns": 3
      }
    },
    {
      "type": "tabs",
      "components": [
        {
          "components": [
            {
              "type": "table",
              "layout": {
                "row": "Row_1bgqzlb",
                "columns": null
              },
              "label": "Table",
              "dataSource": "=Field_1hp1psp",
              "rowCount": 10,
              "id": "Field_1hp1psp",
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
                "row": "Row_0jns675",
                "columns": null
              },
              "label": "Table",
              "dataSource": "=Field_1ifkrf6",
              "rowCount": 10,
              "id": "Field_1ifkrf6",
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
          "id": "tabPanel_e188cd4b-5d23-42c1-9f61-fcb0f3dc1f2b",
          "type": "tabPanel",
          "label": "Tab 1",
          "layout": {
            "row": "Row_1eer8vw"
          }
        },
        {
          "components": [],
          "id": "tabPanel_b4b4d268-4363-444b-bd28-3e356d8f1282",
          "type": "tabPanel",
          "label": "Tab 2",
          "layout": {
            "row": "Row_0n0lgzk"
          }
        }
      ],
      "defaultValue": "tabPanel_e188cd4b-5d23-42c1-9f61-fcb0f3dc1f2b",
      "orientation": "horizontal",
      "layout": {
        "row": "Row_0l38xdt",
        "columns": null
      },
      "id": "Field_183c5o4"
    },
    {
      "label": "File picker",
      "type": "filepicker",
      "layout": {
        "row": "Row_18uzgkc",
        "columns": null
      },
      "id": "Field_0pfs9kb",
      "key": "filepicker_sgcxzo",
      "multiple": true
    },
    {
      "label": "Text field",
      "type": "textfield",
      "layout": {
        "row": "Row_0xcb0ab",
        "columns": null
      },
      "id": "Field_0l67p61",
      "key": "textfield_e8s86r",
      "defaultValue": "홍길동"
    },
    {
      "type": "card",
      "padding": "md",
      "elevation": 1,
      "components": [],
      "layout": {
        "row": "Row_1sttd4e",
        "columns": null
      },
      "id": "Field_0xxhqay"
    }
  ],
  "type": "default",
  "id": "Tree_test_1",
  "schemaVersion": 19
}
```

## Case 2: empty dataSource → "Nothing to show."

```form-js
{
  "components": [
    {
      "type": "tree",
      "label": "빈 트리",
      "id": "tree2",
      "dataSource": "=[]"
    }
  ],
  "type": "default",
  "id": "Tree_test_2",
  "schemaVersion": 19
}
```

## Case 3: collapsed by default + standard label/children keys

```form-js
{
  "components": [
    {
      "type": "tree",
      "label": "접힘 기본",
      "id": "tree3",
      "dataSource": "=[{\"label\":\"부모\",\"children\":[{\"label\":\"자식1\"},{\"label\":\"자식2\"}]}]",
      "expandedByDefault": false
    }
  ],
  "type": "default",
  "id": "Tree_test_3",
  "schemaVersion": 19
}
```
