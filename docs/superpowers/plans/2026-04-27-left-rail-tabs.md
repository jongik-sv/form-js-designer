# Left-Rail Tabs (컴포넌트 ↔ 아웃라인) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 좌측 컬럼에 [컴포넌트][아웃라인] 탭을 도입해 form-js 팔레트와 OutlineModule 트리를 한 슬롯에서 토글 표시한다. 햄버거 버튼·`outlineCollapsed` 상태는 제거하고, VS Code 익스텐션에도 동일 레이아웃을 이식해 outline을 노출한다.

**Architecture:**
- 좌측 한 컬럼(`.left-rail`)에 `[role=tablist]` 탭 바와 패널 슬롯 2개를 둔다. form-js editor가 마운트한 뒤 `.fjs-palette-container` DOM을 components 슬롯으로 reparent하고, outline 슬롯엔 `outlinePanel.mount()`로 트리를 박는다. 탭 전환은 `data-active-panel` 속성으로 CSS만 토글한다(form-js 라이프사이클 건드리지 않음).
- VS Code 익스텐션은 `@form-js-designer/designer-editor-host`에 새로 추가하는 `./modules/outline` 서브패스 export로 OutlineModule을 받아 `EDITOR_MODULES`에 끼워넣고, webview HTML과 CSS를 호스트와 동일 구조로 맞춘다.

**Tech Stack:** Preact 10, form-js-editor 1.21, vitest, Playwright, esbuild (extension), Vite (host).

---

## File Structure

**Phase 1 — editor-host (web 단독 앱)**
- Modify: `packages/designer-editor-host/src/App.tsx` — `outlineCollapsed` 제거, 햄버거 버튼 제거, `.left-rail` + 탭 도입, 팔레트 reparent.
- Modify: `packages/designer-editor-host/src/embeddedDesigner.tsx` — 동일 레이아웃으로 정렬.
- Modify: `packages/designer-editor-host/src/app.css` — `.outline-container--collapsed` / `.outline-toggle-btn` 제거, `.left-rail*` 신규.
- Create: `packages/designer-editor-host/src/components/LeftRailTabs.tsx` — 탭 바 컴포넌트 (재사용 + 테스트 단순화).
- Create: `packages/designer-editor-host/src/__tests__/LeftRailTabs.test.tsx` — 단위 테스트.
- Modify: `packages/designer-editor-host/e2e/editor.outline-dnd.spec.ts` — outline 탭 전환 헬퍼 추가.
- Modify: `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` — 필요 시 동일 헬퍼 적용.

**Phase 2 — designer-editor-host 패키지 export**
- Modify: `packages/designer-editor-host/package.json` — `exports`에 `./modules/outline` 추가.

**Phase 3 — VS Code extension**
- Modify: `packages/designer-vscode-extension/src/editor/customEditorProvider.ts` — `buildHtml`이 left-rail/editor 루트 div 두 개를 렌더하도록.
- Modify: `packages/designer-vscode-extension/src/editor/customEditor.ts` — OutlineModule 임포트, 탭 컴포넌트 마운트, 팔레트 reparent.
- Create: `packages/designer-vscode-extension/src/editor/leftRail/LeftRailTabs.tsx` — 익스텐션용 탭 컴포넌트 (host와 동일 마크업 + 익스텐션 i18n 사용).
- Create: `packages/designer-vscode-extension/src/editor/leftRail/relocatePalette.ts` — 순수 헬퍼 (테스트 가능).
- Modify: `packages/designer-vscode-extension/media/form-js-editor-host.css` — left-rail 스타일 + `min-width` 보정.
- Create: `packages/designer-vscode-extension/test/unit/editor/leftRailTabs.test.tsx`.
- Create: `packages/designer-vscode-extension/test/unit/editor/relocatePalette.test.ts`.
- Modify: `packages/designer-vscode-extension/test/unit/editor/customEditorProvider.test.ts` — buildHtml 새 마크업 검증.

---

## Phase 1 — editor-host: 좌측 탭 도입

### Task 1: LeftRailTabs 컴포넌트 단위 테스트 작성

**Files:**
- Create: `packages/designer-editor-host/src/__tests__/LeftRailTabs.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { LeftRailTabs } from '../components/LeftRailTabs';

describe('LeftRailTabs', () => {
  it('renders two tabs with correct labels and aria roles', () => {
    const { getByTestId, getByRole } = render(
      <LeftRailTabs activeTab="components" onTabChange={() => {}} />
    );
    const list = getByRole('tablist');
    expect(list.getAttribute('aria-label')).toBe('좌측 패널 탭');
    expect(getByTestId('left-tab-components').textContent).toBe('컴포넌트');
    expect(getByTestId('left-tab-outline').textContent).toBe('아웃라인');
  });

  it('marks the active tab with aria-selected=true', () => {
    const { getByTestId } = render(
      <LeftRailTabs activeTab="outline" onTabChange={() => {}} />
    );
    expect(getByTestId('left-tab-components').getAttribute('aria-selected')).toBe('false');
    expect(getByTestId('left-tab-outline').getAttribute('aria-selected')).toBe('true');
  });

  it('calls onTabChange when an inactive tab is clicked', () => {
    const onTabChange = vi.fn();
    const { getByTestId } = render(
      <LeftRailTabs activeTab="components" onTabChange={onTabChange} />
    );
    fireEvent.click(getByTestId('left-tab-outline'));
    expect(onTabChange).toHaveBeenCalledWith('outline');
  });
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- LeftRailTabs`
Expected: FAIL with "Cannot find module '../components/LeftRailTabs'"

