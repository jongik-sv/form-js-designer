# Designer × Tiptap v0.2 — 임베디드 디자이너 모달 설계서

- **작성일**: 2026-04-26
- **범위**: `@form-js-designer/designer-tiptap` v0.2 — TipTap NodeView 더블클릭 시 임베디드 designer-editor-host 모달을 띄워 form-js 스키마를 인-place 편집
- **선행 작업**: v0.1 (viewer-only NodeView, 머지 완료, tag `designer-tiptap-v0.1.0`)
- **상태**: 초안 (사용자 검토 대기)

---

## 1. 목표 / 비목표

### 목표
- v0.1의 viewer-only NodeView를 **편집 가능 NodeView**로 확장. 더블클릭 → 모달 → 저장 → NodeView 갱신.
- 모달은 **`@form-js-designer/designer-editor-host`의 임베디드 진입점을 재사용**한다(별도 디자이너 구현 금지).
- designer-* 패키지 무수정 hard rule을 유지하되, designer-editor-host 한 곳에 한해서 **신규 파일 1개 + 1줄 BC 호환 변경**을 허용한다.
- 외부 사용자가 v0.1과 동일한 방식(`npm install` 한 줄)으로 v0.2의 편집 기능을 사용할 수 있게 한다.
- v0.1의 viewer 코드 / 단위 8개 / e2e 6개를 회귀 없이 통과한다.

### 비목표 (v0.2)
- 자체 모달 confirm UI / dirty 인디케이터 / undo 스택 — 자동저장 정책상 불필요.
- 다중 모달 인스턴스(multi-instance) — focus guard 전역 패치 충돌 회피 위해 단일 인스턴스만 허용.
- VS Code webview CSP 호환(unsafe-eval 부재 / Ajv lazy-init 등) — v0.3에서 별도 어댑터로 분리.
- BlockNote/Lexical 등 다른 에디터 어댑터 — host 추출이 v0.2에서 끝나므로 v0.3 후보.
- 토스트/UI 에러 표시 — 자동저장 실패 시 console.error만, 모달은 그대로 유지.
- 다크모드/테마 토큰 — CSS 변수 hook(`--fjd-modal-bg` 등)만 노출, 적용은 호스트 앱 책임.

---

## 2. 핵심 결정 요약

