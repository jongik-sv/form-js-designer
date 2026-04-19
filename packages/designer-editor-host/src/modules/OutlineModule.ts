import { h, render } from 'preact';
import { OutlinePanel } from './OutlinePanel';
import { schemaToOutline } from './schemaToOutline';
import { deepCloneWithNewIds, generateId, collectKeys } from './outlineUtils';
import type { OutlineNode, DropPosition } from './outlineTypes';
import type { FieldSchema } from './outlineUtils';

export interface FormJsEventBus {
  on(event: string, callback: (event?: unknown) => void): void;
  off(event: string, callback: (event?: unknown) => void): void;
}

export interface FormJsFormEditor {
  getSchema(): unknown;
}

export interface FormJsSelection {
  get(): { id?: string } | null;
  set(element: unknown): void;
  toggle(element: unknown): void;
}

export interface FormJsFormFieldRegistry {
  get(id: string): unknown;
}

/** form-js modeling 서비스 인터페이스 (필요한 메서드만 선언) */
export interface FormJsModeling {
  /**
   * formField를 이동한다.
   * 시그니처: moveFormField(formField, sourceFormField, targetFormField, sourceIndex, targetIndex, sourceRow, targetRow)
   * sourceRow: 드래그 필드의 현재 row 객체 (formLayouter.getRowForField)
   * targetRow: null → 새 row(단일 컬럼) 정책
   */
  moveFormField(
    formField: unknown,
    sourceFormField: unknown,
    targetFormField: unknown,
    sourceIndex: number,
    targetIndex: number,
    sourceRow: unknown,
    targetRow: null,
  ): void;
  /**
   * formField를 추가한다.
   * 시그니처: addFormField(attrs, targetFormField, targetIndex)
   */
  addFormField(attrs: unknown, targetFormField: unknown, targetIndex: number): void;
}

/** form-js formLayouter 서비스 인터페이스 */
export interface FormJsFormLayouter {
  /** 필드가 속한 row 객체를 반환. row가 없으면 undefined/null */
  getRowForField(formField: unknown): unknown;
}

/** form-js formField 내부 구조
 * form-js v1+: `_parent`는 부모 ID 문자열. `parent`는 테스트 mock용 객체 참조.
 * 실제 부모 객체는 formFieldRegistry.get(_parent)로 조회해야 함.
 */
interface InternalFormField {
  id: string;
  type: string;
  /** form-js 런타임: 부모 ID 문자열 */
  _parent?: string;
  /** 테스트 mock: 부모 객체 직접 참조 */
  parent?: InternalFormField;
  components?: InternalFormField[];
  [key: string]: unknown;
}

/** 컨테이너 타입 (inside 드롭 허용 대상 — tabs 제외) */
const CONTAINER_TYPES = new Set(['card', 'stack', 'modal', 'tabPanel']);

/** inside 드롭이 비활성화된 컨테이너 타입 (tabs: 2단계 구조 특수 케이스) */
const DISABLED_INSIDE_TYPES = new Set(['tabs']);

class OutlinePanelService {
  _container: HTMLElement | null = null;
  _nodes: OutlineNode[] = [];
  _selectedIds: string[] = [];
  /** import.done 시에만 증가. OutlinePanel key prop으로 전달하여 state 리셋. */
  _schemaVersion: number = 0;
  /** in-memory 클립보드: 복사된 FieldSchema 스냅샷 (deep clone with new ids) */
  _clipboard: FieldSchema | null = null;
  /**
   * additive 클릭 직후 동기적으로 form-js가 발화하는 selection.changed 이벤트가
   * _selectedIds를 단일 id로 덮어쓰지 않도록 한 번만 skip 하는 가드.
   */
  private _skipNextSelectionOverwrite = false;

  _eventBus: FormJsEventBus;
  _formEditor: FormJsFormEditor;
  _formFieldRegistry: FormJsFormFieldRegistry;
  _selection: FormJsSelection;
  _modeling: FormJsModeling;
  _formLayouter: FormJsFormLayouter;
  _commandStack: unknown | null = null;

  private _boundOnImportDone: () => void;
  private _boundOnChanged: () => void;
  private _boundOnSelectionChanged: (event: unknown) => void;
  private _boundOnCanvasClickCapture: (e: MouseEvent) => void;
  /** form-js context-pad(삭제 버튼 영역) 감시 — 복제 버튼 주입용 */
  private _contextPadObserver: MutationObserver | null = null;

