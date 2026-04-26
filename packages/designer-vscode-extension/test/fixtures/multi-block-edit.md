# TSK-02-05 single-editor lock 테스트 — 다중 블록

같은 문서에 form-js 펜스 블록이 2개 포함된 fixture.
케이스 3: 첫 번째 블록 편집 중 두 번째 블록 편집 요청 시 lock 거절 검증용.

## 블록 1

```form-js
{
  "type": "default",
  "id": "multi-edit-block-1",
  "components": [
    {
      "type": "textfield",
      "key": "firstName",
      "label": "이름"
    }
  ]
}
```

## 블록 2

```form-js
{
  "type": "default",
  "id": "multi-edit-block-2",
  "components": [
    {
      "type": "textfield",
      "key": "email",
      "label": "이메일"
    }
  ]
}
```

펜스 본문 외 이 줄은 저장 후에도 변경되지 않아야 한다.
