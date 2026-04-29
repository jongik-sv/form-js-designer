# Phase 1A Resume Prompt

Copy-paste this into a fresh Claude Code session (after `/clear`) to continue.

---

## Prompt

`docs/designer/features/tree-component/plan.md` Phase 1A를 시작하자. superpowers + 서브에이전트 적극 활용. VS Code/TipTap은 무조건 실제 visible 검증.

### 현재 상태

- **워킹 디렉토리:** `/Users/jji/project/form-js-designer`
- **브랜치:** `feat/tree-component` (develop에서 분기, 4 커밋 ahead)
- **Phase 0 commit chain:**
  - `6d38c84` — plan
  - `5aa2c56` — spike stub (12 files)
  - `0ab62a6` — quality fixes (aria-invalid + frozen default + TODO)
  - `7071b15` — spike report + 14 evidence screenshots
- **Phase 0 결과:** 3환경(designer-editor-host / VS Code custom editor + markdown preview / TipTap embedded modal) 모두 visible Playwright PASS. **결정: Phase 1A로 진행** (Phase 1B 폴백 불필요)
- **상세 결과:** `docs/designer/features/tree-component/spike-report.md` 참조

### Phase 1A 작업 (plan.md L70-83)

`TreeWidget.tsx` stub을 진짜 재귀 트리 편집 UI로 교체 + `TreeComponent` 완성:

#### 1. `packages/designer-core/src/panel/widgets/TreeWidget.tsx`

현재는 `<textarea>` JSON 직접 편집 stub. Phase 1A에서 진짜 재귀 트리 편집 UI로 교체:
- depth 표시, 펼침/접힘 토글
- 행 단위 액션: `[+자식]`, `[삭제]`, `[이름 inline edit]`
- 루트 추가: `[+ 루트 추가]` 버튼
- 가드: id 중복, 순환 참조, 최대 깊이 (예: 6)
- 순수 헬퍼는 `TreeWidget.helpers.ts` (또는 inline) 분리:
  - `addChildAtPath(nodes, path, newNode)`
  - `deleteNodeAtPath(nodes, path)`
  - `updateNodeAtPath(nodes, path, patch)`
- **vitest 단위 테스트** 의무 (TDD): `packages/designer-core/src/panel/widgets/__tests__/TreeWidget.test.ts` (또는 helpers.test.ts) — 헬퍼 + edge case (id 충돌 / 순환 / 최대 깊이 초과 / 빈 nodes / 한 글자 라벨)
- **CSP-safe**: `eval` / `new Function` 절대 사용 금지. 메모리 `project_vscode_webview_csp.md` 준수
- 기존 stub의 `aria-invalid` 시그널은 Phase 1A에서는 위젯 자체가 valid한 트리만 만들므로 제거 OK (또는 유지)

#### 2. `packages/designer-components/src/tree/index.tsx` 의 `TreeRender` 완성

현재는 `<pre>{JSON.stringify(nodes)}</pre>` stub. Phase 1A에서:
- 재귀 표시 (CSS indent 또는 nested `<ul>`)
- 펼침/접힘만 (사용자 편집 X — viewer는 read-only)
- `expandedByDefault` / `showGuides` propsSchema 옵션 추가
- 빈 nodes → "Nothing to show." 표시 (table 패턴 차용 — `packages/designer-components` table 컴포넌트 참고)

#### 3. `packages/designer-components/src/tree/propsSchema.ts` 보강

```ts
export const treePropsSchema: PropsSchema = {
  properties: {
    label: { type: 'i18n', label: 'designer.components.tree.label', default: '트리' },
    nodes: { type: 'tree', label: 'designer.components.tree.nodes', default: Object.freeze([] as unknown[]) as unknown[] },
    expandedByDefault: { type: 'boolean', label: 'designer.components.tree.expandedByDefault', default: true },
    showGuides: { type: 'boolean', label: 'designer.components.tree.showGuides', default: false },
  },
};
```
`spec.json`도 동일하게 mirror.

#### 4. `escapeGridRender` / `group` 결정

`tree/index.tsx:28` TODO 주석 제거. 결정:
- 트리는 데이터 표시 위주 (사용자 편집은 props panel) → **container 아님**
- 권장: `escapeGridRender: false` (grid row를 차지하는 일반 필드처럼 동작), `group: 'presentation'` (현재 그대로)
- 필요 시 다르게 결정 — 다만 메모리 `project_custom_container_contract.md` 위반 안 하도록 (`escapeGridRender: false` + `components: []` + `ChildrenSlot` + `FormLayouter override` 4조건은 container일 때만)