  static inject = ['eventBus', 'formEditor', 'formFieldRegistry', 'selection', 'modeling', 'formLayouter', 'commandStack'];

  constructor(
    eventBus: FormJsEventBus,
    formEditor: FormJsFormEditor,
    formFieldRegistry: FormJsFormFieldRegistry,
    selection: FormJsSelection,
    modeling: FormJsModeling,
    formLayouter: FormJsFormLayouter,
    commandStack?: unknown,
  ) {
    this._eventBus = eventBus;
    this._formEditor = formEditor;
    this._formFieldRegistry = formFieldRegistry;
    this._selection = selection;
    this._modeling = modeling;
    this._formLayouter = formLayouter;
    this._commandStack = commandStack || null;

    this._boundOnImportDone = () => this._onImportDone();
    this._boundOnChanged = () => this._onChanged();
    this._boundOnSelectionChanged = (event: unknown) => this._onSelectionChanged(event);
    this._boundOnCanvasClickCapture = (e: MouseEvent) => this._onCanvasClickCapture(e);

    eventBus.on('import.done', this._boundOnImportDone);
    eventBus.on('commandStack.changed', this._boundOnChanged);
    eventBus.on('selection.changed', this._boundOnSelectionChanged);

    if (typeof document !== 'undefined') {
      document.addEventListener('click', this._boundOnCanvasClickCapture, true);
    }

    this._startContextPadObserver();
  }

  private _render() {
    this._syncCanvasSelectionMarks();
    if (!this._container) return;
    render(
      h(OutlinePanel, {
        key: this._schemaVersion,
        nodes: this._nodes,
        selectedIds: this._selectedIds,
        onSelect: (id: string, opts?: { additive?: boolean }) =>
          this._handleSelect(id, opts),
        onDrop: (dragId: string, targetId: string, position: DropPosition) =>
          this._handleDrop(dragId, targetId, position),
        onDropMulti: (dragIds: string[], targetId: string, position: DropPosition) =>
          this._handleMultiDrop(dragIds, targetId, position),
        onCopy: (id: string) => this._handleCopy(id),
        onPaste: () => this._handlePaste(),
      }),
      this._container,
    );
  }

  /**
   * 캔버스 DOM에 data-outline-multi-selected 속성을 동기화한다.
   * form-js는 기본적으로 단일 선택(.fjs-editor-selected)만 CSS로 표시하므로,
   * 멀티 선택된 보조 필드를 같은 스타일로 강조하기 위한 마킹.
   */
  private _syncCanvasSelectionMarks() {
    if (typeof document === 'undefined') return;
    const marked = document.querySelectorAll('[data-outline-multi-selected]');
    marked.forEach((el) => el.removeAttribute('data-outline-multi-selected'));
    if (this._selectedIds.length < 2) return;
    for (const id of this._selectedIds) {
      const el = document.querySelector(
        `.fjs-editor-container [data-id="${CSS.escape(id)}"]`,
      );
      if (el instanceof HTMLElement) {
        el.setAttribute('data-outline-multi-selected', 'true');
      }
    }
  }

  /**
   * formField의 부모 InternalFormField를 가져오는 헬퍼.
   * - 런타임: field._parent는 부모 ID 문자열 → formFieldRegistry.get()으로 조회
   * - 테스트 mock: field.parent는 부모 객체 직접 참조
   */
  private _getParent(field: InternalFormField): InternalFormField | undefined {
    // 런타임 form-js: _parent는 string ID
    if (typeof field._parent === 'string') {
      return this._formFieldRegistry.get(field._parent) as InternalFormField | undefined;
    }
    // 테스트 mock: parent는 객체
    return field.parent;
  }

  _handleSelect(id: string, opts?: { additive?: boolean }) {
    // id가 스키마에 없는 엣지 케이스는 no-op
    const formField = this._formFieldRegistry.get(id);
    if (!formField) return;

    if (opts?.additive) {
      this._toggleSelectedId(id);
      // form-js selection은 마지막 클릭 필드를 primary로 유지 (props-panel 표시용).
      // 뒤따르는 selection.changed가 _selectedIds를 덮어쓰지 않도록 가드.
      this._skipNextSelectionOverwrite = true;
      this._selection.set(formField);
      this._render();
      return;
    }

    this._selection.set(formField);
  }

