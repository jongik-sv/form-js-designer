# Spike Report — tree component Phase 0

**Date:** 2026-04-29
**Branch:** `feat/tree-component`
**Phase 0 commit:** `5aa2c56` (stub) + `0ab62a6` (quality fixes)
**Decision:** **Phase 1A** — props panel 직접 편집 트리 위젯으로 진행 (폴백 1B 불필요)

## Summary

Phase 0 stub은 5개 파일(코어 + 컴포넌트 + 위젯) 변경으로 세 호스트 환경(designer-editor-host playground, VS Code custom editor webview, TipTap embedded modal)에 트리 컴포넌트를 마운트시킴. 합격 기준 모두 충족 → 본 구현(Phase 1A) 진행.

## 합격 기준 매트릭스

| 환경 | 팔레트 노출 | 캔버스 렌더 | Props panel 마운트 | aria-invalid 시그널 | Undo/Redo | 결과 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Spike-A** designer-editor-host | ✅ "트리" | ✅ `dc-tree` JSON | ✅ Nodes textarea (rows=6) | ✅ true/false 토글 | ✅ | **PASS** |
| **Spike-B-1** VS Code markdown preview (read-only) | n/a | ✅ `dc-tree` JSON | n/a | n/a | n/a | **PASS** |
| **Spike-B-2** VS Code custom editor (webview) | ✅ "트리" | ✅ `dc-tree` JSON | ✅ Nodes textarea (rows=6) | (Spike-A 동일 stack) | (form-js native) | **PASS** |
| **Spike-C** TipTap embedded modal | ✅ "트리" | ✅ `dc-tree` JSON | ✅ Nodes textarea (rows=6) | (Spike-A 동일 stack) | (form-js native) | **PASS** |

## 합격 근거

### Spike-A (designer-editor-host)
- `npm run dev` → `localhost:5173` 마운트
- `editor.importSchema(treeSchema)` → 캔버스에 `<div class="dc-tree"><pre>{JSON}</pre></div>` 렌더
- `selection.toggle(treeField)` → Properties 패널에 트리 아이콘 + 「권한 트리」 헤더 + i18n Label + Nodes textarea(JSON.stringify pretty-print) 마운트
- textarea에 `[ this is not json` 입력 → `aria-invalid="true"`
- `{"foo":"bar"}` (객체) 입력 → `aria-invalid="true"` (배열 아님)
- `[{"id":"new","label":"새 노드"}]` 입력 → `aria-invalid="false"`, schema 즉시 반영 (`saveSchema().components[0].nodes`)
- `commandStack.undo()` / `redo()` 동작 확인
- 증거: `spike-evidence/spike-A-01..05.png`

### Spike-B-1 (VS Code markdown preview)
- 빌드된 `dist/webview/preview.js`를 minimal HTML harness에서 직접 로드
- 처음 시도 시 에러 발생: `⚠ Invalid form-js schema — form field of type <undefined> not supported`
  - **원인**: fixture root 스키마에 `"type": "default"` 누락 (form-js `FieldFactory.create({type})`가 `undefined` 받음)
  - **단순 textfield-only 스키마로도 재현됨** → tree와 무관, fixture 작성 규칙 이슈
  - **해결**: `tree-spike.md` fixture에 `"type": "default"` 추가 → 정상 마운트
- 증거: `spike-evidence/spike-B-04-preview-bundle-tree.png`

### Spike-B-2 (VS Code custom editor webview)
- 빌드된 `dist/webview/customEditor.js` IIFE를 harness에서 로드 + `edit-opened` 메시지로 mountEditor 트리거
- 임시 test-bridge(`window.__formJsEditor = editorInstance;`)를 한 번 노출하여 selection 시뮬레이션 후 원복
- `EDITOR_MODULES = [DesignerContainerModule, customComponentsModule, PropsPanelModule, LayoutHeightModule, OutlineModule]` — `customComponentsModule`이 `DesignerComponentsModule`을 확장하여 자동으로 TreeComponent 포함
- `BUILTIN_WIDGETS`에 `tree: TreeWidget` 등록되어 propsSchemaToPanel가 인식
- esbuild IIFE 트리쉐이킹 우려 → 번들 grep으로 `TreeWidget`(L76880) `dc-tree` 모두 보존 확인
- CSP-safe (eval/new Function 없음) — `JSON.parse`만 사용
- 증거: `spike-evidence/spike-B-05-customEditor-tree-selected.png`