### 검증 (반드시 visible 3환경 모두)

플랜 §검증 체크리스트(L141-157)대로:

#### 단위/빌드

```bash
npm -w @form-js-designer/designer-core run typecheck   # build script 없음 — typecheck만
npm -w designer-components run build
npm -w designer-editor-host run typecheck   # pre-existing 에러 무시 (tree-related만 봐)
npm -w designer-vscode-extension run build
npm -w designer-tiptap run build
```

```bash
npm test -w @form-js-designer/designer-core -- --run   # vitest TreeWidget 헬퍼 테스트
```

#### Visible Playwright (3환경 모두 — `feedback_e2e_browser_verify` 메모리 의무)

도구는 `mcp__plugin_playwright_playwright__*` 사용 (메모리 `feedback_playwright_mcp_env.md`: ecc playwright는 extension 필수 → 사용 불가, plugin_playwright만).

세션 시작 시 stale 프로세스 정리:
```bash
pkill -f "vite" 2>/dev/null
pkill -f "chromium" 2>/dev/null
```

**Spike-A 재현 (designer-editor-host):**
```bash
npm run dev -w @form-js-designer/designer-editor-host
# → http://localhost:5173/
```
브라우저에서:
- `window.__editor.importSchema({...tree schema...})`
- `selection.toggle(treeField)` 로 props panel에 새 TreeWidget 마운트 확인
- 인라인 편집/추가/삭제 동작 확인
- undo/redo 동작 확인
- read-only viewer 영역(LivePreview 패널)에서도 트리 표시 확인

**Spike-B 재현 (VS Code):**
- `tree-spike.md` fixture 갱신 (Phase 1A 트리 schema 반영)
- 빌드된 `dist/webview/preview.js` + `dist/webview/customEditor.js`를 minimal HTML harness에서 로드 (이미 사용한 패턴 — Phase 0 spike에서 `spike-b-test.html` / `spike-b-customEditor-test.html` 만들었음. 다시 만들거나 e2e suite 통합)
- markdown preview에서 `dc-tree` 재귀 렌더 확인
- customEditor에서 palette → canvas → props panel TreeWidget 확인 (selection은 `window.__formJsEditor` test bridge 패치 필요. 패치는 임시, 검증 후 원복)
- 메모리 `project_vscode_preview_morphdom.md`: 자식 교체 시 키/data-attr 안정화 — TreeRender의 펼침/접힘 토글이 morphdom 충돌 안 일으키도록

**Spike-C 재현 (TipTap):**
```bash
npm run dev -w @form-js-designer/designer-tiptap
# → http://localhost:5179/
```
- `editor.commands.insertFormJsBlock(treeSchema)` → viewer 렌더 확인
- 더블클릭 → embedded modal 오픈 → palette + canvas + props panel TreeWidget 확인
- 모달 저장 → TipTap document HTML에 트리 schema 직렬화 확인

#### 라운드트립 (plan §검증 L156)

스키마 JSON 1개로 세 환경 동일 렌더링 확인. 동일한 `tree` 컴포넌트 schema → designer-editor-host에서 만들어 → JSON dump → VS Code preview에 붙여넣기 → TipTap에 붙여넣기 → 셋 다 동일 트리 렌더.

### Spike에서 확보한 hard-won facts (재발견 금지)

1. **Fixture root에 `"type": "default"` 필수.** 누락 시 form-js viewer가 `form field of type <undefined> not supported` 던짐 (`@bpmn-io/form-js-viewer/dist/index.es.js:8690`). Tree와 무관한 form-js의 자체 요구. 모든 신규 fixture (Phase 1A 라운드트립 포함) 작성 시 root에 추가.

2. **Selection 트리거.** form-js editor의 selection은 `selection.toggle(field)` API 또는 실제 native pointerdown/mousedown 이벤트로만 동작. Playwright의 `dispatchEvent('click', ...)` 만으로는 selection.changed 이벤트가 발화되지 않음. visible verify에서 props panel 마운트 확인하려면 test bridge 한 줄 임시 노출 후 원복:
   - `customEditor.ts` mountEditor 안에 `(window as any).__formJsEditor = editorInstance;` 한 줄 추가 → 빌드 → 검증 → `git checkout HEAD -- ` 으로 원복
   - `embeddedDesigner.tsx` 도 동일 패턴 (Vite는 src 직접 → HMR로 즉시 반영)