  /** _selectedIds 배열에 id가 있으면 제거, 없으면 추가 (토글). */
  private _toggleSelectedId(id: string) {
    const idx = this._selectedIds.indexOf(id);
    if (idx >= 0) {
      this._selectedIds = this._selectedIds.filter((x) => x !== id);
    } else {
      this._selectedIds = [...this._selectedIds, id];
    }
  }

  /**
   * 캔버스 클릭 capture-phase 핸들러.
   * shift/ctrl/meta 모디파이어가 눌린 상태에서 form-js 필드 DOM을 클릭한 경우
   * _selectedIds에 토글한다. 이벤트 전파는 막지 않아 form-js의 기본 selection
   * (마지막 클릭 필드 = primary)은 그대로 동작한다.
   * 뒤따르는 selection.changed가 _selectedIds를 덮어쓰지 않도록 가드 플래그를 올린다.
   */
  private _onCanvasClickCapture(e: MouseEvent) {
    if (!(e.shiftKey || e.ctrlKey || e.metaKey)) return;
    const target = e.target as HTMLElement | null;
    if (!target || typeof target.closest !== 'function') return;

    // 아웃라인 패널 내부 클릭은 OutlinePanel 자체 핸들러가 처리하므로 제외
    if (target.closest('.outline-panel')) return;

    // form-js 에디터 캔버스 내부의 [data-id] 필드만 대상
    const canvas = target.closest('.fjs-editor-container');
    if (!canvas) return;
    const fieldEl = target.closest('[data-id]') as HTMLElement | null;
    if (!fieldEl) return;
    const id = fieldEl.getAttribute('data-id');
    if (!id) return;

    this._toggleSelectedId(id);
    this._skipNextSelectionOverwrite = true;
    // render는 selection.changed 핸들러 또는 여기서 한 번 — 가드 덕분에 중복 overwrite 없음
    this._render();
  }

  /**
   * 현재 멀티 선택된 모든 필드를 일괄 삭제.
   * - 부모 연쇄에 이미 선택된 ancestor가 있는 하위 노드는 제외(이중 삭제 방지)
   * - 각 필드의 현재 인덱스를 매 루프 새로 조회 (선행 삭제로 형제 index 이동)
   * ShortcutModule(Delete 키)에서 호출한다.
   */
  deleteSelectedFields() {
    const ids = [...this._selectedIds];
    console.log('[deleteSelectedFields] called with ids:', ids);
    if (ids.length === 0) return;

    const modeling = this._modeling as unknown as {
      removeFormField?: (field: unknown, parent: unknown, idx: number) => void;
    };
    console.log('[deleteSelectedFields] modeling.removeFormField type:', typeof modeling.removeFormField);
    if (typeof modeling.removeFormField !== 'function') return;

    const selectedSet = new Set(ids);

    // Batch execution: 모든 deletion을 한 번의 undo/redo 원자로 처리
    // 생성할 제거 작업 목록 준비
    const toRemove: Array<{ field: InternalFormField; parent: InternalFormField; idx: number }> = [];

    for (const id of ids) {
      const field = this._formFieldRegistry.get(id) as InternalFormField | undefined;
      console.log('[deleteSelectedFields] id:', id, 'field:', !!field, '_parent:', field?._parent, 'parent:', !!field?.parent);
      if (!field) continue;
      // 루트(type=default)는 삭제 불가
      if (!field._parent && !field.parent) continue;
      if (this._hasAncestorInSet(field, selectedSet)) continue;

      const parent = this._getParent(field);
      const idx = parent ? this._findIndexInParent(parent, field.id) : -1;
      console.log('[deleteSelectedFields] parent:', !!parent, 'idx:', idx);
      if (!parent) continue;
      if (idx === -1) continue;

      toRemove.push({ field, parent, idx });
    }

    console.log('[deleteSelectedFields] toRemove.length:', toRemove.length);
    // 없을 경우 early return
    if (toRemove.length === 0) {
      this._selectedIds = [];
      this._render();
      return;
    }

    // 배치 실행: 모든 removal을 원자적으로 처리
    // commandStack.changed 리스너를 잠시 제거하고 모든 삭제를 수행한 후
    // 리스너를 다시 등록하고 한 번만 이벤트를 발화하여 undo/redo 원자화
    this._eventBus.off('commandStack.changed', this._boundOnChanged);

    for (const { field, parent, idx } of toRemove) {
      modeling.removeFormField(field, parent, idx);
    }

    // 리스너 재등록
    this._eventBus.on('commandStack.changed', this._boundOnChanged);

    this._selectedIds = [];
    this._render();
  }