| 항목 | 결정 |
|---|---|
| 동시 모달 정책 | **single-instance**. 두 번째 더블클릭은 기존 모달 focus + 무시 |
| 닫힘 동작 | **자동저장(auto-save on close)**. ESC / [닫기] 모두 onSave 호출 후 close |
| 모달 크기 | **풀스크린** (100vw × 100vh) |
| 헤더 | **상단 슬림바** (44px). 좌측 "Form Designer" 제목 + 우측 [닫기] 단일 버튼 |
| backdrop | 풀스크린이라 N/A. 명시적으로 "backdrop 클릭은 무시" 정책 |
| onSave 실패 | console.error + 모달 유지 (재시도 가능) |
| onSave 비동기 | Promise 반환 시 await 후 close, 동기는 즉시 close |
| 호스트 변경 | designer-editor-host에 신규 파일 1개 + `usePropsPanelFocusGuard` scope 파라미터 BC 변경 |
| PR 분리 | **분리** — PR#3 (host 추출) → PR#4 (tiptap v0.2, blockedBy: PR#3) |
| 의존 정책 | designer-editor-host는 **peerDependencies** (`>=X.Y.0`, X.Y.0은 PR#3 머지 후 결정) |
| 호환성 매트릭스 | `packages/designer-tiptap/README.md`에 표 + CHANGELOG에 한 줄 |
| 버전 | designer-tiptap **0.2.0** (semver minor — 기존 entry 유지 + 새 entry `./editor` 실구현) |
| 레지스트리 | v0.1과 동일 — GitHub Packages (private), npm public 전환 미예정 |

---

## 3. 영향 패키지 / PR 순서

```
PR#3 — designer-editor-host 추출 (blockedBy: 없음)
  └ packages/designer-editor-host/
      ├ src/embeddedDesigner.tsx              (신규)
      ├ src/hooks/usePropsPanelFocusGuard.ts  (1줄 BC: scope 파라미터)
      └ package.json                          (./embedded export 추가)

PR#4 — designer-tiptap v0.2 (blockedBy: PR#3)
  └ packages/designer-tiptap/
      ├ src/editor/withDesigner.ts            (신규)
      ├ src/editor/modalPortal.ts             (신규)
      ├ src/editor/modal.css                  (신규)
      ├ src/editor/index.ts                   (real impl, v0.1 placeholder 교체)
      ├ examples/vanilla-host/                (v0.2 데모: 더블클릭 → 모달)
      ├ tests/                                (단위 +6, e2e +3)
      ├ evidence/v0.2-YYYYMMDD/               (visible Playwright 결과)
      ├ README.md                             (Compatibility 섹션 신설)
      └ CHANGELOG.md                          (0.2.0 entry)
```

루트 `package.json`은 무수정 (release:tiptap 스크립트는 v0.1에서 추가됨, v0.2도 그대로 사용).

---

## 4. 공개 API

### 4.1 `@form-js-designer/designer-editor-host/embedded` (신규)

```ts
export interface MountEmbeddedEditorModalOptions {
  /** 모달 wrapper가 마운트될 부모. 기본 document.body */
  container?: HTMLElement;
  /** 디자이너 초기 스키마 */
  initialSchema: FormSchema;
  /** 자동저장 콜백. close 시 항상 호출. async OK. 실패(reject/throw) 시 모달 유지 */
  onSave: (schema: FormSchema) => void | Promise<void>;
  /** 모달 unmount 직후 호출. triggerClose / destroy 양쪽 경로 모두에서 fire (정확히 1회) */
  onClose?: () => void;
  /** form-js editor 모듈 셋. 기본 = 전체 9개 (LayoutHeight 포함) */
  modules?: ModuleSelector;
}

export interface EmbeddedEditorHandle {
  /** 강제 종료 — onSave 호출 없이 즉시 cleanup. 외부 호스트 destroy 시 호출 */
  destroy(): void;
  /** 현재(미저장) schema 조회 */
  getSchema(): FormSchema;
}

export function mountEmbeddedEditorModal(
  options: MountEmbeddedEditorModalOptions
): Promise<EmbeddedEditorHandle>;
```

### 4.2 `@form-js-designer/designer-editor-host` BC 변경

```ts
// before — packages/designer-editor-host/src/hooks/usePropsPanelFocusGuard.ts
export function usePropsPanelFocusGuard() { /* ... */ }

// after (1줄 BC, 기본값으로 호환성 유지)
export function usePropsPanelFocusGuard(
  scope: Element | Document = document
) { /* ... */ }
```

기존 호출부는 단 한 곳(designer-editor-host의 `src/App.tsx`)이고 인자 없이 호출되므로 기본값 `document`로 그대로 동작. v0.2 모달은 `usePropsPanelFocusGuard(modalRootEl)`로 scope 한정.

### 4.3 `@form-js-designer/designer-tiptap/editor` (real impl)

```ts
/**
 * v0.1 viewer NodeView를 designer-가능 형태로 wrap.
 * 더블클릭 → mountEmbeddedEditorModal → onSave에서 editor.commands.updateAttributes 호출.
 */
export function withDesigner<N extends Node>(node: N): N;
```

v0.1에서 `./editor`는 placeholder export(no-op)였음. v0.2에서 실제 구현으로 교체.

---

## 5. 모달 portal 라이프사이클

```
[NodeView onDoubleClick]
   │
   ├─ activeModal !== null? → activeModalRootEl.focus() + return
   │
   ▼
mountEmbeddedEditorModal({ initialSchema, onSave, onClose })
   │
   ├ 1. wrapperEl = createElement('div')
   │     wrapperEl.className = 'fjd-tiptap-modal-root'
   │     wrapperEl.tabIndex = -1
   │     (container ?? document.body).appendChild(wrapperEl)
   │
   ├ 2. document.body.style.overflow = 'hidden'  // 스크롤 잠금, 이전 값 stash
   │
   ├ 3. 헤더 div + 컨텐츠 div (vanilla DOM, Preact 아님)
   │     헤더: <h2>Form Designer</h2> + <button class="fjd-tiptap-close-btn">닫기</button>
   │
   ├ 4. preact.render(<EmbeddedDesignerApp .../>, contentEl)
   │     EmbeddedDesignerApp = App.tsx에서 root 마운트만 추출 (Watermark, route 제외)
   │     usePropsPanelFocusGuard(wrapperEl)  ← scope 한정
   │
   ├ 5. listeners 등록 (모두 wrapperEl scoped, capture phase):
   │     - keydown 'Escape' → triggerClose()
   │     - 헤더 [닫기] 버튼 click → triggerClose()
   │     - backdrop 클릭 → 풀스크린이라 N/A (명시적으로 무시)
   │
   └ 6. activeModal = handle, activeModalRootEl = wrapperEl, return handle

[triggerClose]
   │
   ├ 1. await onSave(getSchema())          // 자동저장
   │     실패 (Promise reject / throw) → console.error, return (close 중단)
   │
   ├ 2. preact.render(null, contentEl)     // unmount
   │
   ├ 3. listeners detach
   │
   ├ 4. wrapperEl.remove()
   │     document.body.style.overflow = stash
   │
   ├ 5. activeModal = null, activeModalRootEl = null
   │
   └ 6. onClose?.()

[handle.destroy() — 외부 강제 종료]
   │
   └ onSave 호출 없이 2~6 수행 (onClose는 fire — 정리 hook 보장)
     단, triggerClose 진행 중이면 destroy는 noop (이중 cleanup 방지)
```

### 단일 인스턴스 모듈 스코프 변수

```ts
// modalPortal.ts
let activeModal: EmbeddedEditorHandle | null = null;
let activeModalRootEl: HTMLElement | null = null;
```

withDesigner의 onDoubleClick은 호출 전 `activeModal !== null` 체크.

---

## 6. CSS 격리 (풀스크린)

```css
/* designer-tiptap/src/editor/modal.css */
.fjd-tiptap-modal-root {
  position: fixed;
  inset: 0;
  z-index: 2147483000;          /* TipTap floating menu(보통 100~1000)보다 위, max 32비트보다는 작게 */
  background: var(--fjd-modal-bg, #fff);
  display: flex;
  flex-direction: column;
  isolation: isolate;            /* z-index stacking context */
}

.fjd-tiptap-modal-header {
  flex: 0 0 auto;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--fjd-modal-border, #e5e7eb);
}
.fjd-tiptap-modal-header h2 {
  font-size: 14px;
  margin: 0;
  font-weight: 600;
}
.fjd-tiptap-close-btn {
  /* primary 스타일 — 명시 색상 hard-code 대신 CSS 변수 hook */
  background: var(--fjd-modal-primary-bg, #111);
  color: var(--fjd-modal-primary-fg, #fff);
  border: 0;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.fjd-tiptap-modal-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;             /* host designer가 내부 스크롤 처리 */
  position: relative;
}
/* host designer의 app.css:16 height:100vh override — wrapper가 풀스크린이라 100% 필요 */
.fjd-tiptap-modal-content > * {
  height: 100% !important;
}
```

CSS는 v0.1과 마찬가지로 `./editor/modal.css`로 직접 import (CSS-in-JS 미사용).

---

## 7. usePropsPanelFocusGuard scope 변경 상세

```ts
// before
export function usePropsPanelFocusGuard() {
  useEffect(() => {
    const orig = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function patched(opts) {
      /* 기존 패치 로직 */
    };
    return () => { HTMLElement.prototype.focus = orig; };
  }, []);
}

// after
export function usePropsPanelFocusGuard(scope: Element | Document = document) {
  useEffect(() => {
    const orig = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function patched(opts) {
      // scope 안의 element만 패치 적용, 그 외는 원본 동작
      if (scope === document || (scope as Element).contains(this)) {
        /* 기존 패치 로직 */
      } else {
        return orig.call(this, opts);
      }
    };
    return () => { HTMLElement.prototype.focus = orig; };
  }, [scope]);
}
```

**호환성**:
- `usePropsPanelFocusGuard()` — 기본값 `document` → `document.contains(any HTMLElement)`는 true → 기존 동작 100% 유지.
- `usePropsPanelFocusGuard(modalRootEl)` — modal 외부 element는 원본 focus 호출 → tiptap 본문 / 외부 input 등에 영향 없음.

---

## 8. TipTap NodeView 통합 (withDesigner)

```ts
// editor/withDesigner.ts
import { mountEmbeddedEditorModal } from '@form-js-designer/designer-editor-host/embedded';
import { activeModal, activeModalRootEl, setActiveModal } from './modalPortal';

export function withDesigner<N extends Node>(node: N): N {
  return node.extend({
    addNodeView() {
      return ({ node, getPos, editor }) => {
        // v0.1 viewer DOM 그대로 재사용
        const dom = createViewerDom(node.attrs.schema);

        dom.addEventListener('dblclick', async (e) => {
          e.preventDefault();
          if (activeModal) {
            activeModalRootEl?.focus();
            return;
          }
          const handle = await mountEmbeddedEditorModal({
            initialSchema: node.attrs.schema,
            onSave: (newSchema) => {
              const pos = getPos();
              if (pos == null) {
                console.warn('[designer-tiptap] getPos() returned null, skipping update');
                return;
              }
              editor
                .chain()
                .setNodeSelection(pos)
                .updateAttributes(node.type.name, { schema: newSchema })
                .run();
            },
          });
          setActiveModal(handle);
        });

        return {
          dom,
          destroy() {
            // editor.destroy() 시 cleanup
            if (activeModal) activeModal.destroy();
          },
        };
      };
    },
  });
}
```

---

## 9. 에러 / 엣지 케이스

| 상황 | 처리 |
|---|---|
| `onSave` Promise reject / throw | `console.error('[designer-tiptap] onSave failed:', err)`, 모달 유지, activeModal 유지 |
| `mountEmbeddedEditorModal` 호출 중 또 호출 | activeModal !== null 체크가 막음 (single-instance 보장) |
| 모달 열린 채 TipTap editor.destroy() | NodeView destroy hook에서 `activeModal?.destroy()` 강제 호출 |
| Preact mount 자체 실패 | try/catch → wrapperEl 정리 후 reject (activeModal 미설정) |
| ESC 이벤트가 form-js editor 내부 input에서 발생 | wrapperEl scoped capture phase로 host designer의 ESC 처리 우선권 보장 |
| `getPos()` null (TipTap node 사라짐) | onSave 노옵, console.warn |
| 사용자가 `Esc` 누른 직후 빠르게 또 누름 | triggerClose 진행 중 플래그(`closing = true`)로 중복 진입 차단 |
| onSave가 비동기인데 호출 중 destroy | destroy는 onSave 결과 무시 — Promise는 잊힘(detached). v0.2 범위에서 충분 |

---

## 10. 빌드 / 번들링

`packages/designer-tiptap/tsup.config.ts`의 `editor` entry external:
```ts
external: [
  '@form-js-designer/designer-editor-host',
  '@form-js-designer/designer-editor-host/embedded',
  'preact', 'preact/hooks',
  '@bpmn-io/form-js-editor', '@bpmn-io/form-js-viewer',
  '@tiptap/core', '@tiptap/pm/*',
],
```

번들에 host 코드가 들어가지 않음 — peer 정책 일관성 유지. `dist/editor/modal.css`는 export로 노출.

---

## 11. 테스트 전략

### 11.1 단위 테스트 — PR#3 (designer-editor-host)

```
packages/designer-editor-host/tests/
├ usePropsPanelFocusGuard.scope.test.tsx (4 cases)
│   - 기본값 document → 기존 동작 (회귀 방지)
│   - scope=Element → 외부 element.focus() 패치 미적용
│   - scope=Element → 내부 element.focus() 패치 적용
│   - cleanup 시 prototype.focus 원복
│
└ embeddedDesigner.test.tsx (5 cases)
    - mount → handle 반환, wrapperEl이 container에 추가됨
    - destroy → wrapperEl 제거, prototype.focus 원복, listeners detach
    - getSchema → 현재 schema 반환
    - triggerClose 경로(ESC) → onSave 호출 → onClose 1회 fire
    - destroy 경로(외부 강제 종료) → onSave 미호출 + onClose 1회 fire
```

### 11.2 단위 테스트 — PR#4 (designer-tiptap)

기존 v0.1 unit 8개에 +6 추가:
```
packages/designer-tiptap/tests/withDesigner.test.ts (6 cases)
- 더블클릭 → mountEmbeddedEditorModal 호출 (mocked)
- activeModal 있으면 두 번째 더블클릭에서 mount 호출 안 함
- onSave 콜백이 editor.commands.updateAttributes 호출
- getPos() null 반환 시 노옵
- editor.destroy() → activeModal.destroy() 호출
- mount 실패(reject) → activeModal === null 유지 (재시도 가능)
```

### 11.3 E2E (Playwright)

기존 v0.1 e2e 6개에 +3 추가:
```
packages/designer-tiptap/e2e/v0.2-modal.spec.ts
1. 더블클릭 → 모달 열림 (헤더 "Form Designer" 보임, [닫기] 버튼 존재)
2. 모달에서 컴포넌트 추가 → [닫기] → NodeView 갱신 반영 확인
3. ESC → 자동저장 후 닫힘 + 두 번째 더블클릭으로 재오픈 가능
```

### 11.4 Visible Playwright (메모리 의무)

PR#4 머지 직전 강제:
- `pkill -f chromium` 선행 (profile lock 방지)
- `mcp__plugin_playwright__browser_*` (visible)로 examples/vanilla-host 띄움
- 시나리오 1~3 수동 재현 + 스크린샷
- evidence: `packages/designer-tiptap/evidence/v0.2-YYYYMMDD/`

### 11.5 회귀 방지 게이트

PR#4 머지 전 강제:
- v0.1 unit 8개 + e2e 6개 모두 PASS
- v0.2 unit +6 + e2e +3 모두 PASS
- visible Playwright evidence 디렉터리 존재
- `pnpm -w build:tiptap` PASS
- README Compatibility 표 갱신, CHANGELOG entry 존재

---

## 12. 호환성 매트릭스

`packages/designer-tiptap/README.md`에 신설 섹션:

```markdown
## Compatibility

| @form-js-designer/designer-tiptap | @form-js-designer/designer-editor-host (peer) |
|-----------------------------------|------------------------------------------------|
| 0.1.x                              | (independent — viewer-only, no host needed)   |
| 0.2.x                              | >=X.Y.0 (extracted `./embedded` entry point)  |
```

`packages/designer-tiptap/package.json`:
```json
{
  "version": "0.2.0",
  "peerDependencies": {
    "@form-js-designer/designer-editor-host": ">=X.Y.0"
  }
}
```

`X.Y.0`은 PR#3 머지 후 결정 → plan에서는 `PRE-PR-MERGE` placeholder로 표기, PR#4 작업 첫 단계에서 채움.

CHANGELOG entry:
```markdown
## 0.2.0 — 2026-04-XX
### Added
- `./editor` entry: `withDesigner(node)` HOC for TipTap NodeView with double-click → embedded designer modal
- Single-instance modal portal with auto-save on close (ESC / [닫기] button)
### Requires
- @form-js-designer/designer-editor-host >=X.Y.0 (extracted embedded designer entry point)
```

---

## 13. 메모리 / 사용자 선호 적용

이 spec/plan/구현은 다음 메모리를 준수:

- **E2E 의무**: visible Playwright (plugin_playwright MCP) + pkill chromium 선행
- **WP 완료 직전 visible 검증**: PR#4 머지 직전 brw-test 시그널 포함
- **form-js editor host 필수 의존성**: form-js-base.css 존재 / vite define.global / config.icon fallback / 한국어 name 가능
- **form-js 커스텀 container 계약**: 변경 없음 (host 추출은 디자이너 자체 동작에 영향 안 줌)
- **VS Code webview CSP**: v0.2 범위 외, v0.3에서 별도 어댑터로 분리

사용자 선호:
- **자율 진행**: PR#3, PR#4 모두 사람 게이트 없이 task 단위 자동 진행
- **서브에이전트 적극 활용**: 매 task fresh subagent (implementer + spec reviewer + code quality reviewer)
- **모델 매트릭스**: mechanical = sonnet/haiku, 통합/디버깅 = default, 아키 결정 = opus
- **시간 추적**: task별 dispatch/리뷰 소요시간 표 형태로 보고
- **TaskCreate/TaskUpdate**로 진행 상태 관리

---

## 14. 출고 정책

- **레지스트리**: GitHub Packages (private). v0.1과 동일.
- **버전 bump**: designer-tiptap **0.2.0** (semver minor — public API 추가).
- **tag**: `designer-tiptap-v0.2.0` (git tag, push to origin).
- **publish dry-run**: PR#4 머지 직후 `pnpm --filter @form-js-designer/designer-tiptap publish --dry-run`로 검증.
- **designer-editor-host 출고**: PR#3 머지 시 host 패키지도 minor bump 필요 (`./embedded` export 추가). 버전은 PR#3 작업 첫 단계에서 결정.

---

## 15. 범위 외 (v0.3+ 후보)

| 항목 | 보류 사유 |
|---|---|
| 자체 모달 confirm UI (window.confirm 대신) | 자동저장 정책상 confirm 자체 불필요 |
| dirty 인디케이터 / undo 스택 | 자동저장이라 dirty 의미 약함 |
| 다중 모달 (multi-instance) | focus guard 전역 패치 충돌, BC를 더 깨야 함 |
| VS Code webview CSP 호환 | unsafe-eval 부재 + Ajv lazy-init 등 별도 작업 |
| BlockNote / Lexical 어댑터 | host 추출이 v0.2에서 끝나므로 v0.3에서 같은 host API 재사용 |
| 토스트 / 에러 UI | onSave 실패 console.error만 |
| 다크모드 / 테마 토큰 | CSS 변수 hook만 노출, 적용은 호스트 앱 책임 |
| 모달 리사이즈 / 80% / dock | 풀스크린 결정 → 후속 검토 |

---

## 16. 사용자 검토 체크리스트

이 spec을 머지하기 전 다음을 확인:

- [ ] 5개 핵심 결정(single-instance / 자동저장 / 풀스크린 / PR 분리 / peer matrix)이 의도와 일치
- [ ] designer-editor-host 변경 범위(신규 파일 1 + 1줄 BC)가 무수정 정책 예외 허용 범위에 들어감
- [ ] 11번 테스트 전략이 v0.1 회귀 방지 + v0.2 신규 검증을 모두 커버
- [ ] 15번 범위 외 항목이 v0.3 plan에 자연스럽게 이어질 형태