- [ ] **Step 3: LeftRailTabs 구현**

Create `packages/designer-editor-host/src/components/LeftRailTabs.tsx`:

```tsx
import { h } from 'preact';

export type LeftRailTab = 'components' | 'outline';

interface LeftRailTabsProps {
  activeTab: LeftRailTab;
  onTabChange: (tab: LeftRailTab) => void;
}

const TABS: Array<{ id: LeftRailTab; label: string; testId: string }> = [
  { id: 'components', label: '컴포넌트', testId: 'left-tab-components' },
  { id: 'outline', label: '아웃라인', testId: 'left-tab-outline' },
];

export function LeftRailTabs({ activeTab, onTabChange }: LeftRailTabsProps): h.JSX.Element {
  return (
    <nav
      class="left-rail__tabs"
      role="tablist"
      aria-label="좌측 패널 탭"
      aria-orientation="horizontal"
    >
      {TABS.map((t) => {
        const selected = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            class={`left-rail__tab${selected ? ' left-rail__tab--active' : ''}`}
            data-testid={t.testId}
            aria-selected={selected}
            aria-controls={`left-rail-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!selected) onTabChange(t.id);
            }}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- LeftRailTabs`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add packages/designer-editor-host/src/components/LeftRailTabs.tsx \
        packages/designer-editor-host/src/__tests__/LeftRailTabs.test.tsx
git commit -m "feat(editor-host): add LeftRailTabs component for components/outline tabs"
```

---

### Task 2: App.tsx — 햄버거/`outlineCollapsed` 제거 + left-rail 마크업 도입

**Files:**
- Modify: `packages/designer-editor-host/src/App.tsx`

- [ ] **Step 1: 실패 테스트 작성 (App 레벨)** — `packages/designer-editor-host/src/__tests__/AppLeftRail.test.tsx` 생성

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/preact';
import { h } from 'preact';

vi.mock('@bpmn-io/form-js-editor', () => ({
  FormEditor: class {
    importSchema = vi.fn().mockResolvedValue(undefined);
    saveSchema = vi.fn().mockResolvedValue({ schema: { type: 'default', components: [] } });
    destroy = vi.fn();
    get = vi.fn();
  },
}));

import { App } from '../App';