  /** 외부에서 현재 선택 집합을 읽기 위한 접근자. */
  getSelectedIds(): string[] {
    return [...this._selectedIds];
  }

  /**
   * 외부(ShortcutModule Ctrl+A, MarqueeModule)에서 선택 집합을 일괄 지정.
   * form-js selection은 건드리지 않고 _selectedIds만 교체 후 render.
   *
   * @param ids - 새 선택 id 배열
   * @param opts.additive - true면 기존 _selectedIds와 union; false(기본)면 교체
   */
  setSelectedIds(ids: string[], opts?: { additive?: boolean }) {
    if (opts?.additive) {
      // 기존 선택과 union (중복 제거)
      const combined = new Set([...this._selectedIds, ...ids]);
      this._selectedIds = [...combined];
    } else {
      this._selectedIds = [...ids];
    }
    this._render();
  }

  /**
   * 선택 해제 공개 API (ShortcutModule Escape에서 호출).
   * _selectedIds를 비우고 form-js selection도 해제한다.
   */
  clearSelection() {
    this._selectedIds = [];
    // form-js selection 해제: clear() 메서드가 있으면 호출, 없으면 set(null)
    const sel = this._selection as unknown as { clear?: () => void };
    if (typeof sel.clear === 'function') {
      sel.clear();
    } else {
      this._selection.set(null);
    }
    this._render();
  }

  /**
   * DnD 드롭 핸들러.
   * dragId → targetId 위치(position)로 form-js modeling.moveFormField 호출.
   * - sourceIndex: dragField의 부모 components 내 실제 인덱스
   * - sourceRow: formLayouter.getRowForField(dragField) — row 레이아웃 복원용
   * - targetRow: null → form-js가 새 row(단일 컬럼)로 배정
   * - tabs 타입 inside 드롭은 비활성화 (HIGH 리스크 §2: 2단계 구조 특수 케이스)
   * - self-drop(dragId === targetId)는 no-op
   */
  _handleDrop(dragId: string, targetId: string, position: DropPosition) {
    if (dragId === targetId) return;

    const dragField = this._formFieldRegistry.get(dragId) as InternalFormField | undefined;
    const targetField = this._formFieldRegistry.get(targetId) as InternalFormField | undefined;
    if (!dragField || !targetField) return;

    if (position === 'inside' && DISABLED_INSIDE_TYPES.has(targetField.type)) return;

    const dragParent = this._getParent(dragField);
    if (!dragParent) return;

    const sourceIndex = this._findIndexInParent(dragParent, dragField.id);
    if (sourceIndex === -1) return;

    const sourceRow = this._formLayouter.getRowForField(dragField);

    if (position === 'inside') {
      this._moveInside(dragField, dragParent, targetField, sourceIndex, sourceRow);
    } else {
      this._moveBeforeOrAfter(dragField, dragParent, targetField, sourceIndex, sourceRow, position);
    }
  }

  /** inside 드롭: 대상 컨테이너의 마지막 위치로 이동 */
  private _moveInside(
    dragField: InternalFormField,
    dragParent: InternalFormField,
    targetContainer: InternalFormField,
    sourceIndex: number,
    sourceRow: unknown,
  ) {
    const targetIndex = Array.isArray(targetContainer.components)
      ? targetContainer.components.length
      : 0;

    this._modeling.moveFormField(
      dragField,
      dragParent,
      targetContainer,
      sourceIndex,
      targetIndex,
      sourceRow,
      null,
    );
  }

  /** before / after 드롭: 대상 노드 부모에서 삽입 인덱스 계산 후 이동 */
  private _moveBeforeOrAfter(
    dragField: InternalFormField,
    dragParent: InternalFormField,
    targetField: InternalFormField,
    sourceIndex: number,
    sourceRow: unknown,
    position: 'before' | 'after',
  ) {
    const targetParent = this._getParent(targetField);
    if (!targetParent) return;

    const targetIdx = this._findIndexInParent(targetParent, targetField.id);
    if (targetIdx === -1) return;

    const insertIndex = position === 'before' ? targetIdx : targetIdx + 1;

    this._modeling.moveFormField(
      dragField,
      dragParent,
      targetParent,
      sourceIndex,
      insertIndex,
      sourceRow,
      null,
    );
  }

