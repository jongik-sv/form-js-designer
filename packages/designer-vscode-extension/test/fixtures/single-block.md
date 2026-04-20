# Form JS Preview Test

아래는 form-js 스키마 블록입니다:

```form-js
{
  "id": "test-form",
  "components": [
    { "type": "textfield", "key": "name", "label": "이름" },
    { "type": "textfield", "key": "email", "label": "이메일" },
    { "type": "number", "key": "age", "label": "나이" },
    { "type": "select", "key": "country", "label": "국가", "values": [{"label": "한국", "value": "KR"}, {"label": "미국", "value": "US"}] },
    { "type": "textarea", "key": "message", "label": "메시지" },
    { "type": "checkbox", "key": "agree", "label": "동의" },
    { "type": "textfield", "key": "company", "label": "회사" },
    { "type": "textfield", "key": "phone", "label": "전화번호" },
    { "type": "textfield", "key": "address", "label": "주소" },
    { "type": "textfield", "key": "city", "label": "도시" }
  ]
}
```
