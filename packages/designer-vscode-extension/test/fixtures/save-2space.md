# TSK-02-04 저장 테스트 — 2-space 들여쓰기

아래 form-js 블록에서 저장 기능을 검증한다.

```form-js
{
  "type": "default",
  "id": "save-test-2space",
  "components": [
    {
      "type": "textfield",
      "key": "name",
      "label": "이름"
    }
  ]
}
```

펜스 본문 외 이 줄은 저장 후에도 변경되지 않아야 한다.