### Spike-C (TipTap embedded modal)
- `npm run dev -w designer-tiptap` → `localhost:5179` vanilla-host 데모
- `editor.commands.insertFormJsBlock(treeSchema)` → TipTap NodeView가 read-only viewer로 트리 렌더 (createForm)
- 더블클릭 → `mountEmbeddedEditorModal` 호출 → `.fjd-embedded-designer-root` 모달 오픈
- 모달에 form-js editor + 동일 모듈 스택 (DesignerContainerModule, DesignerComponentsModule, PaletteModule, OutlineModule, MarqueeModule, ShortcutModule, **PropsPanelModule**, ...) 마운트
- 임시 test-bridge로 selection 시뮬레이션 → Nodes textarea 마운트 확인
- 증거: `spike-evidence/spike-C-02..04.png`

## 미지수 해소

플랜 §Feasibility의 잔존 미지수 3건 모두 해소:

1. **`propsSchemaToPanel` → `panelEntryAdapter`가 임의 위젯의 reactive UI를 form-js 네이티브 entry로 통과**: 세 환경 모두에서 textarea 정상 마운트 + onInput 이벤트로 schema 즉시 반영 확인.
2. **VS Code customEditor의 `EDITOR_MODULES`가 host의 `PropsPanelModule` 포함**: `customEditor.ts:61-67` 직접 import. customComponentsModule도 `customEditor.ts:19` import + DesignerComponentsModule extend. **추가 작업 불필요**.
3. **esbuild IIFE 번들에서 `createDefaultRegistry` / Preact compat 충돌**: 번들에 TreeWidget 보존됨. `void h;` 패턴 유지. CSP `unsafe-eval` 없음. 충돌 없음.

## Phase 1A로 가져갈 발견사항

- **fixture 규칙**: 모든 `.form-js-block` 코드블록 fixture에 `"type": "default"`를 root에 추가해야 함. 기존 fixture(`single-block.md` 등)는 이미 동작했지만 신규 fixture 작성 시 누락 빈번 가능성.
- **selection 트리거**: form-js editor의 selection은 `selection.toggle(field)` 또는 native mousedown/click 핸들러를 거쳐야 한다. DOM `dispatchEvent('click')`만으로는 불충분 (Spike-B/C에서 직접 확인).
- **Phase 1A 시작 시점에 정해야 할 것**:
  - `escapeGridRender: true` (현재) vs `false` — 트리가 grid row를 차지할지. 메모리 `project_custom_container_contract.md`에 따라 container-shaped면 false 필요. 현재는 stub `<pre>`라 영향 없음.
  - `group: 'presentation'` (현재) vs `'container'` — 의미적 분류. 둘 다 plan에 명시 안 됨.
  - 위 둘에 대한 결정은 `tree/index.tsx:28`의 TODO 주석 참조 (commit `0ab62a6`).

## 다음 단계 (Phase 1A 본 구현)

플랜 §Phase 1A에 따라:
1. `TreeWidget.tsx` stub → 실 재귀 트리 편집 UI 교체
   - depth 표시, [+자식][삭제][이름 inline edit][+ 루트 추가]
   - 가드: id 중복/순환/최대 깊이
   - 순수 헬퍼 (`addChildAtPath`/`deleteNodeAtPath`/`updateNodeAtPath`) — vitest 단위 테스트
2. `TreeRender` 완성 — viewer에서 실 재귀 표시 + 펼침/접힘 (사용자 편집 X)
3. read-only 환경(VS Code preview, TipTap viewer) 회귀 검증
4. `escapeGridRender` / `group` 결정 + TODO 제거