  /** 부모 components 배열에서 id로 인덱스를 찾는 헬퍼 */
  private _findIndexInParent(parent: InternalFormField, childId: string): number {
    const siblings = Array.isArray(parent.components) ? parent.components : [];
    return siblings.findIndex((c) => c.id === childId);
  }

  /**
   * 조상 체인에 idSet 내 id가 하나라도 있으면 true를 반환.
   * deleteSelectedFields · duplicateSelectedFields · _handleMultiDrop에서 공유하는
   * "ancestor 제외" 판정 로직을 통합한 헬퍼.
   */
  private _hasAncestorInSet(
    field: InternalFormField | undefined,
    idSet: Set<string>,
  ): boolean {
    let cur = field ? this._getParent(field) : undefined;
    while (cur) {
      if (cur.id && idSet.has(cur.id)) return true;
      cur = this._getParent(cur);
    }
    return false;
  }

  /**
   * attrs 객체에서 layout.row 속성을 제거하고 수정된 attrs를 반환.
   * 세로 복제(_duplicateFieldVertical) · 일괄 복제(duplicateSelectedFields) 모두
   * 새 row에 배치하므로 동일한 제거 로직을 공유한다.
   */
  private static _stripLayoutRow(attrs: Record<string, unknown>): Record<string, unknown> {
    if (attrs.layout && typeof attrs.layout === 'object') {
      const layout = { ...(attrs.layout as Record<string, unknown>) };
      delete layout['row'];
      return { ...attrs, layout };
    }
    return attrs;
  }

  /**
   * 복사 핸들러: formField를 deep clone(새 ID 포함)하여 in-memory 클립보드에 저장.
   */
  _handleCopy(id: string) {
    if (!id) return;
    const formField = this._formFieldRegistry.get(id) as FieldSchema | undefined;
    if (!formField) return;

    this._clipboard = deepCloneWithNewIds(formField);
  }

  /**
   * 붙여넣기 핸들러: 클립보드 내용을 현재 선택 노드의 부모 또는 루트에 삽입.
   * 매 paste마다 클립보드를 deep clone → 새 id로 삽입(여러 번 paste 가능).
   */
  _handlePaste() {
    if (!this._clipboard) return;

    // 현재 스키마의 모든 key를 수집해 paste 시 바인딩 경로 충돌 방지
    // form-js data field의 key는 유일해야 함 (그렇지 않으면 addFormField가 'already claimed'로 reject)
    const schema = this._formEditor.getSchema() as FieldSchema | null | undefined;
    const existingKeys = schema ? collectKeys(schema) : new Set<string>();

    // 매 paste마다 새 id · 새 key 재생성
    const attrs = deepCloneWithNewIds(this._clipboard, existingKeys);

    // 현재 선택된 노드의 부모를 target으로 사용
    let targetParent: InternalFormField | null = null;
    let targetIndex = 0;

    if (this._selectedIds.length > 0) {
      const selectedId = this._selectedIds[0]!;
      const selectedField = this._formFieldRegistry.get(selectedId) as InternalFormField | undefined;
      const selectedParent = selectedField ? this._getParent(selectedField) : undefined;
      if (selectedParent) {
        targetParent = selectedParent;
        const siblings = Array.isArray(targetParent.components) ? targetParent.components : [];
        const selIdx = siblings.findIndex((c) => c.id === selectedId);
        targetIndex = selIdx !== -1 ? selIdx + 1 : siblings.length;
      }
    }

    // targetParent가 없으면 스키마 루트(type=default)를 target으로 사용
    // getSchema()는 raw JSON이므로 formFieldRegistry에서 internal formField를 가져와야 함
    if (!targetParent) {
      const schema = this._formEditor.getSchema() as { id?: string; components?: unknown[] } | null | undefined;
      if (!schema?.id) return;
      const rootField = this._formFieldRegistry.get(schema.id) as InternalFormField | undefined;
      if (!rootField) return;
      targetParent = rootField;
      targetIndex = Array.isArray(rootField.components) ? rootField.components.length : 0;
    }

    this._modeling.addFormField(attrs, targetParent, targetIndex);
  }