3. **VS Code dev 인스턴스 visible 캡처.** macOS `screencapture`는 메인 디스플레이만 잡음. VS Code가 다른 space에 뜨면 spike-B-01..03 처럼 빈 캡처 됨. 해결책: `code --extensionDevelopmentPath` 대신 빌드된 번들을 minimal HTML harness에 로드해서 plugin_playwright로 캡처 (Phase 0에서 사용한 패턴).

4. **`Object.freeze([] as unknown[]) as unknown[]`** — 외부 cast 필수 (PropsSchema가 mutable `unknown[]` 기대, `readonly` 거부). Phase 1A의 새 propsSchema 옵션도 동일 패턴 적용.

5. **Phase 0 stub의 TODO 제거.** `tree/index.tsx:28` 의 `// TODO Phase 1A: revisit escapeGridRender + group when recursive editor lands` 주석은 결정 후 제거.

### 작업 흐름 (권장)

superpowers `subagent-driven-development` 스킬로 진행. Phase 1A를 다음 task로 분해 후 implementer에 디스패치:

1. **Task 1: 헬퍼 함수 + vitest** (TDD — 테스트 먼저)
   - `addChildAtPath` / `deleteNodeAtPath` / `updateNodeAtPath` + 가드(id 중복/순환/최대 깊이)
   - 분리 모듈 `treeHelpers.ts` 권장
2. **Task 2: TreeWidget 재귀 UI 교체** (헬퍼 사용)
3. **Task 3: TreeRender 재귀 표시 + 펼침/접힘 + 옵션**
4. **Task 4: propsSchema 옵션 보강 + spec.json 동기화 + TODO 제거**
5. **Task 5: 3환경 visible 검증 + 라운드트립**

각 task implementer 디스패치 후 spec compliance 리뷰 → code quality 리뷰 (subagent-driven-development 스킬 표준 흐름).

### 마무리 (작업 완료 후)

- `docs/designer/features/tree-component/spike-report.md` 의 "다음 단계" 섹션을 완료 표시로 업데이트
- `superpowers:finishing-a-development-branch` 스킬 호출
- PR 생성 (base: develop, head: feat/tree-component)

### 메모리 재확인 (작업 시작 전 한 번)

`/Users/jji/.claude/projects/-Users-jji-project-form-js-designer/memory/MEMORY.md` 의 다음 항목 특히 중요:
- `feedback_e2e_browser_verify` — visible 3환경 의무
- `feedback_use_subagents` — 적극 위임/병렬
- `feedback_superpowers_default_subagent` — plan은 항상 subagent-driven
- `project_vscode_webview_csp` — Ajv lazy-init / process polyfill / Preact alias / no eval
- `project_vscode_preview_morphdom` — 자식 교체 키/data-attr 안정화
- `project_custom_container_contract` — escapeGridRender:false 4조건 (container일 때만)
- `project_npm_only_no_pnpm` — npm canonical
- `feedback_playwright_mcp_env` — plugin_playwright 사용

---

(이 파일은 세션 핸드오프용. 작업 시작 시 읽고, Phase 1A 완료 시 삭제 OK.)


### 예제1
```form-js
{
  "components": [
    {
      "label": "Text field",
      "type": "textfield",
      "layout": {
        "row": "Row_0dqzz7i",
        "columns": null
      },
      "id": "Field_0vnkv9v",
      "key": "textfield_nflkvg"
    }
  ],
  "type": "default",
  "id": "Form_1ymus8m",
  "schemaVersion": 19
}
```
### 예제2

```from-js
{
  "components": [
    {
      "type": "tree",
      "label": "조직도",
      "dataSource": "=[{\"label\":\"대표이사\",\"children\":[{\"label\":\"경영지원본부\",\"children\":[{\"label\":\"인사팀\"},{\"label\":\"재무팀\"}]},{\"label\":\"기술본부\",\"children\":[{\"label\":\"백엔드팀\"},{\"label\":\"프론트엔드팀\"}]}]},{\"label\":\"감사위원회\"}] ",
      "id": "tree1",
      "expandedByDefault": true,
      "showGuides": true
    }
  ],
  "type": "default",
  "id": "Form_175k6gd1",
  "schemaVersion": 19
}
```