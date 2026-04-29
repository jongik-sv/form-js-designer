# Tree Component Spike-B Fixture

Phase 0 stub 검증용 — 트리 컴포넌트가 VS Code 웹뷰(custom editor + markdown preview)에서 마운트되는지 확인.

```form-js
{
  "id": "tree-spike-form",
  "type": "default",
  "components": [
    {
      "id": "tree_perm",
      "type": "tree",
      "label": "권한 트리",
      "nodes": [
        {
          "id": "admin",
          "label": "관리자",
          "children": [
            { "id": "user_mgmt", "label": "사용자관리" },
            { "id": "sys_setting", "label": "시스템설정" }
          ]
        },
        {
          "id": "user",
          "label": "일반사용자",
          "children": [
            { "id": "view", "label": "조회" }
          ]
        }
      ]
    }
  ]
}
```
