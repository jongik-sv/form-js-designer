# TSK-02-04 저장 테스트 — CRLF 라인엔딩

아래 form-js 블록에서 CRLF 라인엔딩 보존을 검증한다.

```form-js
{
  "type": "default",
  "id": "save-test-crlf",
  "components": [
    {
      "type": "textfield",
      "key": "phone",
      "label": "전화번호"
    }
  ]
}
```

펜스 본문 외 이 줄은 저장 후에도 CRLF 라인엔딩이 유지되어야 한다.
