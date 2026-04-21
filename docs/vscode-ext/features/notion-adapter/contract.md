# notion-adapter 계약 — TypeScript 인터페이스

> 본 문서는 Notion-style 플랫폼(BlockNote 외)에 form-js를 마운트하는 어댑터의 공개 계약을 정의한다. 실제 구현 파일 경로: `packages/designer-notion-adapter/src/adapters/shared/FormJsBlockHost.ts`.
>
> 설계 배경은 `adapter-design.md`, 플랫폼 선정은 `platform-matrix.md`를 참조한다.

---

## FormJsBlockHost

플랫폼 어댑터가 form-js 블록 하나를 host 해주기 위해 구현/래핑하는 인터페이스. 플랫폼 SDK의 custom block API(예: BlockNote `createReactBlockSpec`)가 이 host 위에서 viewer/editor를 마운트한다.

```ts
// packages/designer-notion-adapter/src/adapters/shared/FormJsBlockHost.ts

import type { MountOpts, FormJsHandle } from './contract';

export interface FormJsBlockHost {
  /** 뷰어 모드로 form-js를 컨테이너에 마운트한다. */
  mountViewer(container: HTMLElement, schema: string, opts?: MountOpts): Promise<FormJsHandle>;

  /** 편집 모드로 form-js-editor를 컨테이너에 마운트한다. */
  mountEditor(container: HTMLElement, schema: string, opts?: MountOpts): Promise<FormJsHandle>;

  /**
   * 뷰어→편집 전환 요청.
   * viewer-only 환경에서는 no-op (warn 로그만)이다. editor 기능을 지원하지 않는 플랫폼에서 throw하지 않도록 한다.
   */
  requestEdit(handle: FormJsHandle): void;
}
```

- `FormJsBlockHost.ts`는 어댑터 공통 계약을 정의하며, 플랫폼별 구현(`adapters/blocknote.ts`, `adapters/generic.ts`)에서 이 인터페이스를 충족한다.

---

## FormJsHandle

마운트 결과로 반환되는 제어 핸들. 호출자가 schema 갱신·정리(dispose)를 수행할 수 있도록 한다.

```ts
export interface FormJsHandle {
  /** 현재 모드 */
  readonly mode: 'viewer' | 'editor';

  /** 마운트된 form-js 인스턴스 식별자 */
  readonly id: string;

  /** 스키마만 교체 (컨테이너 재마운트 없이) */
  applySchemaUpdate(schema: string): Promise<void>;

  /** 마운트된 form-js 인스턴스를 정리한다. 이후 이 handle의 메서드 호출은 no-op. */
  dispose(): void;
}
```

- `applySchemaUpdate`는 스키마 문자열을 받아 form-js 인스턴스의 schema만 업데이트한다.
- `dispose()`는 viewer/editor destroy + themeSync disconnect + 컨테이너 DOM 정리를 수행한다.

---

## MountOpts

`mountViewer` / `mountEditor` 호출 시 전달하는 옵션 번들.

```ts
export interface MountOpts {
  /**
   * CSS 격리 전략. 기본값은 'shadow'.
   *
   * - 'shadow' — (default) Shadow DOM 내부에 form-js를 마운트. 플랫폼 CSS와 form-js CSS를 완전 분리.
   *   단, 플랫폼 CSS에서 form-js 스타일을 덮어써야 하는 사내 테마 요구가 있으면 'scoped'로 낮춘다.
   * - 'scoped' — scoped class prefix(`.fjs-scope-<hash>`) + CSS selector 격리. Shadow DOM이 지원되지 않는 환경의 fallback.
   *   호스트 CSS와 form-js CSS가 충돌할 수 있는 조건에서만 선택한다.
   */
  cssIsolation?: 'shadow' | 'scoped';

  /** 테마 전략 — 기본값 'auto' (host 문서의 data-theme 속성 구독) */
  theme?: 'auto' | 'light' | 'dark';

  /**
   * viewer-only 환경 여부. true이면 requestEdit 호출 시 no-op + warn 로그만 남긴다.
   * 기본값은 false (editor 마운트 가능 환경 가정).
   */
  viewerOnly?: boolean;
}
```

### cssIsolation 기본값 정책 — shadow가 default

- **기본값은 shadow** — Shadow DOM 내부 격리가 가장 안전하며, form-js CSS가 호스트 환경을 오염시키지 않는다.
- **scoped fallback** 발동 조건:
  - Shadow DOM을 지원하지 않는 환경(구형 브라우저 등)
  - 호스트 CSS가 form-js 내부 선택자를 의도적으로 덮어써야 하는 사내 테마 요구
  - 두 경우 모두 호출자가 명시적으로 `cssIsolation: 'scoped'`를 지정한다.
  - scoped 모드에서 host CSS 충돌이 발견되면 fallback 조건 로그를 남긴다.

### requestEdit 동작 정책 — viewer-only 환경

- `viewerOnly: true` 또는 플랫폼이 editor 마운트를 지원하지 않는 경우:
  - `requestEdit()`는 **no-op** 처리 + `console.warn('[form-js adapter] requestEdit called in viewer-only mode — ignored')` 로그만 남긴다.
  - throw 하지 않는다 — 호출자의 try/catch 경로가 오염되지 않아야 한다.

---

## 런타임 메서드 요약

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `mount(container, schema, opts)` | `mount(container, schema, opts): Promise<FormJsHandle>` | 플랫폼별 어댑터의 메인 진입점 (viewer/editor 선택 래퍼) |
| `applySchemaUpdate(schema)` | `applySchemaUpdate(schema: string): Promise<void>` | 기존 form-js 인스턴스의 schema만 업데이트 |
| `dispose()` | `dispose(): void` | form-js 인스턴스 + themeSync 해제 + 컨테이너 정리 |
| `requestEdit(handle)` | `requestEdit(handle): void` | viewer→editor 전환. viewer-only 환경에서는 no-op + warn. |

## 참조

- 어댑터 배경: `adapter-design.md`
- 플랫폼 매트릭스: `platform-matrix.md`
- 구현 소스: `packages/designer-notion-adapter/src/adapters/shared/FormJsBlockHost.ts`, `packages/designer-notion-adapter/src/adapters/blocknote.ts`, `packages/designer-notion-adapter/src/adapters/generic.ts`