  /**
   * 방향 복제 공통 준비 헬퍼.
   * - formFieldRegistry에서 field 조회 → 부모 조회 → existingKeys 수집 → deep clone 생성 → insertIdx 계산
   * - null 반환 시 호출자는 no-op으로 처리한다.
   */
  private _prepareDuplicateAttrs(
    id: string,
  ): { attrs: Record<string, unknown>; parent: InternalFormField; insertIdx: number; field: InternalFormField } | null {
    if (!id) return null;
    const field = this._formFieldRegistry.get(id) as InternalFormField | undefined;
    if (!field) return null;

    const parent = this._getParent(field);
    if (!parent) return null;

    const schema = this._formEditor.getSchema() as FieldSchema | null | undefined;
    const existingKeys = schema ? collectKeys(schema) : new Set<string>();

    const attrs = deepCloneWithNewIds(field as unknown as FieldSchema, existingKeys) as Record<string, unknown>;

    const siblings = Array.isArray(parent.components) ? parent.components : [];
    const idx = siblings.findIndex((c) => c.id === id);
    const insertIdx = idx === -1 ? siblings.length : idx + 1;

    return { attrs, parent, insertIdx, field };
  }

  /**
   * 필드 세로 복제 공개 API — ShortcutModule(Insert 키) 에서 호출.
   * 내부 구현은 _duplicateFieldVertical 와 동일.
   */
  duplicateField(id: string) {
    this._duplicateFieldVertical(id);
  }

  /**
   * 현재 멀티 선택된 모든 필드를 일괄 복제.
   * - 부모 연쇄에 이미 선택된 ancestor가 있는 하위 노드는 제외(ancestor가 복제 시 자식도 복제됨)
   * - 형제 순서 유지: 각 필드의 부모 components 배열 내 index 오름차순으로 정렬
   * - existingKeys는 루프 외부에서 1회 수집 → 복제본 간 key 상호 충돌 방지
   * - 복제 완료 후 신규 복제본 id 집합으로 _selectedIds 교체
   * ShortcutModule(Insert 키 멀티 선택 시)에서 호출한다.
   */
  duplicateSelectedFields() {
    const ids = [...this._selectedIds];
    if (ids.length === 0) return;

    // ancestor 필터링
    const selectedSet = new Set(ids);

    // 대상 필드 목록 수집 (ancestor 제외)
    const toProcess: Array<{ field: InternalFormField; parent: InternalFormField; idx: number }> = [];
    for (const id of ids) {
      const field = this._formFieldRegistry.get(id) as InternalFormField | undefined;
      if (!field) continue;
      if (!field._parent && !field.parent) continue; // 루트 제외
      if (this._hasAncestorInSet(field, selectedSet)) continue;
      const parent = this._getParent(field);
      if (!parent) continue;
      const idx = this._findIndexInParent(parent, field.id);
      if (idx === -1) continue;
      toProcess.push({ field, parent, idx });
    }

    if (toProcess.length === 0) return;

    // 형제 순서 유지: 부모별 idx 오름차순 정렬
    toProcess.sort((a, b) => a.idx - b.idx);

    // existingKeys 1회 수집 (복제본 간 key 상호 충돌 방지)
    const schema = this._formEditor.getSchema() as FieldSchema | null | undefined;
    const existingKeys = schema ? collectKeys(schema) : new Set<string>();

    // 뒤에서부터 삽입 → 앞 필드의 삽입이 뒤 필드의 insertIdx를 밀지 않도록
    // 역순으로 처리하되 newIds는 원래 순서(오름차순 원본 idx 기준)로 수집
    const orderedByDesc = [...toProcess].reverse();
    const newIdsReversed: string[] = [];

    for (const { field, parent, idx } of orderedByDesc) {
      const attrs = OutlinePanelService._stripLayoutRow(
        deepCloneWithNewIds(field as unknown as FieldSchema, existingKeys) as Record<string, unknown>,
      );
      const insertIdx = idx + 1;
      this._modeling.addFormField(attrs, parent, insertIdx);
      newIdsReversed.push((attrs as { id?: string }).id ?? '');
    }

    // 원래 오름차순 순서로 복원
    const newIds = newIdsReversed.reverse().filter(Boolean);

    this._selectedIds = newIds;
    this._render();
  }