describe('App — left rail layout', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders .left-rail with components/outline tabs and panels, default active=components', () => {
    const { container } = render(<App />);
    const rail = container.querySelector('.left-rail') as HTMLElement;
    expect(rail).toBeTruthy();
    expect(rail.getAttribute('data-active-panel')).toBe('components');

    expect(container.querySelector('[data-testid="left-tab-components"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="left-tab-outline"]')).toBeTruthy();
    expect(container.querySelector('.left-rail__panel[data-panel="components"]')).toBeTruthy();
    expect(container.querySelector('.left-rail__panel[data-panel="outline"]')).toBeTruthy();
  });

  it('does not render the legacy hamburger toggle button', () => {
    const { container } = render(<App />);
    expect(container.querySelector('[data-testid="outline-toggle"]')).toBeNull();
    expect(container.querySelector('.outline-toggle-btn')).toBeNull();
  });

  it('keeps data-outline-container on the outline panel for MarqueeModule', () => {
    const { container } = render(<App />);
    const outlinePanel = container.querySelector('.left-rail__panel[data-panel="outline"]');
    expect(outlinePanel?.hasAttribute('data-outline-container')).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- AppLeftRail`
Expected: FAIL — `.left-rail` 미존재.

- [ ] **Step 3: App.tsx 수정**

`packages/designer-editor-host/src/App.tsx`에서:

1. 다음 import 추가 (기존 import 블록 끝):
```tsx
import { LeftRailTabs, type LeftRailTab } from './components/LeftRailTabs';
```

2. 라인 65 (`outlineRef`) 아래에 추가:
```tsx
const paletteSlotRef = useRef<HTMLDivElement>(null);
```

3. 라인 85 (`outlineCollapsed` state) 전체 줄을 다음으로 교체:
```tsx
const [leftTab, setLeftTab] = useState<LeftRailTab>('components');
```

4. 라인 154–166 의 outline mount 직후 (`outlinePanel.mount(outlineContainer);` 다음 줄)에 팔레트 reparent 로직 추가:
```tsx
            // 팔레트 DOM을 left-rail components 슬롯으로 옮긴다.
            // form-js dragula는 element 자체에 listener를 박으므로 reparent 안전.
            const paletteEl = container.querySelector('.fjs-palette-container');
            const paletteSlot = paletteSlotRef.current;
            if (paletteEl && paletteSlot && paletteEl.parentElement !== paletteSlot) {
              paletteSlot.appendChild(paletteEl);
            }
```
   (`container`는 라인 111의 `editorRef.current` 변수임 — 컨텍스트 매칭)

5. 라인 241–266 의 `<div class="editor-main">` 자식 영역 (outline-container ~ editor-container) 전체를 다음으로 교체:
```tsx
        <div class="editor-main">
          <div
            class="left-rail"
            data-active-panel={leftTab}
          >
            <LeftRailTabs activeTab={leftTab} onTabChange={setLeftTab} />
            <div class="left-rail__panels">
              <div
                id="left-rail-panel-components"
                class="left-rail__panel"
                data-panel="components"
                role="tabpanel"
                aria-labelledby="left-tab-components"
                ref={paletteSlotRef}
              />
              <div
                id="left-rail-panel-outline"
                class="left-rail__panel"
                data-panel="outline"
                data-outline-container
                role="tabpanel"
                aria-labelledby="left-tab-outline"
                ref={outlineRef}
              />
            </div>
          </div>
          <div class="editor-container" ref={editorRef} data-testid="editor-root" />
          {services.eventBus && editorInstanceRef.current && (
            <ComponentResizeOverlay editor={editorInstanceRef.current} />
          )}
        </div>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- AppLeftRail`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add packages/designer-editor-host/src/App.tsx \
        packages/designer-editor-host/src/__tests__/AppLeftRail.test.tsx
git commit -m "refactor(editor-host): replace outline-container hamburger with left-rail tabs"
```

---

### Task 3: app.css — 햄버거/collapsed 스타일 제거 + left-rail 스타일 추가

**Files:**
- Modify: `packages/designer-editor-host/src/app.css`

- [ ] **Step 1: 기존 outline-container 블록을 left-rail 변경에 맞게 정리**

`app.css` 라인 21–82 의 `.outline-container`, `.outline-container--collapsed`, `.outline-header`, `.outline-toggle-btn`, `.outline-container h3` 블록 전체를 다음으로 교체:

```css
  .left-rail {
    width: 260px;
    flex-shrink: 0;
    border-right: 1px solid #e0e0e0;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .left-rail__tabs {
    display: flex;
    flex-direction: row;
    flex-shrink: 0;
    border-bottom: 1px solid #e0e0e0;
    background: #f5f5f5;
    padding: 0 8px;
    gap: 2px;
  }

  .left-rail__tab {
    flex: 0 0 auto;
    background: transparent;
    border: 1px solid transparent;
    border-bottom: none;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    padding: 8px 14px;
    margin-bottom: -1px;
    color: #555;
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
    cursor: pointer;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }

  .left-rail__tab:hover {
    background: #ececec;
    color: #1f1f1f;
  }

  .left-rail__tab:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }

  .left-rail__tab--active {
    background: #fafafa;
    color: #1565c0;
    border-color: #e0e0e0;
    border-bottom-color: #fafafa;
  }

  .left-rail__panels {
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }

  .left-rail__panel {
    display: none;
    height: 100%;
    overflow: auto;
  }

  .left-rail[data-active-panel="components"] .left-rail__panel[data-panel="components"],
  .left-rail[data-active-panel="outline"] .left-rail__panel[data-panel="outline"] {
    display: block;
  }

  /* 팔레트가 reparent 되어도 좌측 컬럼 폭에 맞도록 */
  .left-rail__panel[data-panel="components"] .fjs-palette-container {
    width: 100%;
    max-width: 100%;
    border-right: none;
  }
```

- [ ] **Step 2: 시각 회귀 점검**

Run: `pnpm --filter @form-js-designer/designer-editor-host dev` → http://localhost:5173 열고 좌측에 탭 보임 / 팔레트 리스트 정상 / 탭 클릭 시 outline 트리 보이는지 확인.

(이 단계는 매뉴얼 — 자동 테스트는 다음 task의 e2e에서 검증)

- [ ] **Step 3: 커밋**

```bash
git add packages/designer-editor-host/src/app.css
git commit -m "style(editor-host): swap outline-container--collapsed CSS for left-rail tabs"
```

---

### Task 4: embeddedDesigner.tsx — 동일 레이아웃으로 정렬

**Files:**
- Modify: `packages/designer-editor-host/src/embeddedDesigner.tsx`

- [ ] **Step 1: 기존 embedded test 보존성 확인**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- embeddedDesigner`
Expected: 기존 통과 상태 기록 (이후 회귀 비교).

- [ ] **Step 2: 실패 테스트 추가**

`packages/designer-editor-host/src/__tests__/embeddedDesigner.test.tsx` 끝에 추가:

```tsx
  it('embedded modal renders left-rail with components/outline tabs', async () => {
    const handle = await mountEmbeddedEditorModal({
      container,
      initialSchema: { type: 'default', components: [] },
      onSave: () => {},
    });
    const rail = container.querySelector('.left-rail') as HTMLElement;
    expect(rail).toBeTruthy();
    expect(rail.getAttribute('data-active-panel')).toBe('components');
    expect(container.querySelector('[data-testid="left-tab-outline"]')).toBeTruthy();
    expect(container.querySelector('.left-rail__panel[data-panel="outline"][data-outline-container]')).toBeTruthy();
    handle.destroy();
  });
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- embeddedDesigner`
Expected: FAIL on the new case.

- [ ] **Step 4: embeddedDesigner.tsx 수정**

`embeddedDesigner.tsx`에서:

1. 상단 import 블록에 추가:
```tsx
import { LeftRailTabs, type LeftRailTab } from './components/LeftRailTabs';
```

2. App 컴포넌트 내부 (라인 141 근처):
   - `outlineRef` 다음 줄에 `const paletteSlotRef = useRef<HTMLDivElement>(null);` 추가
   - `services` state 다음에 `const [leftTab, setLeftTab] = useState<LeftRailTab>('components');` 추가

3. importSchema().then 콜백의 outline mount 직후 (현재 라인 188 `outlinePanel?.mount?.(outlineEl);` 다음)에 팔레트 reparent 로직 추가:
```tsx
            const paletteEl = editorEl.querySelector('.fjs-palette-container');
            const paletteSlot = paletteSlotRef.current;
            if (paletteEl && paletteSlot && paletteEl.parentElement !== paletteSlot) {
              paletteSlot.appendChild(paletteEl);
            }
```

4. JSX의 `editor-main` 자식 (라인 240–254 의 outline-container + editor-container 영역)을 다음으로 교체 (h() 형태 유지):
```tsx
        h(
          'div',
          { class: `${MAIN_CLASS} editor-main` },
          h(
            'div',
            { class: 'left-rail', 'data-active-panel': leftTab },
            h(LeftRailTabs, { activeTab: leftTab, onTabChange: setLeftTab }),
            h(
              'div',
              { class: 'left-rail__panels' },
              h('div', {
                id: 'left-rail-panel-components',
                class: 'left-rail__panel',
                'data-panel': 'components',
                role: 'tabpanel',
                'aria-labelledby': 'left-tab-components',
                ref: paletteSlotRef,
              }),
              h('div', {
                id: 'left-rail-panel-outline',
                class: 'left-rail__panel',
                'data-panel': 'outline',
                'data-outline-container': '',
                role: 'tabpanel',
                'aria-labelledby': 'left-tab-outline',
                ref: outlineRef,
              }),
            ),
          ),
          h('div', { class: `${CANVAS_CLASS} editor-container`, ref: editorRef }),
        ),
```

5. 미사용이 된 `OUTLINE_CLASS` 상수가 있다면 그대로 두되 사용처 없으면 삭제. (이 파일 위쪽에서 정의되었는지 확인 — 정의됐고 다른 곳 사용 없으면 삭제하고 import 정리)

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- embeddedDesigner`
Expected: PASS (기존 케이스 + 신규 케이스).

- [ ] **Step 6: 커밋**

```bash
git add packages/designer-editor-host/src/embeddedDesigner.tsx \
        packages/designer-editor-host/src/__tests__/embeddedDesigner.test.tsx
git commit -m "refactor(editor-host): adopt left-rail tabs in embedded designer modal"
```

---

### Task 5: e2e — outline-dnd가 아웃라인 탭으로 진입하도록 수정

**Files:**
- Modify: `packages/designer-editor-host/e2e/editor.outline-dnd.spec.ts`

- [ ] **Step 1: 헬퍼 추가 (failing assumption 점검)**

`editor.outline-dnd.spec.ts` 파일 상단 (`paletteItem` 함수 위)에 헬퍼 추가:

```ts
async function activateOutlineTab(page: import('@playwright/test').Page): Promise<void> {
  const tab = page.locator('[data-testid="left-tab-outline"]');
  await tab.click();
  await page.locator('.left-rail[data-active-panel="outline"]').waitFor({ timeout: 5000 });
}

async function activateComponentsTab(page: import('@playwright/test').Page): Promise<void> {
  const tab = page.locator('[data-testid="left-tab-components"]');
  await tab.click();
  await page.locator('.left-rail[data-active-panel="components"]').waitFor({ timeout: 5000 });
}
```

- [ ] **Step 2: 각 테스트의 dropToCanvas 호출 직후, outline 노드 검증 전에 `activateOutlineTab(page)` 호출 삽입**

검색 패턴: 각 `await dropToCanvas(...)` 시퀀스 종료 후 `outlineNodes` 라인 등장 직전.
예시 (`reachability` 테스트):

```ts
    await dropToCanvas(page, 'button');
    await dropToCanvas(page, 'button');

+   await activateOutlineTab(page);

    const outlineNodes = page.locator('[data-outline-id]:not([data-outline-id="__outline_root__"])');
```

`아웃라인 첫 번째 노드를 두 번째 노드 아래로 드래그…` 테스트도 동일.
중간에 다시 팔레트에서 끌어와야 하는 케이스가 있으면 그 직전에 `activateComponentsTab(page)` 호출 추가.

- [ ] **Step 3: e2e 실행**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:e2e -- editor.outline-dnd.spec.ts --project=chromium`
Expected: 모든 케이스 PASS.

- [ ] **Step 4: 커밋**

```bash
git add packages/designer-editor-host/e2e/editor.outline-dnd.spec.ts
git commit -m "test(editor-host): switch left tab in outline-dnd e2e to follow new layout"
```

---

### Task 6: editor-host 전체 테스트 + visible 브라우저 1회 검증

- [ ] **Step 1: 단위 + e2e 회귀**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit`
Expected: 전 케이스 PASS.

Run: `pnpm --filter @form-js-designer/designer-editor-host test:e2e --project=chromium`
Expected: 전 케이스 PASS (또는 사전 미해결 외부 flaky만).

- [ ] **Step 2: visible 브라우저로 실물 확인 (메모리 룰 준수)**

```bash
pkill -f "Google Chrome" || true
pnpm --filter @form-js-designer/designer-editor-host dev &
```

Playwright (plugin_playwright, headless=false)로 http://localhost:5173 진입 → 컴포넌트 탭 클릭 → 팔레트 보임 → 아웃라인 탭 클릭 → 트리 보임 → DnD 한 번 수행 → 콘솔 에러 없음 확인.

- [ ] **Step 3: 검증 결과 기록**

이 task는 별도 커밋 없음. PR 본문에 검증 결과 메모.

---

## Phase 2 — designer-editor-host 패키지 export 노출

### Task 7: package.json `./modules/outline` 서브패스 export 추가

**Files:**
- Modify: `packages/designer-editor-host/package.json`

- [ ] **Step 1: 실패 import 테스트 작성**

Create `packages/designer-editor-host/src/__tests__/moduleExport.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('package exports', () => {
  it('exposes OutlineModule via ./modules/outline subpath', async () => {
    const mod = await import('@form-js-designer/designer-editor-host/modules/outline');
    expect(mod.OutlineModule).toBeDefined();
    expect((mod.OutlineModule as { __init__?: string[] }).__init__).toContain('outlinePanel');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- moduleExport`
Expected: FAIL — subpath unresolved.

- [ ] **Step 3: package.json 수정**

`packages/designer-editor-host/package.json` `exports` 블록을 다음으로 교체:

```json
  "exports": {
    "./embedded": "./src/embeddedDesigner.tsx",
    "./modules/outline": "./src/modules/OutlineModule.ts"
  },
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @form-js-designer/designer-editor-host test:unit -- moduleExport`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add packages/designer-editor-host/package.json \
        packages/designer-editor-host/src/__tests__/moduleExport.test.ts
git commit -m "feat(editor-host): export OutlineModule via ./modules/outline subpath"
```

---

## Phase 3 — VS Code extension: outline + 좌측 탭 이식

### Task 8: relocatePalette 헬퍼 + 단위 테스트

**Files:**
- Create: `packages/designer-vscode-extension/src/editor/leftRail/relocatePalette.ts`
- Create: `packages/designer-vscode-extension/test/unit/editor/relocatePalette.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { relocatePalette } from '../../../src/editor/leftRail/relocatePalette';

describe('relocatePalette', () => {
  it('moves the palette element from the form-js editor into the slot', () => {
    const editor = document.createElement('div');
    const palette = document.createElement('div');
    palette.className = 'fjs-palette-container';
    editor.appendChild(palette);

    const slot = document.createElement('div');
    document.body.append(editor, slot);

    relocatePalette(editor, slot);
    expect(palette.parentElement).toBe(slot);
  });

  it('is a no-op when palette is already inside the slot', () => {
    const editor = document.createElement('div');
    const slot = document.createElement('div');
    const palette = document.createElement('div');
    palette.className = 'fjs-palette-container';
    slot.appendChild(palette);
    document.body.append(editor, slot);

    relocatePalette(editor, slot);
    expect(palette.parentElement).toBe(slot);
  });

  it('returns false when palette is missing', () => {
    const editor = document.createElement('div');
    const slot = document.createElement('div');
    expect(relocatePalette(editor, slot)).toBe(false);
  });

  it('returns true on successful move', () => {
    const editor = document.createElement('div');
    const palette = document.createElement('div');
    palette.className = 'fjs-palette-container';
    editor.appendChild(palette);
    const slot = document.createElement('div');
    expect(relocatePalette(editor, slot)).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter form-js-designer-vscode test:unit -- relocatePalette`
Expected: FAIL — module missing.

- [ ] **Step 3: relocatePalette 구현**

```ts
/**
 * relocatePalette — form-js editor 컨테이너 안의 .fjs-palette-container DOM을
 * 좌측 rail의 components 슬롯으로 이동시킨다.
 *
 * dragula 기반 form-js 팔레트는 element 자체에 listener를 박으므로 reparent 안전.
 * 이미 슬롯 안에 있으면 no-op. 팔레트 미존재면 false.
 */
export function relocatePalette(editorEl: Element, slotEl: Element): boolean {
  const palette = editorEl.querySelector('.fjs-palette-container') as HTMLElement | null;
  if (!palette) return false;
  if (palette.parentElement === slotEl) return true;
  slotEl.appendChild(palette);
  return true;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter form-js-designer-vscode test:unit -- relocatePalette`
Expected: PASS (4 tests).

- [ ] **Step 5: 커밋**

```bash
git add packages/designer-vscode-extension/src/editor/leftRail/relocatePalette.ts \
        packages/designer-vscode-extension/test/unit/editor/relocatePalette.test.ts
git commit -m "feat(vscode-ext): add relocatePalette helper"
```

---

### Task 9: LeftRailTabs (extension용) 컴포넌트 + 단위 테스트

**Files:**
- Create: `packages/designer-vscode-extension/src/editor/leftRail/LeftRailTabs.tsx`
- Create: `packages/designer-vscode-extension/test/unit/editor/leftRailTabs.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { LeftRailTabs } from '../../../src/editor/leftRail/LeftRailTabs';

describe('extension LeftRailTabs', () => {
  it('renders two tabs and toggles via callback', () => {
    const onTabChange = vi.fn();
    const { getByTestId } = render(
      <LeftRailTabs activeTab="components" onTabChange={onTabChange} />
    );
    expect(getByTestId('left-tab-components').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(getByTestId('left-tab-outline'));
    expect(onTabChange).toHaveBeenCalledWith('outline');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter form-js-designer-vscode test:unit -- leftRailTabs`
Expected: FAIL — module missing.

- [ ] **Step 3: 컴포넌트 구현 (host 버전과 마크업 동일, 라벨은 i18n)**

```tsx
import { h } from 'preact';

export type LeftRailTab = 'components' | 'outline';

interface LeftRailTabsProps {
  activeTab: LeftRailTab;
  onTabChange: (tab: LeftRailTab) => void;
}

const TABS: Array<{ id: LeftRailTab; label: string; testId: string }> = [
  { id: 'components', label: '컴포넌트', testId: 'left-tab-components' },
  { id: 'outline', label: '아웃라인', testId: 'left-tab-outline' },
];

export function LeftRailTabs({ activeTab, onTabChange }: LeftRailTabsProps): h.JSX.Element {
  return (
    <nav
      class="left-rail__tabs"
      role="tablist"
      aria-label="좌측 패널 탭"
      aria-orientation="horizontal"
    >
      {TABS.map((t) => {
        const selected = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            class={`left-rail__tab${selected ? ' left-rail__tab--active' : ''}`}
            data-testid={t.testId}
            aria-selected={selected}
            aria-controls={`left-rail-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!selected) onTabChange(t.id);
            }}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter form-js-designer-vscode test:unit -- leftRailTabs`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add packages/designer-vscode-extension/src/editor/leftRail/LeftRailTabs.tsx \
        packages/designer-vscode-extension/test/unit/editor/leftRailTabs.test.tsx
git commit -m "feat(vscode-ext): add LeftRailTabs component"
```

---

### Task 10: customEditorProvider buildHtml — left-rail/editor 두 div 렌더

**Files:**
- Modify: `packages/designer-vscode-extension/src/editor/customEditorProvider.ts`
- Modify: `packages/designer-vscode-extension/test/unit/editor/customEditorProvider.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

`customEditorProvider.test.ts` 끝에 추가:

```ts
  it('renders left-rail and editor-host containers in body', () => {
    const html = buildHtml(opts);
    expect(html).toContain('id="left-rail"');
    expect(html).toContain('data-active-panel="components"');
    expect(html).toContain('id="left-rail-panel-components"');
    expect(html).toContain('id="left-rail-panel-outline"');
    expect(html).toContain('data-outline-container');
    expect(html).toContain('id="editor-host"');
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter form-js-designer-vscode test:unit -- customEditorProvider`
Expected: FAIL — id="left-rail" 없음.

- [ ] **Step 3: buildHtml 수정**

`customEditorProvider.ts` 라인 428–432 의 body 영역을 다음으로 교체:

```ts
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}' ${cspSource}; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} data:; font-src ${cspSource};">
  <link rel="stylesheet" href="${styleUri}">
${extraLinks}
  <title>form-js Block Editor</title>
</head>
<body>
  <div id="app">
    <div id="left-rail" class="left-rail" data-active-panel="components">
      <div id="left-rail-tabs"></div>
      <div class="left-rail__panels">
        <div id="left-rail-panel-components" class="left-rail__panel" data-panel="components" role="tabpanel" aria-labelledby="left-tab-components"></div>
        <div id="left-rail-panel-outline" class="left-rail__panel" data-panel="outline" data-outline-container role="tabpanel" aria-labelledby="left-tab-outline"></div>
      </div>
    </div>
    <div id="editor-host" class="editor-container"></div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
```

- [ ] **Step 4: 기존 buildHtml 테스트가 `<div id="app"></div>` 단일을 가정한 부분 점검**

Run: `pnpm --filter form-js-designer-vscode test:unit -- customEditorProvider`
Expected: PASS — 기존 assertion이 부분 매칭이면 그대로 통과. 깨지면 해당 assertion을 `<div id="app">`로 완화.

- [ ] **Step 5: 커밋**

```bash
git add packages/designer-vscode-extension/src/editor/customEditorProvider.ts \
        packages/designer-vscode-extension/test/unit/editor/customEditorProvider.test.ts
git commit -m "feat(vscode-ext): scaffold left-rail markup in webview HTML"
```

---

### Task 11: customEditor.ts — OutlineModule 추가 + 탭 마운트 + 팔레트 reparent

**Files:**
- Modify: `packages/designer-vscode-extension/src/editor/customEditor.ts`

- [ ] **Step 1: 실패 통합 테스트 추가**

`packages/designer-vscode-extension/test/unit/customEditor.test.ts` 의 기존 테스트 옆에 추가 (mountEditor가 fixture DOM을 받도록 코드를 살짝 리팩터해야 한다면 다음 step에서 처리):

```ts
  it('initCustomEditor 결과는 outline 슬롯을 노출한다', async () => {
    document.body.innerHTML = `
      <div id="app">
        <div id="left-rail" class="left-rail" data-active-panel="components">
          <div id="left-rail-tabs"></div>
          <div class="left-rail__panels">
            <div id="left-rail-panel-components" class="left-rail__panel" data-panel="components"></div>
            <div id="left-rail-panel-outline" class="left-rail__panel" data-panel="outline" data-outline-container></div>
          </div>
        </div>
        <div id="editor-host" class="editor-container"></div>
      </div>
    `;
    const editorHost = document.getElementById('editor-host')!;
    const editor = await initCustomEditor(editorHost, { type: 'default', components: [] });
    expect(editor).toBeDefined();
    // outline 슬롯 존재 확인
    expect(document.querySelector('.left-rail__panel[data-panel="outline"]')).toBeTruthy();
    editor.destroy();
  });
```

(기존 `customEditor.test.ts`가 happy-dom인지 확인 후 mock 일관성 유지)

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter form-js-designer-vscode test:unit -- customEditor`
Expected: 새 케이스 FAIL (또는 PASS인 채로 다음 step에서 outline mount 추가).

- [ ] **Step 3: customEditor.ts 수정 — module + 마운트 함수 갱신**

상단 imports에 추가:
```ts
import { h, render } from 'preact';
import { OutlineModule } from '@form-js-designer/designer-editor-host/modules/outline';
import { LeftRailTabs, type LeftRailTab } from './leftRail/LeftRailTabs';
import { relocatePalette } from './leftRail/relocatePalette';
```

`EDITOR_MODULES` 배열 끝에 OutlineModule 추가:
```ts
const EDITOR_MODULES = [
  DesignerContainerModule,
  customComponentsModule,
  ContextPadExtrasModule,
  PropsPanelModule,
  LayoutHeightModule,
  OutlineModule,
];
```

`initCustomEditor` 함수의 `createFormEditor` 호출 인자에서 `container`를 그대로 두되 (이제 `editor-host` div), 시그니처 그대로 유지.

`mountEditor` 함수:
- 라인 127–131의 `const container = document.getElementById('app');` 부분을 다음으로 교체:
```ts
  const editorHost = document.getElementById('editor-host');
  if (!editorHost) {
    console.error('[form-js editor] #editor-host 컨테이너를 찾을 수 없습니다.');
    return;
  }
```

- editor 생성 부분의 `container` 인자를 `editorHost`로:
```ts
    editorInstance = (await createFormEditor({
      container: editorHost,
      schema,
      additionalModules: EDITOR_MODULES,
    })) as FormEditorInstance;
```

- editorInstance 생성 직후 (`overlayRoot` 위쪽)에 outline mount + 팔레트 reparent + 탭 wiring 추가:
```ts
  // outline mount
  const outlineSlot = document.querySelector(
    '#left-rail-panel-outline'
  ) as HTMLElement | null;
  if (outlineSlot && typeof editorInstance.get === 'function') {
    try {
      const outlinePanel = editorInstance.get('outlinePanel', false) as
        | { mount?: (el: HTMLElement) => void }
        | undefined;
      outlinePanel?.mount?.(outlineSlot);
    } catch { /* outline 서비스 없으면 무시 */ }
  }

  // 팔레트 reparent
  const paletteSlot = document.querySelector(
    '#left-rail-panel-components'
  ) as HTMLElement | null;
  if (paletteSlot) relocatePalette(editorHost, paletteSlot);

  // 탭 wiring (Preact mount)
  const tabsRoot = document.getElementById('left-rail-tabs');
  const rail = document.getElementById('left-rail');
  if (tabsRoot && rail) {
    let tab: LeftRailTab = (rail.getAttribute('data-active-panel') as LeftRailTab) ?? 'components';
    const renderTabs = (): void => {
      render(
        h(LeftRailTabs, {
          activeTab: tab,
          onTabChange: (next: LeftRailTab) => {
            tab = next;
            rail.setAttribute('data-active-panel', next);
            renderTabs();
          },
        }),
        tabsRoot,
      );
    };
    renderTabs();
  }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter form-js-designer-vscode test:unit -- customEditor`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add packages/designer-vscode-extension/src/editor/customEditor.ts \
        packages/designer-vscode-extension/test/unit/customEditor.test.ts
git commit -m "feat(vscode-ext): mount OutlineModule + left-rail tabs in custom editor"
```

---

### Task 12: form-js-editor-host.css — left-rail 스타일 추가 + min-width 보정

**Files:**
- Modify: `packages/designer-vscode-extension/media/form-js-editor-host.css`

- [ ] **Step 1: CSS 갱신**

`form-js-editor-host.css`의 `#app` 블록을 다음으로 교체:

```css
#app {
  height: 100%;
  /* left-rail(260) + canvas(1024) + properties(300) = 1584 */
  min-width: 1584px;
  display: flex;
  flex-direction: row;
}

#app > * {
  flex-shrink: 0;
  min-height: 0;
}

#editor-host {
  flex: 1 1 auto;
  min-width: 1024px;
  height: 100%;
}
```

파일 끝에 left-rail 스타일 추가:

```css
/* ── 좌측 rail ─────────────────────────────────── */

.left-rail {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--vscode-panel-border, #2d2d2d);
  background: var(--vscode-sideBar-background, #252526);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.left-rail__tabs {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  border-bottom: 1px solid var(--vscode-panel-border, #2d2d2d);
  background: var(--vscode-tab-inactiveBackground, #2d2d2d);
  padding: 0 8px;
  gap: 2px;
}

.left-rail__tab {
  flex: 0 0 auto;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  padding: 8px 14px;
  margin-bottom: -1px;
  color: var(--vscode-tab-inactiveForeground, #969696);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  font-family: inherit;
}

.left-rail__tab:hover {
  background: var(--vscode-tab-hoverBackground, #2a2d2e);
  color: var(--vscode-tab-hoverForeground, #ffffff);
}

.left-rail__tab:focus-visible {
  outline: 2px solid var(--vscode-focusBorder, #007fd4);
  outline-offset: -2px;
}

.left-rail__tab--active {
  background: var(--vscode-tab-activeBackground, #1e1e1e);
  color: var(--vscode-tab-activeForeground, #ffffff);
  border-color: var(--vscode-panel-border, #2d2d2d);
  border-bottom-color: var(--vscode-tab-activeBackground, #1e1e1e);
}

.left-rail__panels {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.left-rail__panel {
  display: none;
  height: 100%;
  overflow: auto;
}

.left-rail[data-active-panel="components"] .left-rail__panel[data-panel="components"],
.left-rail[data-active-panel="outline"] .left-rail__panel[data-panel="outline"] {
  display: block;
}

.left-rail__panel[data-panel="components"] .fjs-palette-container {
  width: 100%;
  max-width: 100%;
  border-right: none;
}
```

기존 `.fjs-editor-container .fjs-form-editor { min-width: 1024px; }` 라인은 `#editor-host`로 옮겨졌으므로 그대로 두되 충돌 없음 확인.

- [ ] **Step 2: 빌드 + 다음 task의 매뉴얼 검증으로 픽셀 확인**

Run: `pnpm --filter form-js-designer-vscode build:copy-css`
Expected: 에러 없이 종료.

- [ ] **Step 3: 커밋**

```bash
git add packages/designer-vscode-extension/media/form-js-editor-host.css
git commit -m "style(vscode-ext): add left-rail styles + adjust #app flex layout"
```

---

### Task 13: 익스텐션 빌드 + VS Code visible 검증

- [ ] **Step 1: 빌드**

Run: `pnpm --filter form-js-designer-vscode build`
Expected: dist/webview/customEditor.js, customEditor.css 생성. esbuild 에러 없음.

- [ ] **Step 2: 단위 테스트 전체**

Run: `pnpm --filter form-js-designer-vscode test:unit`
Expected: 전 케이스 PASS.

- [ ] **Step 3: VS Code Extension Host 매뉴얼 검증**

VS Code 익스텐션 호스트(`Run Extension`)에서 임의 `.form-js` 파일을 열어 확인:

1. 좌측에 `[컴포넌트][아웃라인]` 탭 보임.
2. `컴포넌트` 탭: 팔레트 리스트 (text/button/checkbox/...) 정상 표시 + 캔버스로 드래그-드롭 가능.
3. `아웃라인` 탭: 트리에 현재 스키마 노드들 표시 + 노드 클릭 시 캔버스 selection 동기화.
4. 컴포넌트 → 아웃라인 → 컴포넌트 토글 시 깜빡임/유실 없음.
5. 우측 properties panel 정상 (탭과 무관).
6. 콘솔(웹뷰 devtools) 에러 없음.

- [ ] **Step 4: 검증 결과 PR 본문에 첨부 (스크린샷 1장 + 콘솔 무에러 캡처)**

(이 step은 커밋 없음 — PR 작성 시 첨부)

---

## Phase 4 — 마감

### Task 14: 메모리 업데이트 (선택)

- [ ] **Step 1: 새 레이아웃이 메모리(`project_form_js_css_vite.md`, `project_embedded_designer_layout.md`)에 영향을 주면 갱신**

해당 메모리 파일들이 outline-container를 언급하면 `.left-rail` 구조로 짧게 정정. 추가/삭제 없으면 skip.

- [ ] **Step 2: 커밋 (메모리 변경 시)**

```bash
git add /Users/jji/.claude/projects/-Users-jji-project-form-js-designer/memory/
git commit -m "docs(memory): note left-rail tabs replaces outline-container"
```

---

## Self-Review Notes

- **Spec coverage:** "탭으로 컴포넌트 ↔ 아웃라인 토글" → Task 1–4 (host, embedded), Task 9–11 (extension). "햄버거 버튼 제거" → Task 2,3 의 `outlineCollapsed`/`outline-toggle-btn` 삭제. "extension에 outline 노출" → Task 7 (export), Task 11 (모듈 + 마운트).
- **Placeholder scan:** 모든 step에 코드 또는 정확한 명령. TBD 없음.
- **Type consistency:** `LeftRailTab = 'components' | 'outline'` 두 컴포넌트(host/extension) 동일. `data-active-panel`, `data-panel`, testid `left-tab-{components,outline}` 동일.
- **Risk:** 팔레트 reparent. 1차 회귀(host editor.dragdrop e2e) Task 6에서 검증, 2차(extension) Task 13에서 검증. 만약 dragula가 깨지면 fallback: 팔레트를 form-js editor 안에 두고 `display:none/flex` CSS 토글 + 트리는 absolute overlay (대안은 plan 외 별도 PR로).
