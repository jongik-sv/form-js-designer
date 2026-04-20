# TSK-02-04 저장 테스트 — 4-space 들여쓰기

아래 form-js 블록에서 4-space 들여쓰기 보존을 검증한다.

```form-js
{
    "type": "default",
    "id": "save-test-4space",
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