  /**
   * 멀티 DnD 이동 처리.
   * - dragIds 중 targetId가 포함(self-drop)이면 no-op
   * - target이 dragIds 중 하나의 후손이면 no-op
   * - tabs inside 드롭 비활성화
   * - 형제 순서 유지: 각 필드의 부모 components 배열 내 index 오름차순으로 정렬
   */
  _handleMultiDrop(dragIds: string[], targetId: string, position: DropPosition) {
    // self-drop no-op
    if (dragIds.includes(targetId)) return;

    const targetField = this._formFieldRegistry.get(targetId) as InternalFormField | undefined;
    if (!targetField) return;

    // tabs inside drop 비활성화
    if (position === 'inside' && DISABLED_INSIDE_TYPES.has(targetField.type)) return;

    const dragIdsSet = new Set(dragIds);

    // target이 드래그 집합 중 하나의 후손인지 확인
    if (this._hasAncestorInSet(targetField, dragIdsSet)) return;

    // 대상 필드 목록 수집 (존재하지 않거나 루트인 것 제외)
    const toMove: Array<{ field: InternalFormField; parent: InternalFormField; idx: number }> = [];
    for (const id of dragIds) {
      const field = this._formFieldRegistry.get(id) as InternalFormField | undefined;
      if (!field) continue;
      if (!field._parent && !field.parent) continue; // 루트 제외
      const parent = this._getParent(field);
      if (!parent) continue;
      const idx = this._findIndexInParent(parent, field.id);
      if (idx === -1) continue;
      toMove.push({ field, parent, idx });
    }

    if (toMove.length === 0) return;

    // 형제 순서 유지: idx 오름차순
    toMove.sort((a, b) => a.idx - b.idx);

    // 이동 순서:
    // - before/inside: 위에서 아래 순서(오름차순 idx)로 이동 → 각 이동 전 현재 idx 재조회
    // - after: 아래에서 위 순서(내림차순 idx)로 이동 → 선행 이동이 뒤쪽에 영향 없음
    const orderedToMove = position === 'after' ? [...toMove].reverse() : toMove;

    for (const { field } of orderedToMove) {
      // 매 iteration 전 현재 index 재조회 (선행 이동으로 index 이동)
      const currentParent = this._getParent(field);
      if (!currentParent) continue;
      const currentIdx = this._findIndexInParent(currentParent, field.id);
      if (currentIdx === -1) continue;

      const sourceRow = this._formLayouter.getRowForField(field);

      if (position === 'inside') {
        this._moveInside(field, currentParent, targetField, currentIdx, sourceRow);
      } else {
        this._moveBeforeOrAfter(field, currentParent, targetField, currentIdx, sourceRow, position);
      }
    }
  }


  /**
   * 필드 세로 복제: form-js context-pad "세로로 복사" 버튼에서 호출.
   * - 원본 필드의 바로 다음 형제 위치에 deep clone을 삽입 (새 row)
   * - 기존 _duplicateField와 동일 동작 (rename)
   * - key 충돌은 스키마 전체 key 수집 → baseKey_copy / _copy_2 … 패턴으로 회피
   */
  _duplicateFieldVertical(id: string) {
    const prepared = this._prepareDuplicateAttrs(id);
    if (!prepared) return;

    const { attrs, parent, insertIdx } = prepared;

    // 세로 복사: 새 row에 배치해야 하므로 clone된 layout.row를 제거
    // (deepCloneWithNewIds는 layout 속성을 그대로 복사하므로 원본 row ID가 유지됨)
    this._modeling.addFormField(
      OutlinePanelService._stripLayoutRow(attrs),
      parent,
      insertIdx,
    );
  }

  /**
   * 필드 가로 복제: form-js context-pad "행으로 복사" 버튼에서 호출.
   * - 원본 필드와 동일한 row에 복제본 삽입 (layout.row 주입)
   * - getRowForField가 null 반환 시 세로 복사로 fallback
   */
  _duplicateFieldHorizontal(id: string) {
    const prepared = this._prepareDuplicateAttrs(id);
    if (!prepared) return;

    const { attrs, parent, insertIdx, field } = prepared;
    const sourceRow = this._formLayouter.getRowForField(field) as { id?: string } | null | undefined;

    if (sourceRow?.id) {
      // layout.row를 원본과 동일하게 지정 → form-js가 동일 row에 배치
      attrs.layout = {
        ...((attrs.layout as Record<string, unknown>) ?? {}),
        row: sourceRow.id,
      };
    }
    // sourceRow 없으면 layout.row 없이 addFormField (새 row = vertical fallback)

    this._modeling.addFormField(attrs, parent, insertIdx);
  }

