# @form-js-designer/designer-runtime

designer-runtime은 form-js 스키마를 운영 환경에서 두 채널(정적 번들 + API endpoint)로 수신하여 ViewerHost로 무손실 렌더하고, 부팅 시 Ajv 검증 실패 시 차단 + 알림 이벤트를 발화하는 라이브러리 패키지입니다.

## 설치

이 패키지는 모노레포 내부에서만 사용되며 별도 npm 배포가 없습니다.

## 사용 예시

### 정적 채널 (Static Import)

```typescript
import { createStaticSource, bootWithSchema } from '@form-js-designer/designer-runtime';
import { ViewerHost } from '@form-js-designer/designer-core/host';
import schema from './page.schema.json';
import manifest from './manifest.json';

const source = createStaticSource(schema, manifest); // manifest 있으면 SHA-256 검증
const { schema: validatedSchema } = await source.load();

const result = await bootWithSchema({
  schema: validatedSchema,
  registry: formFieldRegistry, // 컴포넌트 레지스트리
});

// result.schema — 검증된 스키마
// result.usedFallback — lastGood fallback 사용 여부
render(<ViewerHost schema={result.schema} />, document.getElementById('app'));
```

### API 채널 (ApiSchemaLoader)

```typescript
import { createApiLoader, bootWithSchema } from '@form-js-designer/designer-runtime';
import { ViewerHost } from '@form-js-designer/designer-core/host';

const loader = createApiLoader({
  baseUrl: 'https://example.com/api',
  schemaId: 'my-form',
  env: 'prod',
  onError: (err) => console.error('Schema load failed:', err.code),
});

// ETag 캐시 + localStorage fallback 자동 처리
const { schema } = await loader.load();

const result = await bootWithSchema({ schema, registry: formFieldRegistry });

// designer:schema-loaded / designer:schema-error 이벤트 자동 발화
render(<ViewerHost schema={result.schema} />, document.getElementById('app'));
```

## 이벤트

- `designer:schema-loaded` — 스키마 부팅 성공 시 발화
- `designer:schema-error` — 검증 실패 또는 네트워크 오류 시 발화

```typescript
window.addEventListener('designer:schema-error', (e: CustomEvent) => {
  const { stage, errors, usedFallback } = e.detail;
  if (!usedFallback) {
    // 완전 실패 — 사용자에게 에러 표시
    showErrorBanner(errors);
  }
});
```
