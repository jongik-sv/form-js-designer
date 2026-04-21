# 호스트 비종속 계약 명세 — FormJsBlockHost

> 작성 태스크: TSK-03-02
> 구현 위치: `packages/designer-vscode-extension/src/adapters/shared/FormJsBlockHost.ts`
> 상태: 계약 확정 (코드 생성은 TSK-03-03)

---

## 1. 개요

`FormJsBlockHost`는 VSCode preview·Notion 어댑터 등 **모든 호스트가 공통으로 구현**해야 하는 인터페이스다. 호스트 플랫폼(BlockNote, Tiptap, VSCode webview 등)과 form-js 런타임 사이의 경계를 정의한다.

파일 경로: `packages/designer-vscode-extension/src/adapters/shared/FormJsBlockHost.ts`

---

## 2. 핵심 인터페이스

```ts
// adapters/shared/FormJsBlockHost.ts

export interface MountOpts {
  schemaId: string;              // LRU 캐시 키
  readOnly?: boolean;            // viewer-only 모드 강제 (기본값: true)
  theme?: 'light' | 'dark' | 'auto';
  cssIsolation?: 'shadow' | 'scoped' | 'none';  // 기본값: 'shadow'
  onError?(err: Error): void;    // 호스트 측 에러 표시 위임
}

export interface FormJsHandle {
  applySchemaUpdate(schema: unknown): Promise<void>;
  requestEdit(handler: (current: unknown) => Promise<unknown | null>): void;
  dispose(): void;
}

export interface FormJsBlockHost {
  mount(root: HTMLElement, schema: unknown, opts: MountOpts): FormJsHandle;
}
```

---

## 3. MountOpts 상세

### 3-1. `cssIsolation` 기본값 및 fallback

- **기본값: `'shadow'`** — `root.attachShadow({ mode: 'open' })` + form-js base.css inline `<style>` 주입
- `'scoped'` fallback 발동 조건: 호스트 플랫폼의 React 이벤트 위임이 ShadowRoot 안에서 깨지는 경우 (BlockNote v0.x에서 발생 가능). `MountOpts.cssIsolation = 'scoped'`를 명시적으로 전달하면 `.form-js-block` scope prefix 방식으로 전환.
- shadow 기본값 이유: `form-js-base.css`의 `*`/`html`/`body` global 셀렉터가 호스트 본문 텍스트를 침범하는 충돌 사례가 프로젝트에서 이미 관찰됨.
- `'none'`: 호스트가 CSS를 직접 관리. form-js base.css 미주입이므로 컨테이너 높이=0 문제 발생 가능.

### 3-2. `readOnly` 기본값

- `readOnly`가 명시되지 않으면 `true` (viewer-only).
- 편집 활성화는 **호스트 어댑터 entry가 capability 검사 후 `readOnly: false`를 전달**한다.

---

## 4. FormJsHandle 메서드 계약

### `mount(root, schema, opts) → FormJsHandle`

- `root`: form-js가 렌더될 컨테이너 `HTMLElement`.
- `schema`: form-js 스키마 객체 (JSON 파싱 완료 상태).
- `opts.schemaId`: LRU 캐시 키. 동일 ID 재호출 시 `importSchema()`로 갱신.
- 반환: `FormJsHandle`

### `applySchemaUpdate(schema) → Promise<void>`

- 현재 마운트된 viewer/editor에 새 스키마를 적용한다.
- LRU 캐시를 통해 재마운트 없이 `importSchema()` 호출.
- 실패 시 `opts.onError?.(err)` 위임 후 reject.

### `requestEdit(handler) → void`

- **viewer-only 모드** (`readOnly: true` 또는 편집 미지원 호스트)인 경우:
  - **no-op** + `console.warn('[form-js adapter] requestEdit called on viewer-only instance')` 출력.
  - `throw`하지 않는다 — 호스트 UI 충돌 방지.
- **편집 지원 모드** (`readOnly: false`)인 경우:
  - `handler(currentSchema)` 호출 → modal/drawer 편집 완료 후 새 스키마 반환.
  - 반환값 `null`이면 취소. `applySchemaUpdate` 호출하지 않음.
  - 반환값이 스키마 객체이면 `applySchemaUpdate(newSchema)` 호출.
- single-editor lock: 블록당 독립 lock. 동일 블록 중복 호출은 no-op + warn.

### `dispose() → void`

- form-js 인스턴스 `destroy()` 호출.
- LRU 캐시에서 `schemaId` 엔트리 제거.
- ShadowRoot 내부 DOM 정리.
- 이후 `applySchemaUpdate` / `requestEdit` 호출은 no-op.

---

## 5. 라이프사이클 시퀀스

```
호스트            FormJsBlockHost       mountViewer/mountEditor
  │                    │                        │
  │ mount(root, schema, opts)                   │
  │──────────────────>│                        │
  │                    │ mountViewer(root, ...) │
  │                    │───────────────────────>│
  │                    │<── FormJsHandle        │
  │<── FormJsHandle    │                        │
  │                    │                        │
  │ handle.applySchemaUpdate(newSchema)         │
  │──────────────────>│ importSchema() ────────>│
  │                    │                        │
  │ handle.requestEdit(handler)                 │
  │──────────────────>│                        │
  │                    │ handler(currentSchema) │
  │                    │<── newSchema or null   │
  │                    │ applySchemaUpdate ─────>│
  │                    │                        │
  │ handle.dispose()   │                        │
  │──────────────────>│ destroy() ─────────────>│
```

---

## 6. 에러 코드

| 코드 | 의미 | 발생 시점 |
|------|------|----------|
| `FORM_JS_PARSE_ERROR` | JSON 파싱 실패 | `mount()` 방어적 catch |
| `FORM_JS_MOUNT_ERROR` | `createForm()` 실패 | `mount()` 내부 |
| `FORM_JS_SCHEMA_UPDATE_ERROR` | `importSchema()` 실패 | `applySchemaUpdate()` |
| `FORM_JS_DISPOSED` | dispose 후 메서드 호출 | `applySchemaUpdate` / `requestEdit` |

에러는 `opts.onError?.(new Error(code + ': ' + detail))` 경로로 호스트에 위임한다.

---

## 7. VSCode 호스트 구현 매핑

| FormJsBlockHost 메서드 | VSCode 구현체 |
|----------------------|--------------|
| `mount()` | `preview.ts:mountViewers()` (thin wrapper → `mountViewer.ts`) |
| `applySchemaUpdate()` | `preview.ts:viewerCache.get(id).importSchema()` |
| `requestEdit()` | `editButton.ts:mountEditButton()` → edit-open 메시지 발송 |
| `dispose()` | `preview.ts:disposeAll()` |

---

## 8. 참조

- `adapter-design.md` — viewer/편집 흐름, 번들 전략, CSS 격리 전체 설계
- `platform-matrix.md` — 호스트 플랫폼별 capability 비교
- TSK-03-01 `platform-identification.md` — 플랫폼 판정 근거
- TSK-03-03 — 본 계약을 구현하는 PoC