  /** context-pad "가로 복제" 버튼 SVG (columns 모양, 화살표 → 방향) */
  private static readonly _COPY_ROW_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1"/><path d="M7 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  /** context-pad "세로 복제" 버튼 SVG (rows 모양, 아래 화살표) */
  private static readonly _COPY_VERTICAL_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="10" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1"/><path d="M8 7v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  /**
   * form-js가 렌더링한 context-pad에 "가로 복사"·"세로 복사" 버튼 2개를 주입한다.
   * 기존 단일 _injectDuplicateButton 교체. guard: [data-outline-duplicate-h] 존재 시 skip.
   */
  _injectDuplicateButtons(pad: HTMLElement) {
    if (pad.querySelector('[data-outline-duplicate-h]')) return;

    // 부모 .fjs-element[data-id]에서 필드 id 추출
    const fieldEl = pad.closest('[data-id]') as HTMLElement | null;
    const fieldId = fieldEl?.dataset.id;
    if (!fieldId) return;

    // 로컬 버튼 생성 헬퍼: 반복되는 button 태그 생성·속성·이벤트 부착을 1회 정의
    const makeBtn = (dataAttr: string, title: string, svg: string, onClick: () => void) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fjs-context-pad-item';
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.setAttribute(dataAttr, 'true');
      btn.innerHTML = svg;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
      return btn;
    };

    const hBtn = makeBtn(
      'data-outline-duplicate-h',
      '행으로 복사',
      OutlinePanelService._COPY_ROW_ICON_SVG,
      () => this._duplicateFieldHorizontal(fieldId),
    );
    const vBtn = makeBtn(
      'data-outline-duplicate-v',
      '세로로 복사',
      OutlinePanelService._COPY_VERTICAL_ICON_SVG,
      () => this._duplicateFieldVertical(fieldId),
    );

    // 배치 순서: [가로 복사][세로 복사] → 기존 삭제 버튼 앞에 삽입
    // insertBefore(null) = appendChild이므로 firstChild로 순서 보장
    pad.insertBefore(vBtn, pad.firstChild);
    pad.insertBefore(hBtn, pad.firstChild);
  }

  /** 문서 전역 MutationObserver로 신규 context-pad를 감지해 복제 버튼 2개 주입 */
  private _startContextPadObserver() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

    const scan = (root: ParentNode) => {
      const pads = root.querySelectorAll?.('.fjs-context-pad') ?? [];
      pads.forEach((pad) => this._injectDuplicateButtons(pad as HTMLElement));
    };

    // 초기 스캔
    scan(document);

    this._contextPadObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList?.contains('fjs-context-pad')) {
            this._injectDuplicateButtons(node);
          } else {
            scan(node);
          }
        });
      }
    });

    this._contextPadObserver.observe(document.body, { childList: true, subtree: true });
  }

  private _refreshNodes() {
    this._nodes = schemaToOutline(this._formEditor.getSchema() as Parameters<typeof schemaToOutline>[0]);
  }

  private _onImportDone() {
    this._schemaVersion += 1;
    this._refreshNodes();
    this._render();
  }

  private _onChanged() {
    this._refreshNodes();
    this._render();
  }

  // payload: { selection: formFieldObject | null } — 단일 선택 모델
  private _onSelectionChanged(event: unknown) {
    // additive 클릭 직후 form-js가 동기로 발화한 selection.changed는
    // 멀티 선택 집합을 덮어쓰지 않도록 한 번 skip.
    if (this._skipNextSelectionOverwrite) {
      this._skipNextSelectionOverwrite = false;
      this._render();
      return;
    }

    const e = event as { selection?: { id?: string } | null } | undefined;
    const sel = e && 'selection' in e ? e.selection : null;
    this._selectedIds = sel?.id ? [sel.id] : [];
    this._render();
  }

  mount(container: HTMLElement) {
    this._container = container;
    this._render();
  }

  destroy() {
    this._eventBus.off('import.done', this._boundOnImportDone);
    this._eventBus.off('commandStack.changed', this._boundOnChanged);
    this._eventBus.off('selection.changed', this._boundOnSelectionChanged);

    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this._boundOnCanvasClickCapture, true);
    }

    if (this._contextPadObserver) {
      this._contextPadObserver.disconnect();
      this._contextPadObserver = null;
    }

    if (this._container) {
      render(null, this._container);
      this._container = null;
    }
  }
}

// generateId re-export는 outlineUtils에서 직접 쓰므로 여기서는 import만 함
void generateId; // suppress unused import warning

export const OutlineModule = {
  __init__: ['outlinePanel'],
  outlinePanel: ['type', OutlinePanelService as unknown as new (...args: unknown[]) => unknown],
};
