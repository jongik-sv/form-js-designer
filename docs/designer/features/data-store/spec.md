# Feature: data-store

## 요구사항

form 스키마의 **최상위 속성** `dataStores`를 **엔트리 배열** 형태로 도입하여, form-js `select`/`checklist` 등의 `valuesKey`가 참조할 수 있는 외부 데이터를 JSON에 담아둔다. 부팅 파이프라인(`bootWithSchema`)이 `dataStores`를 해석/머지하여 `ViewerHost`의 `data` prop으로 전달하고, 그 결과 `form.importSchema(schema, data)` 호출 시 `data[key]`에서 옵션 배열을 찾을 수 있게 된다.

**스키마 형태 (Phase 1 · static 전용)**:

```json
{
  "type": "default",
  "components": [
    { "type": "select", "key": "country", "valuesKey": "countryOptions" }
  ],
  "dataStores": [
    {
      "key": "countryOptions",
      "source": "static",
      "data": [
        { "label": "대한민국", "value": "KR" },
        { "label": "일본", "value": "JP" }
      ]
    }
  ]
}
```

**동작 계약**:

1. `bootWithSchema(opts)`가 스키마 로드 직후 `dataStores`를 해석하여 `{ [key]: data }` 딕셔너리로 머지한 `storeData`를 반환한다 (`BootResult.storeData`).
2. `bootWithSchema`는 form-js에 넘기기 전 단계의 메타이므로 스키마 객체 자체는 변경하지 않는다 (디자이너 round-trip 보존). 대신 `ViewerHost`가 수신한 `data` prop과 `storeData`를 머지하여 `form.importSchema(schema, merged)`에 전달한다.
3. **충돌 규칙**: 런타임 `data` prop이 `dataStores.key`보다 우선한다 (사용자 입력/호출자 주입이 항상 승리).
4. `designer-cli validate`가 `dataStores` 구조와 `key` 유일성·form 필드 `key`와의 충돌을 검증한다.

**비고·Phase 경계**:
- Phase 1은 **`source: "static"`만** 구현. `url` / `expression` 소스는 후속 WBS로 분리.
- `dataStores` 필드 자체는 **선택(optional)** — 없는 스키마는 기존 동작 그대로.

## 배경 / 맥락

form-js `select` 컴포넌트의 옵션을 동적으로 주입하려면 `valuesKey` 또는 `valuesExpression` 중 하나를 쓰고, 실제 옵션 데이터는 `form.importSchema(schema, data)`의 `data`에 키로 포함시켜야 한다 (`form-js-viewer/index.es.js:963` — `initialData[optionsKey]` 참조). 현재 디자이너는 `data` 주입 경로만 있고, 옵션 데이터를 스키마와 함께 보관할 자리가 없다. 스키마 파일 하나로 round-trip 가능하게 하려면 메타 필드가 필요하다.

**선행 판단 (사용자와 확정)**:
- 데이터 스토어는 form-js 컴포넌트로 등록하지 않는다 (단일 렌더 파이프라인 / ADR-0001 유지).
- dict 형태 대신 **엔트리 배열**로 시작해 `source` 필드로 static/url/expression 확장 가능하게 둔다.

## 도메인

frontend

## 진입점 (Entry Points)

> 이 Feature는 비-UI 런타임 계층(스키마 + 부팅 + Viewer 연결)이므로 사용자 클릭 경로는 없다. 수정할 파일 진입점은 아래와 같다.

- 사용자 진입 경로: N/A (런타임 내부 동작)
- URL / 라우트: N/A
- 수정 파일 후보:
  - `packages/designer-runtime/src/boot/bootTypes.ts` — `BootResult.storeData` 필드 추가
  - `packages/designer-runtime/src/boot/bootWithSchema.ts` — `dataStores` 해석/머지 로직
  - `packages/designer-core/src/host/ViewerHost.tsx` — `data` prop과 `storeData` 머지 후 `importSchema`
  - `packages/designer-cli/src/validate/` — `dataStores` 구조 검증 룰 추가
  - `packages/designer-runtime/examples/static/page.schema.json` — 예제 스키마에 static store 샘플 추가
  - 테스트: `packages/designer-runtime/src/__tests__/`, `packages/designer-core/src/host/__tests__/ViewerHost.test.tsx`, `packages/designer-cli/src/__tests__/validate.test.ts`

## 비고

- **스키마 export round-trip**: form-js `form.saveSchema()`가 unknown top-level 필드를 보존하는지 design phase에서 먼저 검증. 보존 안 하면 디자이너가 원본 스키마의 `dataStores`를 별도 보관했다가 save 시 머지해야 함.
- **Store key 제약**: kebab-case 또는 camelCase 문자열, 중복 금지, form 필드 `key`와 중복 금지.
- **Phase 1 비확장**: `source: "url" | "expression"` 는 의도적으로 제외. 구조만 열어두고 미구현 소스는 validator가 명시적 에러로 거절.
- **의존성**: 없음 (`bootWithSchema`·`ViewerHost`·`designer-cli validate`는 이미 존재).
