# outline-root-node: 아웃라인 가상 루트 노드 - 설계

## 요구사항 확인
- 아웃라인 패널에 "Outline"이라는 가상 루트 노드 하나를 추가하여, 현재 최상위 노드들이 모두 그 아래 자식으로 표시되게 한다.
- 가상 루트는 표시 전용(form schema에는 존재하지 않음). 폼 스키마는 변경하지 않는다.
- 루트 노드는 chevron으로 접고/펼칠 수 있으며(기본 펼침), 클릭 시 no-op(선택 없음).

## 타겟 앱
- **경로**: `packages/designer-editor-host`
- **근거**: 아웃라인 패널이 `packages/designer-editor-host/src/modules/` 내에 존재하는 Preact 컴포넌트임.

## 구현 방향
- `OutlinePanel` 렌더 직전에 가상 루트 노드 wrapping 적용. `schemaToOutline()`은 순수 함수 계약을 유지하며 건드리지 않는다.
- 가상 루트 id는 `__outline_root__`로 고정하여 collapsedIds 충돌 방지.
- `OutlinePanel` 내부에서 `props.nodes`를 가상 루트 단일 노드로 wrap한 뒤 `OutlineNodeItem`에 전달한다. 이렇게 하면 `OutlineModule`(서비스 레이어)이나 `schemaToOutline`(순수 함수)를 수정하지 않아도 된다.
- 가상 루트 행은 별도 클래스(`outline-node--virtual-root`)를 부여하고, `onSelect` 호출 없이 chevron 토글만 동작. `aria-selected`는 생략 또는 `false` 고정.
- 기존 코드에서 레이블이 영문 고정("textfield", "card" 등)이므로 루트 라벨도 영문 "Outline" 사용.

## 파일 계획

**경로 기준:** 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/modules/OutlinePanel.tsx` | 가상 루트 wrap 로직 추가, `OutlineNodeItem` 재사용 | 수정 |
| `packages/designer-editor-host/src/__tests__/OutlinePanel.test.tsx` | 가상 루트 관련 테스트 케이스 추가 | 수정 |

> 이 기능은 UI 전용 컴포넌트 레벨 변경으로, 라우터/메뉴 파일 수정 없이 기존 아웃라인 패널 내에서 완결된다.

## 진입점 (Entry Points)

- **사용자 진입 경로**: 앱 진입(`http://localhost:5173`) → 에디터 로드 → 우측/좌측 패널의 "아웃라인" 패널 확인. 별도 내비게이션 클릭 없이 에디터 초기 화면에서 자동 노출.
- **URL / 라우트**: `http://localhost:5173` (기존 에디터 호스트 단일 페이지 앱, 라우트 없음)
- **수정할 라우터 파일**: 해당 없음(단일 페이지, 라우터 없음). `packages/designer-editor-host/src/App.tsx`에서 OutlineModule 주입 경로를 확인 필요이나 OutlineModule 자체는 수정하지 않음.
- **수정할 메뉴·네비게이션 파일**: 해당 없음(아웃라인 패널은 기존 OutlineModule이 자동 마운트).
- **연결 확인 방법**: E2E에서 드래그·드롭 후 아웃라인 패널에 `data-testid="outline-virtual-root"` 요소가 표시되는지 확인. 기존 `editor.dragdrop.spec.ts`에 아웃라인 루트 노드 검증 스텝 추가.

> **비-페이지 UI 컴포넌트**: OutlinePanel은 에디터 호스트 앱 내 공통 패널 컴포넌트. 상위 페이지는 `packages/designer-editor-host` 단일 앱이며, 기존 `editor.dragdrop.spec.ts` E2E에서 컴포넌트 드롭 후 아웃라인 루트 노드 렌더링을 검증한다.

## 주요 구조

- **`wrapWithVirtualRoot(nodes: OutlineNode[]): OutlineNode`**: `OutlinePanel` 내부 헬퍼. `nodes`가 비어 있으면 빈 children으로 가상 루트 반환. id=`__outline_root__`, type=`''`, label=`'Outline'`, children=nodes.
- **`VirtualRootItem` (또는 `OutlineNodeItem` 특수화)**: 가상 루트 전용 렌더 로직. chevron 토글은 동작, 클릭 시 `onSelect` 호출 없음, `aria-selected` 미포함, CSS 클래스 `outline-node--virtual-root` 부여.
- **`OutlinePanel`** (수정): `nodes` prop을 `wrapWithVirtualRoot()`로 wrap 후 단일 루트 `OutlineNodeItem`을 렌더. 빈 상태 처리(`nodes.length === 0`)는 현재 `'컴포넌트 없음'` 텍스트를 유지하되, 가상 루트 아래 빈 children으로 표시할지 OR 기존 empty 분기를 유지할지 선택 필요(→ 설계 결정 참조).
- **`OutlineNodeItem`** (재사용): depth 계산 기준이 가상 루트 기준으로 1씩 shift됨. 기존 최상위 노드들은 depth=1, 그 자식은 depth=2가 됨.

## 데이터 흐름

`schemaToOutline(schema) → OutlineNode[]` → `wrapWithVirtualRoot(nodes) → OutlineNode` (가상 루트 1개) → `OutlineNodeItem` 재귀 렌더 (depth 0부터 시작, 기존 최상위는 depth=1)

## 설계 결정 (대안이 있는 경우만)

