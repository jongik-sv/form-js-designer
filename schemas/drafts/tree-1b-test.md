# Tree component (Phase 1B) — VS Code preview test

## Case 1: nested with custom labelKey/childrenKey

```form-js
{
  "components": [
    {
      "type": "tree",
      "label": "조직도",
      "dataSource": "=[{\"name\":\"대표이사\",\"kids\":[{\"name\":\"기획팀\"},{\"name\":\"기술팀\",\"kids\":[{\"name\":\"백엔드\"},{\"name\":\"프론트엔드\"}]}]},{\"name\":\"감사위\"}]",
      "expandedByDefault": true,
      "id": "tree1",
      "labelKey": "name",
      "childrenKey": "kids",
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
      "multiple": true,
      "accept": "*.md"
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
      "type": "tree",
      "label": "트리",
      "dataSource": "=[{\"label\":\"부모\",\"children\":[{\"label\":\"자식1\"},{\"label\":\"자식2\"}]}]",
      "expandedByDefault": true,
      "layout": {
        "row": "Row_1sttd4e",
        "columns": 2,
        "height": 130.21875
      },
      "id": "Field_0dxg3cm",
      "showGuides": true
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
      "dataSource": "=[]",
      "expandedByDefault": false,
      "id": "tree2",
      "layout": {
        "row": "Row_1h7fffl"
      }
    },
    {
      "label": "Text field",
      "type": "textfield",
      "layout": {
        "row": "Row_04a9wdn",
        "columns": null
      },
      "id": "Field_0u2weh0",
      "key": "textfield_2j6rsw"
    },
    {
      "label": "Text field",
      "type": "textfield",
      "layout": {
        "row": "Row_04a9wdn",
        "columns": null
      },
      "id": "textfield-5da6ffc1",
      "key": "textfield_b1bc17"
    },
    {
      "label": "Text field",
      "type": "textfield",
      "layout": {
        "row": "Row_04a9wdn",
        "columns": null
      },
      "id": "textfield-510640b6",
      "key": "textfield_79bb6c"
    },
    {
      "label": "Text field",
      "type": "textfield",
      "layout": {
        "row": "Row_04a9wdn",
        "columns": null
      },
      "id": "textfield-b6699e61",
      "key": "textfield_c36bc4"
    },
    {
      "label": "Text field",
      "type": "textfield",
      "layout": {
        "columns": null,
        "row": "Row_02hli4o"
      },
      "id": "textfield-16672bf6",
      "key": "textfield_56582f"
    },
    {
      "label": "Text field",
      "type": "textfield",
      "layout": {
        "columns": null,
        "row": "Row_06k3wp2"
      },
      "id": "textfield-d3f8f80b",
      "key": "textfield_ac9bd0"
    },
    {
      "type": "table",
      "layout": {
        "row": "Row_1abe5ns",
        "columns": null
      },
      "label": "Table",
      "rowCount": 10,
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
      ],
      "id": "Field_0824i9t",
      "dataSource": "=Field_0824i9t"
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
      "dataSource": "=[{\"label\":\"부모\",\"children\":[{\"label\":\"자식1\"},{\"label\":\"자식2\"}]}]",
      "expandedByDefault": false,
      "id": "tree3",
      "layout": {
        "row": "Row_0f3057x"
      }
    },
    {
      "text": "# Text",
      "type": "text",
      "layout": {
        "row": "Row_13fb5bs",
        "columns": null
      },
      "id": "Field_1aybt6x"
    },
    {
      "label": "Radio group",
      "values": [
        {
          "label": "Value",
          "value": "value"
        }
      ],
      "type": "radio",
      "layout": {
        "row": "Row_0f9lysf",
        "columns": null
      },
      "id": "Field_0ntguwe",
      "key": "radio_j4ty3d",
      "validate": {
        "required": false
      }
    },
    {
      "label": "Checkbox group",
      "values": [
        {
          "label": "Value",
          "value": "value"
        }
      ],
      "type": "checklist",
      "layout": {
        "row": "Row_0f9lysf",
        "columns": null
      },
      "id": "Field_1sbktgr",
      "key": "checklist_7yfcl8"
    },
    {
      "label": "Select",
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
        }
      ],
      "type": "select",
      "layout": {
        "row": "Row_1uutx12",
        "columns": null
      },
      "id": "Field_0or9nnd",
      "key": "select_g22x29"
    },
    {
      "label": "Tag list",
      "values": [
        {
          "label": "Value",
          "value": "value"
        }
      ],
      "type": "taglist",
      "layout": {
        "row": "Row_1uutx12",
        "columns": null
      },
      "id": "Field_1g5542j",
      "key": "taglist_kjfl1h"
    },
    {
      "type": "image",
      "layout": {
        "row": "Row_1kaogwj",
        "columns": null
      },
      "id": "Field_1cgf91w",
      "source": "https://cdn.vivoldi.com/www/image/picture/tools/pic.tools.website-image-extractor.webp?v=202604176"
    },
    {
      "type": "table",
      "layout": {
        "row": "Row_0p4k98i",
        "columns": null
      },
      "label": "Table",
      "rowCount": 10,
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
      ],
      "id": "Field_1l315bp",
      "dataSource": "=Field_1l315bp"
    },
    {
      "type": "chartPlaceholder",
      "chartType": "bar",
      "title": "",
      "description": "",
      "layout": {
        "row": "Row_0zw3etj",
        "columns": 8
      },
      "id": "Field_07fwbwz"
    }
  ],
  "type": "default",
  "id": "Tree_test_3",
  "schemaVersion": 19
}
```