**결정 1: 가상 루트 주입 위치 — OutlinePanel 렌더 직전**
- **결정**: `OutlinePanel` 컴포넌트 내부에서 wrap (서비스/순수함수 레이어 불변)
- **대안 A**: `schemaToOutline()`에서 항상 가상 루트 1개를 반환하도록 수정 → `schemaToOutline` 반환 타입이 `OutlineNode[]`에서 `OutlineNode`(단일)로 바뀌고 기존 모든 테스트를 대규모 수정해야 함
- **대안 B**: `OutlineModule` 서비스에서 `_nodes`를 wrap → UI 레이어가 아닌 서비스 레이어에 시각적 관심사 혼입
- **근거**: UI 표현만 바뀌므로 순수 렌더 함수(OutlinePanel)에 국한. 기존 `schemaToOutline` 테스트 21개와 `OutlineModule` 테스트 17개를 무수정 통과시킬 수 있음.

**결정 2: 빈 상태 처리**
- **결정**: 가상 루트 노드 아래 빈 children으로 표시 (기존 `'컴포넌트 없음'` 분기 제거). 가상 루트는 항상 렌더.
- **대안**: `nodes.length === 0`이면 여전히 `'컴포넌트 없음'` empty 패널 표시
- **근거**: 루트 노드가 항상 표시되는 편이 "트리 구조" 느낌을 더 잘 살리며, 사용자가 드롭 타겟을 인지하는 데 도움. 단, 기존 `OutlinePanel — empty state` 테스트는 수정 필요.

**결정 3: 가상 루트 클릭 동작 — no-op**
- **결정**: 가상 루트 행에서 `onSelect` 콜백을 호출하지 않음 (no-op)
- **대안**: `selection.set(undefined)` 호출로 선택 해제
- **근거**: 요구사항에 "no-op 방향"으로 명시. `formFieldRegistry.get('__outline_root__')`는 항상 `undefined`를 반환하므로 기존 `_handleSelect` 방어 로직과도 자연스럽게 일치함.

## 선행 조건
- `outline-tree-collapsible` feature 완료 (OutlinePanel에 chevron + collapsedIds state 이미 구현됨) — **완료 확인됨**.
- `outline-component-selection` feature 완료 (formFieldRegistry.get + selection.set 계약) — **완료 확인됨**.

## 리스크

- **LOW**: 가상 루트 id `__outline_root__`이 실제 form-js 스키마 필드 id와 충돌할 가능성. form-js는 cuid/uuid 형식 id를 사용하므로 `__` 접두어로 충돌 사실상 없음.
- **LOW**: depth CSS variable이 1씩 증가하므로, 기존 E2E/스냅샷 테스트에서 depth=0 검증이 있으면 depth=1로 재작성 필요. 현재 `OutlinePanel.test.tsx` "depth CSS 변수" 케이스에서 최상위 노드의 `--depth=0` 기대값이 있음 — 가상 루트 wrap 후 최상위 노드는 depth=1이 되므로 해당 테스트 수정 필요.
- **MEDIUM**: `OutlinePanel — empty state` 테스트(`renderPanel({ nodes: [] })` → `'컴포넌트 없음'`)가 빈 상태 처리 결정 변경으로 실패함. 설계 결정 2에서 "항상 가상 루트 표시"로 결정한 경우 해당 테스트를 수정해야 함.

## QA 체크리스트

- [ ] (정상) 컴포넌트가 1개 이상인 스키마 로드 시, 아웃라인 패널 최상위에 "Outline" 레이블 행이 표시된다.
- [ ] (정상) "Outline" 행 왼쪽에 chevron(▾)이 표시되고, 클릭 시 하위 노드들이 접힌다(aria-expanded="false").
- [ ] (정상) 접힌 상태에서 chevron 재클릭 시 하위 노드들이 다시 펼쳐진다(aria-expanded="true").
- [ ] (정상) 초기 상태에서 가상 루트는 펼쳐져 있다(aria-expanded="true").
- [ ] (정상) 가상 루트 행 클릭(chevron 제외 영역) 시 `onSelect`가 호출되지 않는다(no-op).
- [ ] (정상) 기존 최상위 컴포넌트 행 클릭 시 `onSelect(id)`가 정상 호출된다.
- [ ] (정상) 가상 루트 행에 `data-testid="outline-virtual-root"` 속성이 있다.
- [ ] (엣지) 빈 스키마(`components: []`)에서도 "Outline" 루트 노드가 표시되며, children이 없어도 올바르게 렌더된다(또는 기존 empty 분기 유지).
- [ ] (엣지) 기존 최상위 노드들의 `--depth` CSS 변수가 1 (가상 루트 아래 첫 번째 레벨).
- [ ] (정상) 가상 루트 id `__outline_root__`가 `formFieldRegistry.get()`에 없으므로 클릭 시 `selection.set()`이 호출되지 않는다.
- [ ] (통합) 드래그·드롭으로 컴포넌트 추가 후 "Outline" 루트 아래 자식 트리가 올바르게 업데이트된다.
- [ ] (통합) 컴포넌트 선택 시 해당 노드에 `aria-selected="true"`가 표시되고, 가상 루트 행에는 selected 표시 없음.
- [ ] (화면 렌더링) 핵심 UI 요소인 가상 루트 노드가 브라우저에서 실제 표시되고, chevron 클릭으로 트리 접기/펼치기 기본 상호작용이 동작한다.
